/**
 * HE Venue Explorer
 *
 * Looks up reservations and free time slots for Loyola Schools HE venues,
 * using the public Google Calendars listed on the CFMO Venue Reservation Portal.
 *
 * Requires the Google Calendar API advanced service (Calendar v3).
 * First-time setup: run buildWorkbook() in Setup.gs once.
 */

const HE_CONFIG = Object.freeze({
  reservation: Object.freeze({
    sheetName: 'Reservations',
    startDateCell: 'D4',
    endDateCell: 'D5',
    typeCell: 'D6',
    venueCell: 'D7',
    searchCell: 'D8',
    statusCell: 'B10',
    outputStartRow: 12,
    outputColumns: 5,
  }),
  availability: Object.freeze({
    sheetName: 'Availability',
    startDateCell: 'D4',
    endDateCell: 'D5',
    typeCell: 'D6',
    buildingCell: 'D7',
    searchCell: 'D8',
    minCapacityCell: 'F4',
    airConCell: 'F5',
    minFreeMinutesCell: 'F6',
    statusCell: 'B10',
    outputStartRow: 12,
    outputColumns: 7,
  }),
  settings: Object.freeze({
    sheetName: 'Settings',
    openingTimeCell: 'B2',
    closingTimeCell: 'B3',
    maximumSearchDaysCell: 'B4',
    minimumVenueCountCell: 'B5',
    lastRefreshCell: 'B6',
    autoRefreshCell: 'B7',
    requestFormUrlCell: 'B8',
    portalUrlCell: 'B9',
  }),
  registrySheetName: 'Venue Registry',
  buildingCodesSheetName: 'Building Codes',
  venueSpecsSheetName: 'Venue Specs',
  freeBusyBatchSize: 50,
  airConRequired: 'Required',
});


// --- MENU ---

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HE Venue Explorer')
    .addItem('Search reservations', 'reservationLookup')
    .addItem('Search availability', 'availabilityLookup')
    .addItem('New venue request…', 'openVenueRequest')
    .addItem('Open the web portal', 'openPortalLink')
    .addSeparator()
    .addItem('Refresh venue registry', 'scrapeCalendarData')
    .addItem('Turn daily auto-refresh on or off', 'toggleWeeklyRefresh')
    .addSeparator()
    .addItem('Turn on Search checkboxes for me', 'installSearchCheckboxes')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Access keys (owner)')
      .addItem('Set up access backend', 'setupAccessBackend')
      .addItem('Open access backend', 'openAccessBackend')
      .addItem('Generate access keys…', 'generateAccessKeys')
      .addItem('Send keys to approved requests', 'sendKeysToApprovedRequests')
      .addItem('Revoke a person\'s access…', 'revokeAccess')
      .addSeparator()
      .addItem('Email me sample emails', 'sendEmailPreviews'))
    .addToUi();
}


// --- TRIGGERS ---

/**
 * Simple trigger: keeps the Venue dropdown in sync with Type of Facility and
 * clears stale results when a filter changes. Runs for every editor.
 */
function onEdit(e) {
  if (!e || !e.range || typeof e.range.getSheet !== 'function') return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (sheetName === HE_CONFIG.reservation.sheetName) {
    const config = HE_CONFIG.reservation;
    if (rangeIntersectsA1_(e.range, config.typeCell)) updateVenueDropdown_(sheet, true);
    if ([config.startDateCell, config.endDateCell, config.typeCell, config.venueCell]
      .some(function (a1) { return rangeIntersectsA1_(e.range, a1); })) {
      clearResultBody_(sheet, config);
      setStatus_(sheet, config.statusCell, 'Filters changed · tick Search');
    }
  }

  if (sheetName === HE_CONFIG.availability.sheetName) {
    const config = HE_CONFIG.availability;
    if ([config.startDateCell, config.endDateCell, config.typeCell, config.buildingCell,
      config.minCapacityCell, config.airConCell, config.minFreeMinutesCell]
      .some(function (a1) { return rangeIntersectsA1_(e.range, a1); })) {
      clearResultBody_(sheet, config);
      setStatus_(sheet, config.statusCell, 'Filters changed · tick Search');
    }
  }
}


/**
 * Installable edit trigger: ticking a Search checkbox runs that lookup.
 * The Calendar API needs authorization, which simple triggers do not have.
 */
function onSearchCheckbox(e) {
  if (!e || !e.range || typeof e.range.getSheet !== 'function' || e.value !== 'TRUE') return;
  const sheetName = e.range.getSheet().getName();
  const lookups = [
    [HE_CONFIG.reservation, reservationLookup_],
    [HE_CONFIG.availability, availabilityLookup_],
  ];
  lookups.forEach(function (pair) {
    const config = pair[0];
    if (sheetName !== config.sheetName || !rangeIntersectsA1_(e.range, config.searchCell)) return;
    e.range.setValue(false);
    try {
      pair[1]();
    } catch (error) {
      // The lookup already wrote the error to its status cell.
      console.warn(error.message);
    }
  });
}


function installSearchCheckboxes() {
  assertSheetCaller_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exists = ScriptApp.getUserTriggers(ss).some(function (trigger) {
    return trigger.getHandlerFunction() === 'onSearchCheckbox';
  });
  if (!exists) {
    ScriptApp.newTrigger('onSearchCheckbox').forSpreadsheet(ss).onEdit().create();
  }
  ss.toast('Ticking a Search checkbox now runs the lookup.', 'HE Venue Explorer', 5);
}


function toggleWeeklyRefresh() {
  assertSheetCaller_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'scrapeCalendarData';
  });
  const settings = requireSheet_(ss, HE_CONFIG.settings.sheetName);

  if (existing.length) {
    existing.forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    settings.getRange(HE_CONFIG.settings.autoRefreshCell).setValue('Off');
    ss.toast('Daily auto-refresh is off.', 'HE Venue Explorer', 5);
  } else {
    ScriptApp.newTrigger('scrapeCalendarData').timeBased().everyDays(1).atHour(5).create();
    settings.getRange(HE_CONFIG.settings.autoRefreshCell).setValue('On, daily around 5 AM');
    ss.toast('The venue registry will refresh every day around 5 AM.', 'HE Venue Explorer', 5);
  }
}


// --- REGISTRY REFRESH ---

/**
 * Refresh the venue registry while preserving the last known-good registry
 * if the source pages or calendar metadata fail.
 */
function scrapeCalendarData() {
  assertSheetCaller_();
  return withDocumentLock_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const registry = requireSheet_(ss, HE_CONFIG.registrySheetName);
    const settings = readSettings_(ss);
    const venueData = [];
    const warnings = [];

    const primaryUrl = 'https://sites.google.com/ateneo.edu/lsreservations/he-venues';
    const primaryHtml = fetchText_(primaryUrl);

    // These selectors mirror the current Google Sites output. The registry is
    // staged and count-checked below so a markup change cannot wipe good data.
    const typeRegex = /<span class="jgG6ef C9DxTc "[^>]*>([^<]*)<\/span>/g;
    const calendarUrlRegex = /<a class="XqQF9c" href="([^"]+)"[^>]*>[^<]*<span[^>]*>([^<]*)<\/span><\/a>/g;
    const types = [];

    let typeMatch;
    while ((typeMatch = typeRegex.exec(primaryHtml)) !== null) {
      types.push({ type: decodeHtml_(typeMatch[1]).trim(), index: typeRegex.lastIndex });
    }

    let calendarMatch;
    while ((calendarMatch = calendarUrlRegex.exec(primaryHtml)) !== null) {
      const fullUrl = decodeHtml_(calendarMatch[1]);
      const idMatch = /[?&]src=([^&#]+)/i.exec(fullUrl);
      if (!idMatch) continue;

      let venueType = '';
      for (const typeInfo of types) {
        if (typeInfo.index < calendarUrlRegex.lastIndex) venueType = typeInfo.type;
      }

      venueData.push([
        venueType,
        decodeHtml_(calendarMatch[2]).trim(),
        decodeURIComponent(idMatch[1]),
      ]);
    }

    const osaUrl = 'https://sites.google.com/ateneo.edu/ateneolsosa/help-me/osa-venues-schedule/';
    try {
      const osaHtml = fetchText_(osaUrl);
      const iframeRegex = /<iframe[^>]*class="[^"]*\bYMEQtf\b[^"]*"[^>]*src="([^"]+)"[^>]*>[^<]*<\/iframe>/g;
      let iframeMatch;
      while ((iframeMatch = iframeRegex.exec(osaHtml)) !== null) {
        const fullUrl = decodeHtml_(iframeMatch[1]);
        const idMatch = /[?&]src=([^&#]+)/i.exec(fullUrl);
        if (!idMatch) continue;

        const calendarId = decodeURIComponent(idMatch[1]);
        try {
          const calendar = Calendar.Calendars.get(calendarId);
          const venueName = String(calendar.summary || '')
            .replace(/reservations?/i, '')
            .trim() || 'Unknown Venue';
          venueData.push(['OSA Managed Venues', venueName, calendarId]);
        } catch (error) {
          warnings.push(`OSA calendar unavailable: ${calendarId}`);
        }
      }
    } catch (error) {
      warnings.push(`OSA page unavailable: ${error.message}`);
    }

    venueData.push([
      'OSA Managed Venues',
      'MVP 321 - Student Center Conference Room',
      'c_2e64ddf0b37945bc5103798b62517254e820d0d12b4b896d8d8a5a9ac40bbb0b@group.calendar.google.com',
    ]);

    const cleanData = deduplicateVenueData_(venueData);
    if (cleanData.length < settings.minimumVenueCount) {
      throw new Error(
        `Venue refresh returned only ${cleanData.length} venues. ` +
        'The last known-good registry was preserved.'
      );
    }

    const oldLastRow = registry.getLastRow();
    if (oldLastRow > 1) registry.getRange(2, 1, oldLastRow - 1, 3).clearContent();
    ensureRows_(registry, cleanData.length + 1);
    registry.getRange(2, 1, cleanData.length, 3).setValues(cleanData);

    refreshInputValidations_();
    clearPortalCache_();
    const stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'd MMMM yyyy, h:mm a');
    requireSheet_(ss, HE_CONFIG.settings.sheetName)
      .getRange(HE_CONFIG.settings.lastRefreshCell).setValue(stamp);

    const message = warnings.length
      ? `Refreshed ${cleanData.length} venues with ${warnings.length} warning(s).`
      : `Refreshed ${cleanData.length} venues.`;
    ss.toast(message, 'HE Venue Explorer', 8);
    if (warnings.length) console.warn(warnings.join('\n'));
  });
}


// --- LOOKUPS ---

function reservationLookup() {
  assertSheetCaller_();
  return reservationLookup_();
}


function reservationLookup_() {
  return withDocumentLock_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = HE_CONFIG.reservation;
    const sheet = requireSheet_(ss, config.sheetName);

    clearResultBody_(sheet, config);
    setStatus_(sheet, config.statusCell, 'Searching reservations…');
    SpreadsheetApp.flush();

    try {
      const range = readAndValidateDateRange_(sheet, config.startDateCell, config.endDateCell, readSettings_(ss));
      const selectedType = normalizedText_(sheet.getRange(config.typeCell).getDisplayValue());
      const selectedVenue = normalizedText_(sheet.getRange(config.venueCell).getDisplayValue());
      if (!selectedType) throw new Error('Select a Type of Facility.');
      if (!selectedVenue) throw new Error('Select a Venue.');

      const matches = getVenueRows_(ss).filter(function (row) {
        return normalizedKey_(row.type) === normalizedKey_(selectedType) &&
          normalizedKey_(row.venueName) === normalizedKey_(selectedVenue);
      });
      if (matches.length !== 1) {
        throw new Error(
          matches.length === 0
            ? `${selectedVenue} is not listed under ${selectedType}. Pick the venue again.`
            : 'The selected venue has duplicate registry entries.'
        );
      }

      const output = cachedEvents_(matches[0].calendarId, range).map(eventToReservationRow_);

      if (output.length) {
        ensureRows_(sheet, config.outputStartRow + output.length - 1);
        sheet.getRange(config.outputStartRow, 2, output.length, 5).setValues(output);
        sheet.getRange(config.outputStartRow, 3, output.length, 1).setNumberFormat('ddd, mmm d, yyyy');
        sheet.getRange(config.outputStartRow, 4, output.length, 2).setNumberFormat('h:mm AM/PM');
      }

      const summary = output.length
        ? `${output.length} reservation${output.length === 1 ? '' : 's'} found`
        : 'No reservations found';
      setStatus_(sheet, config.statusCell, `${summary} · ${range.label} · ${selectedVenue}`);
    } catch (error) {
      setStatus_(sheet, config.statusCell, `Search failed · ${error.message}`);
      ss.toast(error.message, 'Reservation search failed', 8);
      throw error;
    }
  });
}


function availabilityLookup() {
  assertSheetCaller_();
  return availabilityLookup_();
}


function availabilityLookup_() {
  return withDocumentLock_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = HE_CONFIG.availability;
    const sheet = requireSheet_(ss, config.sheetName);

    clearResultBody_(sheet, config);
    setStatus_(sheet, config.statusCell, 'Searching availability…');
    SpreadsheetApp.flush();

    try {
      const settings = readSettings_(ss);
      const range = readAndValidateDateRange_(sheet, config.startDateCell, config.endDateCell, settings);
      const selectedType = normalizedText_(sheet.getRange(config.typeCell).getDisplayValue());
      const selectedBuilding = normalizedText_(sheet.getRange(config.buildingCell).getDisplayValue());
      const minCapacity = Number(sheet.getRange(config.minCapacityCell).getValue()) || 0;
      const airConRequired = normalizedKey_(sheet.getRange(config.airConCell).getDisplayValue()) ===
        normalizedKey_(HE_CONFIG.airConRequired);
      const minFreeMinutes = Number(sheet.getRange(config.minFreeMinutesCell).getValue()) || 0;
      if (!selectedType) throw new Error('Select a Type of Facility.');

      let venues = getVenueRows_(ss).filter(function (row) {
        return normalizedKey_(row.type) === normalizedKey_(selectedType);
      });

      // A blank Building means all venues under the selected type.
      if (selectedBuilding) {
        const building = getBuildingRows_(ss).find(function (row) {
          return normalizedKey_(row.building) === normalizedKey_(selectedBuilding);
        });
        if (!building) throw new Error('The selected building is not in Building Codes.');
        venues = venues.filter(function (venue) {
          return venueMatchesBuilding_(venue.venueName, building);
        });
      }

      // Capacity and air-con filters need specs; venues without specs are skipped.
      let skippedNoSpecs = 0;
      if (minCapacity > 0 || airConRequired) {
        const specs = getSpecsByVenue_(ss);
        venues = venues.filter(function (venue) {
          const spec = specs.get(normalizedKey_(venue.venueName));
          if (!spec) {
            skippedNoSpecs++;
            return false;
          }
          if (minCapacity > 0 && !(Number(spec.capacity) >= minCapacity)) return false;
          if (airConRequired && spec.airCon !== 'Yes') return false;
          return true;
        });
      }

      if (!venues.length) {
        let message = 'No venues match these filters';
        if (skippedNoSpecs) message += ` · ${skippedNoSpecs} skipped with no specs on file`;
        setStatus_(sheet, config.statusCell, message);
        return;
      }

      const slots = [];
      const failures = [];
      const busyByCalendar = freeBusyForVenues_(venues, range);
      venues.forEach(function (venue) {
        const busy = busyByCalendar[venue.calendarId];
        if (!busy) {
          failures.push(venue.venueName);
          return;
        }
        calculateAvailableSlots_(range.start, range.endExclusive, busy, settings)
          .filter(function (slot) { return (slot.end - slot.start) / 60000 >= minFreeMinutes; })
          .forEach(function (slot) { slots.push({ venueName: venue.venueName, start: slot.start, end: slot.end }); });
      });

      // Earliest slots first, so the list reads like a timetable.
      slots.sort(function (a, b) {
        return a.start - b.start || b.end - a.end || a.venueName.localeCompare(b.venueName);
      });

      if (slots.length) {
        const firstRow = config.outputStartRow;
        ensureRows_(sheet, firstRow + slots.length - 1);
        sheet.getRange(firstRow, 2, slots.length, 4).setValues(slots.map(function (slot) {
          return [safeSheetText_(slot.venueName), dateAtMidnight_(slot.start), slot.start, slot.end];
        }));
        sheet.getRange(firstRow, 6, slots.length, 3).setFormulas(slots.map(function (slot, index) {
          const row = firstRow + index;
          return [
            `=E${row}-D${row}`,
            `=XLOOKUP($B${row},'Venue Specs'!$E$2:$E,'Venue Specs'!$I$2:$I,"Not listed")`,
            `=XLOOKUP($B${row},'Venue Specs'!$E$2:$E,'Venue Specs'!$H$2:$H,"Not listed")`,
          ];
        }));
        sheet.getRange(firstRow, 3, slots.length, 1).setNumberFormat('ddd, mmm d, yyyy');
        sheet.getRange(firstRow, 4, slots.length, 2).setNumberFormat('h:mm AM/PM');
        sheet.getRange(firstRow, 6, slots.length, 1).setNumberFormat('[h]"h "mm"m"');
      }

      let summary = slots.length
        ? `${slots.length} free slot${slots.length === 1 ? '' : 's'} in ${venues.length} venue${venues.length === 1 ? '' : 's'}`
        : 'No free slots found';
      if (failures.length) summary += ` · ${failures.length} not checked`;
      if (skippedNoSpecs) summary += ` · ${skippedNoSpecs} skipped with no specs`;
      summary += ` · ${range.label}`;
      setStatus_(sheet, config.statusCell, summary);

      if (failures.length) {
        console.warn(`Calendars not checked:\n${failures.join('\n')}`);
        ss.toast(
          `${failures.length} calendar(s) could not be checked. Other results are shown.`,
          'Partial availability results',
          8
        );
      }
    } catch (error) {
      setStatus_(sheet, config.statusCell, `Search failed · ${error.message}`);
      ss.toast(error.message, 'Availability search failed', 8);
      throw error;
    }
  });
}


function updateVenueDropdown(sheet, clearSelection) {
  assertSheetCaller_();
  return updateVenueDropdown_(sheet, clearSelection);
}


function updateVenueDropdown_(sheet, clearSelection) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = sheet || requireSheet_(ss, HE_CONFIG.reservation.sheetName);
  const config = HE_CONFIG.reservation;
  const type = targetSheet.getRange(config.typeCell).getDisplayValue();
  const venues = uniqueSorted_(
    getVenueRows_(ss)
      .filter(function (row) { return normalizedKey_(row.type) === normalizedKey_(type); })
      .map(function (row) { return row.venueName; })
  );

  const cell = targetSheet.getRange(config.venueCell);
  cell.clearDataValidations();
  if (clearSelection) cell.clearContent();

  if (venues.length) {
    cell.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(venues, true)
        .setAllowInvalid(false)
        .build()
    );
  }
}


function refreshInputValidations_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const types = uniqueSorted_(getVenueRows_(ss).map(function (row) { return row.type; }));
  const typeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(types, true)
    .setAllowInvalid(false)
    .build();
  requireSheet_(ss, HE_CONFIG.reservation.sheetName)
    .getRange(HE_CONFIG.reservation.typeCell)
    .setDataValidation(typeValidation);
  requireSheet_(ss, HE_CONFIG.availability.sheetName)
    .getRange(HE_CONFIG.availability.typeCell)
    .setDataValidation(typeValidation);
}


// --- CALENDAR HELPERS ---

function listAllEvents_(calendarId, range) {
  const events = [];
  let pageToken;
  do {
    const params = {
      timeMin: range.timeMin,
      timeMax: range.timeMax,
      timeZone: range.timeZone,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    };
    if (pageToken) params.pageToken = pageToken;

    const response = Calendar.Events.list(calendarId, params);
    if (response.items) events.push.apply(events, response.items);
    pageToken = response.nextPageToken;
  } while (pageToken);
  return events;
}


function eventToReservationRow_(event) {
  const summary = safeSheetText_(normalizedText_(event.summary) || '(Untitled event)');
  const description = safeSheetText_(htmlToText_(event.description) || 'No description available');

  if (event.start && event.start.date) {
    const start = parseDateOnly_(event.start.date);
    const inclusiveEnd = addDays_(parseDateOnly_(event.end.date), -1);
    const dateValue = sameLocalDate_(start, inclusiveEnd)
      ? start
      : `${formatDateForDisplay_(start)} – ${formatDateForDisplay_(inclusiveEnd)}`;
    return [summary, dateValue, 'All day', '', description];
  }

  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  const dateValue = sameLocalDate_(start, end)
    ? dateAtMidnight_(start)
    : `${formatDateForDisplay_(start)} – ${formatDateForDisplay_(end)}`;
  return [summary, dateValue, start, end, description];
}


/**
 * Merge all busy intervals, clamp them to each operating day, then subtract
 * them from the opening-to-closing window. Overlapping or nested events cannot
 * move the busy cursor backward.
 */
function calculateAvailableSlots_(rangeStart, rangeEndExclusive, busyPeriods, hours) {
  const mergedBusy = mergeIntervals_(busyPeriods, rangeStart, rangeEndExclusive);
  const slots = [];

  for (let day = dateAtMidnight_(rangeStart); day < rangeEndExclusive; day = addDays_(day, 1)) {
    const opening = new Date(day);
    opening.setHours(hours.openingHour, hours.openingMinute, 0, 0);
    const closing = new Date(day);
    closing.setHours(hours.closingHour, hours.closingMinute, 0, 0);

    let cursor = opening;
    for (const period of mergedBusy) {
      if (period.end <= opening) continue;
      if (period.start >= closing) break;

      const busyStart = period.start < opening ? opening : period.start;
      const busyEnd = period.end > closing ? closing : period.end;
      if (busyStart > cursor) slots.push({ start: new Date(cursor), end: new Date(busyStart) });
      if (busyEnd > cursor) cursor = busyEnd;
      if (cursor >= closing) break;
    }
    if (cursor < closing) slots.push({ start: new Date(cursor), end: new Date(closing) });
  }

  return slots.filter(function (slot) { return slot.end > slot.start; });
}


function mergeIntervals_(periods, rangeStart, rangeEndExclusive) {
  const normalized = (periods || [])
    .map(function (period) {
      const start = period.start < rangeStart ? new Date(rangeStart) : new Date(period.start);
      const end = period.end > rangeEndExclusive ? new Date(rangeEndExclusive) : new Date(period.end);
      return { start: start, end: end };
    })
    .filter(function (period) { return period.end > period.start; })
    .sort(function (a, b) { return a.start - b.start || a.end - b.end; });

  const merged = [];
  normalized.forEach(function (period) {
    const previous = merged[merged.length - 1];
    if (!previous || period.start > previous.end) {
      merged.push({ start: new Date(period.start), end: new Date(period.end) });
    } else if (period.end > previous.end) {
      previous.end = new Date(period.end);
    }
  });
  return merged;
}


function readAndValidateDateRange_(sheet, startCell, endCell, settings) {
  const startValue = sheet.getRange(startCell).getValue();
  const endValue = sheet.getRange(endCell).getValue();
  if (!(startValue instanceof Date) || isNaN(startValue)) throw new Error('Enter a valid Start Date.');
  if (!(endValue instanceof Date) || isNaN(endValue)) throw new Error('Enter a valid End Date.');

  const start = dateAtMidnight_(startValue);
  const endDate = dateAtMidnight_(endValue);
  if (endDate < start) throw new Error('End Date must be on or after Start Date.');

  const days = Math.round((endDate - start) / 86400000) + 1;
  if (days > settings.maximumSearchDays) {
    throw new Error(`Limit the search to ${settings.maximumSearchDays} days or fewer (see Settings).`);
  }

  const endExclusive = addDays_(endDate, 1);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetTimeZone = ss.getSpreadsheetTimeZone();
  const timeZone = Session.getScriptTimeZone();
  const offsetsMatch =
    utcOffset_(start, spreadsheetTimeZone) === utcOffset_(start, timeZone) &&
    utcOffset_(endExclusive, spreadsheetTimeZone) === utcOffset_(endExclusive, timeZone);
  if (!offsetsMatch) {
    throw new Error(
      `The spreadsheet time zone (${spreadsheetTimeZone}) and Apps Script time zone ` +
      `(${timeZone}) resolve to different UTC offsets for this date range.`
    );
  }

  return {
    start: start,
    endExclusive: endExclusive,
    timeZone: timeZone,
    timeMin: toRfc3339_(start, timeZone),
    timeMax: toRfc3339_(endExclusive, timeZone),
    label: sameLocalDate_(start, endDate)
      ? formatDateForDisplay_(start)
      : `${formatDateForDisplay_(start)}–${formatDateForDisplay_(endDate)}`,
  };
}


// --- SHEET READERS ---

function readSettings_(ss) {
  const config = HE_CONFIG.settings;
  const sheet = requireSheet_(ss, config.sheetName);
  // Parse the displayed time: Date values near Sheets' 1899 epoch can be
  // shifted by historical time-zone offsets when read in Apps Script.
  const opening = parseTimeText_(sheet.getRange(config.openingTimeCell).getDisplayValue());
  const closing = parseTimeText_(sheet.getRange(config.closingTimeCell).getDisplayValue());
  if (!opening || !closing) {
    throw new Error('Opening and closing times in Settings must be times, such as 6:00 AM.');
  }
  if (closing.hour * 60 + closing.minute <= opening.hour * 60 + opening.minute) {
    throw new Error('Closing time in Settings must be later than opening time.');
  }
  return {
    openingHour: opening.hour,
    openingMinute: opening.minute,
    closingHour: closing.hour,
    closingMinute: closing.minute,
    maximumSearchDays: Number(sheet.getRange(config.maximumSearchDaysCell).getValue()) || 31,
    minimumVenueCount: Number(sheet.getRange(config.minimumVenueCountCell).getValue()) || 100,
  };
}


function parseTimeText_(text) {
  const match = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?\s*$/i.exec(String(text));
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour: hour, minute: minute };
}


function getVenueRows_(ss) {
  const sheet = requireSheet_(ss, HE_CONFIG.registrySheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues()
    .filter(function (row) { return row[0] && row[1] && row[2]; })
    .map(function (row) {
      return { type: row[0].trim(), venueName: row[1].trim(), calendarId: row[2].trim() };
    });
}


function getBuildingRows_(ss) {
  const sheet = requireSheet_(ss, HE_CONFIG.buildingCodesSheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues()
    .filter(function (row) { return row[1]; })
    .map(function (row) { return { codes: row[0], building: row[1].trim() }; });
}


/** Venue Specs keyed by Calendar Name (column E). */
function getSpecsByVenue_(ss) {
  const sheet = requireSheet_(ss, HE_CONFIG.venueSpecsSheetName);
  const lastRow = sheet.getLastRow();
  const specs = new Map();
  if (lastRow < 2) return specs;
  sheet.getRange(2, 5, lastRow - 1, 5).getValues().forEach(function (row) {
    const name = normalizedKey_(row[0]);
    if (name) specs.set(name, { airCon: normalizedText_(row[3]), capacity: row[4] });
  });
  return specs;
}


function venueMatchesBuilding_(venueName, building) {
  const venue = normalizedKey_(venueName);
  const codes = String(building.codes || '')
    .split('/')
    .map(normalizedKey_)
    .filter(Boolean);
  const buildingFirstWord = normalizedKey_(building.building).split(' ')[0];
  return codes.some(function (code) { return venue.startsWith(`${code} `); }) ||
    (buildingFirstWord && venue.includes(buildingFirstWord));
}


// --- SMALL HELPERS ---

function clearResultBody_(sheet, config) {
  const lastRow = Math.max(sheet.getLastRow(), config.outputStartRow);
  sheet.getRange(config.outputStartRow, 2, lastRow - config.outputStartRow + 1, config.outputColumns)
    .clearContent();
}


function setStatus_(sheet, cellA1, message) {
  sheet.getRange(cellA1).setValue(message);
}


function withDocumentLock_(callback) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) {
    throw new Error('Another search or refresh is running. Try again in a moment.');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}


function requireSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Required sheet not found: ${name}`);
  return sheet;
}


function rangeIntersectsA1_(editedRange, cellA1) {
  const target = editedRange.getSheet().getRange(cellA1);
  return editedRange.getRow() <= target.getRow() &&
    editedRange.getLastRow() >= target.getRow() &&
    editedRange.getColumn() <= target.getColumn() &&
    editedRange.getLastColumn() >= target.getColumn();
}


function fetchText_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error(`Source returned HTTP ${status}: ${url}`);
  return response.getContentText();
}


function deduplicateVenueData_(rows) {
  const byCalendarId = new Map();
  rows.forEach(function (row) {
    const type = normalizedText_(row[0]);
    const venueName = normalizedText_(row[1]);
    const calendarId = normalizedText_(row[2]);
    if (!type || !venueName || !calendarId) return;
    byCalendarId.set(normalizedKey_(calendarId), [type, venueName, calendarId]);
  });
  return Array.from(byCalendarId.values()).sort(function (a, b) {
    return a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
  });
}


function ensureRows_(sheet, requiredLastRow) {
  const missing = requiredLastRow - sheet.getMaxRows();
  if (missing > 0) sheet.insertRowsAfter(sheet.getMaxRows(), missing);
}


function safeSheetText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}


function normalizedText_(value) {
  return String(value == null ? '' : value).trim();
}


function normalizedKey_(value) {
  return normalizedText_(value).toLowerCase().replace(/\s+/g, ' ');
}


function uniqueSorted_(values) {
  const byKey = new Map();
  values.forEach(function (value) {
    const clean = normalizedText_(value);
    if (clean) byKey.set(normalizedKey_(clean), clean);
  });
  return Array.from(byKey.values()).sort(function (a, b) { return a.localeCompare(b); });
}


function decodeHtml_(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}


/** Calendar descriptions may hold HTML; keep line breaks, drop tags. */
function htmlToText_(value) {
  return decodeHtml_(String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' '))
    .replace(/\n{2,}/g, '\n')
    .trim();
}


function parseDateOnly_(dateText) {
  const parts = String(dateText).split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}


function dateAtMidnight_(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}


function addDays_(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}


function sameLocalDate_(left, right) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}


function formatDateForDisplay_(date) {
  return Utilities.formatDate(
    date,
    SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
    'M/d/yyyy'
  );
}


function toRfc3339_(date, timeZone) {
  return Utilities.formatDate(date, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}


function utcOffset_(date, timeZone) {
  return Utilities.formatDate(date, timeZone, 'Z');
}


/**
 * Self-test that does not call Calendar or modify any sheet.
 * Run from the Apps Script editor after changing the slot logic.
 */
function runLogicSelfTests() {
  assertSheetCaller_();
  const hours = { openingHour: 6, openingMinute: 0, closingHour: 22, closingMinute: 0 };
  const day = new Date(2026, 5, 18, 0, 0, 0, 0);
  const endExclusive = addDays_(day, 1);

  // Nested event must not move the busy cursor backward.
  const overlapping = calculateAvailableSlots_(day, endExclusive, [
    { start: new Date(2026, 5, 18, 9, 0), end: new Date(2026, 5, 18, 12, 0) },
    { start: new Date(2026, 5, 18, 10, 0), end: new Date(2026, 5, 18, 11, 0) },
  ], hours);
  assertSlot_(overlapping[0], 6, 9, 'overlapping first slot');
  assertSlot_(overlapping[1], 12, 22, 'overlapping second slot');
  if (overlapping.length !== 2) throw new Error('Overlapping interval test returned extra slots.');

  // A full all-day busy interval must leave no operating-hours availability.
  const allDay = calculateAvailableSlots_(day, endExclusive, [{ start: day, end: endExclusive }], hours);
  if (allDay.length !== 0) throw new Error('All-day interval test should return no slots.');

  // Busy time outside operating hours must not reduce the opening-to-closing slot.
  const overnight = calculateAvailableSlots_(day, endExclusive, [
    { start: new Date(2026, 5, 18, 0, 0), end: new Date(2026, 5, 18, 5, 0) },
  ], hours);
  assertSlot_(overnight[0], 6, 22, 'overnight exclusion');

  // Venue codes must match on a word boundary: "SEC A 117" is in SEC A, not SEC B.
  if (!venueMatchesBuilding_('SEC A 117', { codes: 'SEC A', building: 'Science Education Complex A' })) {
    throw new Error('Building match failed for SEC A 117.');
  }
  if (venueMatchesBuilding_('SEC A 117', { codes: 'SEC B', building: 'Science Education Complex B' })) {
    throw new Error('SEC A 117 should not match SEC B.');
  }

  console.log('Logic self-tests passed.');
  return 'passed';
}


function assertSlot_(slot, expectedStartHour, expectedEndHour, label) {
  if (!slot || slot.start.getHours() !== expectedStartHour || slot.end.getHours() !== expectedEndHour) {
    throw new Error(`${label} failed.`);
  }
}



// --- VENUE REQUEST ---

const REQUEST_FORM = Object.freeze({
  defaultUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdRyfdQRqm67FJ_HbavJrWq94mc1IC_GRaEXTSu6jh78oXprw/viewform',
  // Entry IDs read from the live HE Facilities & Equipment Request Form (TYPE 1)
  // on 5 Oct 2026. If CFMO edits a question, its ID can change: open the form,
  // make a new prefilled link and copy the new number here.
  entries: Object.freeze({
    organization: '130493448',     // 1. Sponsoring Office/ Department/ Organization Class
    contactPerson: '1610827463',   // 2. Point Person (Last Name, First Name)
    localNo: '383822763',          // 3. Local No. (optional)
    contactNumber: '1334258070',   // 4. Mobile No.
    email: '196772329',            // 5. Email Address
    eventTitle: '391213543',       // 6. Title of Event/ Activity
    nature: '196884816',           // 7. Nature of Event (one choice, or Other)
    conditions: '808468343',       // 8.a. Please check all that apply
    activityDetails: '636647782',  // 8.b. Group dynamics description, or N/A
    date: '295141374',             // 9. Date of Event
    startTime: '1390280883',       // 10. Start Time of Event
    endTime: '1938977695',         // 11. End Time of Event
    venue: '517119671',            // 12. Facility Requested
    participants: '1786929653',    // 13. Number of Participants
    equipment: '1562589278',       // 14. AV Equipment Needs (checkboxes, or Other)
    approvedBy: '1448091720',      // 15. Activity Approved by (checkboxes, or Other)
    approverName: '1916259526',    // 16. Name of Approver
    proofLink: '2062575488',       // 17. Proof of Approval (Drive link)
    // The Conforme question is left for the person to answer themselves.
  }),
  // Saved in requester profiles: who is asking, and who approves for them.
  requesterFields: ['organization', 'contactPerson', 'localNo', 'contactNumber', 'email', 'approvedBy', 'approverName'],
  requiredRequesterFields: ['organization', 'contactPerson', 'contactNumber', 'email', 'approvedBy', 'approverName'],
  requiredEventFields: ['eventTitle', 'nature', 'conditions', 'activityDetails', 'date', 'startTime', 'endTime',
    'venue', 'participants', 'equipment', 'proofLink'],
  listFields: ['conditions', 'equipment', 'approvedBy'],
  choices: Object.freeze({
    nature: ['Class/ Exam', 'Film Viewing', 'Meeting/ GA', 'Talk/ Symposium', 'Seminar/ Workshop'],
    conditions: [
      'Food will be served. Please coordinate with FSQA (fsqa@ateneo.edu).',
      'External Guests. Please coordinate with CSMO (csmo@ateneo.edu).',
      'Group dynamics/ Interactive Activities (please put a brief description below).',
      'none apply',
    ],
    equipment: ['LCD Projector', 'LCD Screen'],
    approvedBy: ['Dean', 'Department Chair', 'Faculty', 'OSA Professional'],
  }),
  // Questions with an "Other" box. Anything not in choices goes there.
  otherAllowed: ['nature', 'equipment', 'approvedBy'],
  noneCondition: 'none apply',
  noEquipment: 'None',
  requesterDefaults: Object.freeze({ approvedBy: ['OSA Professional'] }),
  eventDefaults: Object.freeze({ nature: 'Meeting/ GA', conditions: ['none apply'], activityDetails: 'N/A', equipment: [] }),
  // From the form's description: responses are taken Mon to Fri 9-11 AM and
  // 2-4 PM, and Sat 9-11 AM (first 60 a day), 3 working days before the event.
  intake: Object.freeze({
    weekday: [[540, 660], [840, 960]],
    saturday: [[540, 660]],
    leadWorkingDays: 3,
    dailyCap: 60,
  }),
  // Saved per Google account, so each person's profiles stay private.
  profilesPropertyKey: 'HE_VENUE_PROFILES',
  legacyRequesterPropertyKey: 'HE_VENUE_REQUESTER',
  maximumProfiles: 20,
});


/** The part of REQUEST_FORM the browser needs (no entry IDs or form address). */
function requestFormSchema_(includeEntries) {
  const schema = {
    requesterFields: REQUEST_FORM.requesterFields,
    requiredRequesterFields: REQUEST_FORM.requiredRequesterFields,
    requiredEventFields: REQUEST_FORM.requiredEventFields,
    listFields: REQUEST_FORM.listFields,
    choices: REQUEST_FORM.choices,
    otherAllowed: REQUEST_FORM.otherAllowed,
    noneCondition: REQUEST_FORM.noneCondition,
    noEquipment: REQUEST_FORM.noEquipment,
    requesterDefaults: REQUEST_FORM.requesterDefaults,
    eventDefaults: REQUEST_FORM.eventDefaults,
    intake: REQUEST_FORM.intake,
    rules: REQUEST_RULES,
  };
  if (includeEntries) schema.entries = REQUEST_FORM.entries;
  return schema;
}


/** Cleans request answers from the browser: text fields as strings, list fields as arrays. */
function readRequestValues_(request) {
  const values = {};
  const text = ['organization', 'contactPerson', 'localNo', 'contactNumber', 'email', 'eventTitle', 'nature',
    'activityDetails', 'date', 'startTime', 'endTime', 'venue', 'participants', 'approverName', 'proofLink'];
  text.forEach(function (f) {
    values[f] = String((request && request[f]) == null ? '' : request[f]).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim()
      .slice(0, f === 'activityDetails' ? 1000 : 300);
  });
  REQUEST_FORM.listFields.forEach(function (f) {
    const list = Array.isArray(request && request[f]) ? request[f] : [];
    values[f] = list.map(function (item) { return normalizedText_(item).slice(0, 200); }).filter(Boolean).slice(0, 10);
  });
  return values;
}


/** Builds the prefilled request form address. Values must already be checked. */
function buildRequestUrl_(values) {
  const entries = REQUEST_FORM.entries;
  const choices = REQUEST_FORM.choices;
  const params = [];
  const add = function (field, value) {
    if (value) params.push('entry.' + entries[field] + '=' + encodeURIComponent(value));
  };
  const addOther = function (field, value) {
    params.push('entry.' + entries[field] + '=__other_option__',
      'entry.' + entries[field] + '.other_option_response=' + encodeURIComponent(value));
  };
  ['organization', 'contactPerson', 'localNo', 'contactNumber', 'email', 'eventTitle', 'activityDetails',
    'venue', 'participants', 'approverName', 'proofLink'].forEach(function (f) { add(f, values[f]); });
  if (values.nature) {
    if (choices.nature.indexOf(values.nature) !== -1) add('nature', values.nature);
    else addOther('nature', values.nature);
  }
  REQUEST_FORM.listFields.forEach(function (f) {
    const items = values[f] || [];
    items.filter(function (x) { return choices[f].indexOf(x) !== -1; }).forEach(function (x) { add(f, x); });
    const other = items.filter(function (x) { return choices[f].indexOf(x) === -1; });
    if (other.length && REQUEST_FORM.otherAllowed.indexOf(f) !== -1) addOther(f, other.join(', '));
  });
  const start = parseTimeText_(values.startTime), end = parseTimeText_(values.endTime);
  if (start) add('startTime', clockText_(start.hour, start.minute));
  if (end) add('endTime', clockText_(end.hour, end.minute));
  if (/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    const d = values.date.split('-').map(Number);
    params.push('entry.' + entries.date + '_year=' + d[0], 'entry.' + entries.date + '_month=' + d[1],
      'entry.' + entries.date + '_day=' + d[2]);
  }
  return getRequestFormUrl_() + '?usp=pp_url&' + params.join('&');
}



function openVenueRequest() {
  assertSheetCaller_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readSettings_(ss);
  const slot = selectedAvailabilitySlot_(ss);
  const data = {
    profiles: loadProfiles_(),
    // Keys the browser fallback to this person, so a shared computer never
    // shows someone else's details. Blank turns the fallback off.
    userKey: Session.getActiveUser().getEmail().toLowerCase(),
    event: Object.assign({}, REQUEST_FORM.eventDefaults, slot),
    venues: uniqueSorted_(getVenueRows_(ss).map(function (row) { return row.venueName; })),
    formUrl: getRequestFormUrl_(),
    form: requestFormSchema_(true),
    formStatus: formIntakeStatus_(),
    today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    hours: {
      openingMinute: settings.openingHour * 60 + settings.openingMinute,
      closingMinute: settings.closingHour * 60 + settings.closingMinute,
    },
    // Loaded now, while the script can reach the calendar, so the dialog can
    // check times on its own. Dialog-to-script calls can fail when the user
    // is signed in to several Google accounts.
    venueDay: slot.venue ? getVenueDay_(slot.venue, slot.date) : null,
  };
  const template = HtmlService.createTemplateFromFile('RequestDialog');
  // Escape "<" so venue names can never close the script tag.
  template.initialJson = JSON.stringify(data).replace(/</g, '\\u003c');
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().setWidth(680).setHeight(720),
    'New venue request'
  );
}


/**
 * One venue's bookings for one day, as minutes after midnight, so the dialog
 * can test any start and end time without calling the script again.
 * Also called from the dialog when the venue or date changes.
 */
function getVenueDay(venueName, dateText) {
  assertSheetCaller_();
  return getVenueDay_(venueName, dateText);
}


function getVenueDay_(venueName, dateText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = normalizedText_(venueName);
  const venue = getVenueRows_(ss).find(function (row) {
    return normalizedKey_(row.venueName) === normalizedKey_(name);
  });
  const dayStart = parseDialogDateTime_(dateText, '00:00');
  if (!venue || !dayStart) return { venue: name, date: dateText, known: false };

  const dayEnd = addDays_(dayStart, 1);
  const timeZone = Session.getScriptTimeZone();
  const events = cachedEvents_(venue.calendarId, {
    timeMin: toRfc3339_(dayStart, timeZone),
    timeMax: toRfc3339_(dayEnd, timeZone),
    timeZone: timeZone,
  });
  const day = splitEventsByDay_(events, dayStart, dayEnd)[0];
  return { venue: venue.venueName, date: dateText, known: true, bookings: day ? day.items : [] };
}


/**
 * Turns calendar events into one list per day. Each piece is clipped to its
 * day (minutes 0 to 1440), so an event that runs past midnight or across
 * several days shows on every day it touches, never with an end before its
 * start. Free (transparent) events, cancelled ones, zero-length ones and exact
 * duplicates are dropped.
 */
function splitEventsByDay_(events, rangeStart, rangeEndExclusive) {
  const seen = {};
  const spans = [];
  (events || []).forEach(function (event) {
    if (!event || !event.start || !event.end) return;
    if (event.transparency === 'transparent' || event.status === 'cancelled') return;
    const allDay = Boolean(event.start.date);
    const start = allDay ? parseDateOnly_(event.start.date) : new Date(event.start.dateTime);
    const end = allDay ? parseDateOnly_(event.end.date) : new Date(event.end.dateTime);
    if (isNaN(start) || isNaN(end) || end <= start) return;
    const title = normalizedText_(event.summary) || '(Untitled event)';
    const id = [normalizedKey_(title), start.getTime(), end.getTime()].join('|');
    if (seen[id]) return;
    seen[id] = true;
    spans.push({
      title: title,
      description: htmlToText_(event.description || ''),
      start: start,
      end: end,
      allDay: allDay,
    });
  });
  spans.sort(function (a, b) { return a.start - b.start || b.end - a.end; });

  const days = [];
  for (let day = dateAtMidnight_(rangeStart); day < rangeEndExclusive; day = addDays_(day, 1)) {
    const next = addDays_(day, 1);
    const items = [];
    spans.forEach(function (span) {
      if (span.end <= day || span.start >= next) return;
      const from = span.start > day ? span.start : day;
      const to = span.end < next ? span.end : next;
      const startMinute = Math.round((from - day) / 60000);
      const endMinute = Math.round((to - day) / 60000);
      items.push({
        title: span.title,
        description: span.description,
        start: startMinute,
        end: endMinute,
        // All day when the calendar says so, or when a long event covers this whole day.
        allDay: span.allDay || (startMinute === 0 && endMinute >= 1440),
        startsEarlier: span.start < day,
        endsLater: span.end > next,
      });
    });
    days.push({ date: Utilities.formatDate(day, Session.getScriptTimeZone(), 'yyyy-MM-dd'), items: items });
  }
  return days;
}


/**
 * Saves this person's requester profiles. Called from the sheet dialog and
 * the portal. Shape: { lastUsedId, profiles: [{ id, name, updatedAt, fields }] }.
 */
function saveProfiles(store) {
  assertSheetCaller_();
  return saveProfiles_(store);
}


function saveProfiles_(store) {
  const key = profileStoreKey_();
  if (!key) throw new Error('Sign in with your Ateneo account to save profiles.');
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(cleanProfiles_(store)));
  return true;
}


function loadProfiles_() {
  const empty = { lastUsedId: '', profiles: [], deleted: [] };
  const key = profileStoreKey_();
  if (!key) return empty;
  const saved = PropertiesService.getScriptProperties().getProperty(key);
  if (saved) {
    try {
      return cleanProfiles_(JSON.parse(saved));
    } catch (error) {
      console.warn('Saved profiles could not be read: ' + error.message);
    }
  }
  return migrateUserProfiles_() || empty;
}


/**
 * Profiles are stored by a hash of the person's email, so they follow the
 * person between the sheet and the portal. Blank when the email is hidden.
 */
function profileStoreKey_() {
  const email = normalizedText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
  return 'profiles:' + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
}


/**
 * Earlier versions saved profiles in the person's own user properties. Only
 * read them when the script runs as that same person: in the web portal it
 * runs as the owner, whose user properties belong to someone else.
 */
function migrateUserProfiles_() {
  const active = normalizedText_(Session.getActiveUser().getEmail()).toLowerCase();
  const effective = normalizedText_(Session.getEffectiveUser().getEmail()).toLowerCase();
  if (!active || active !== effective) return null;

  const properties = PropertiesService.getUserProperties();
  let store = null;
  const saved = properties.getProperty(REQUEST_FORM.profilesPropertyKey);
  const legacy = properties.getProperty(REQUEST_FORM.legacyRequesterPropertyKey);
  try {
    if (saved) {
      store = cleanProfiles_(JSON.parse(saved));
    } else if (legacy) {
      const fields = JSON.parse(legacy);
      if (fields && fields.organization) {
        const profile = { id: 'p' + Date.now(), name: profileName_(fields), updatedAt: Date.now(), fields: fields };
        store = cleanProfiles_({ lastUsedId: profile.id, profiles: [profile] });
      }
    }
  } catch (error) {
    console.warn('Old profiles could not be read: ' + error.message);
  }
  if (store && store.profiles.length) {
    saveProfiles_(store);
    properties.deleteProperty(REQUEST_FORM.profilesPropertyKey);
    properties.deleteProperty(REQUEST_FORM.legacyRequesterPropertyKey);
    return store;
  }
  return null;
}


/** Keeps only known fields, so the dialog can't store anything unexpected. */
function cleanProfiles_(store) {
  const profiles = ((store && store.profiles) || [])
    .filter(function (profile) { return profile && profile.id; })
    .slice(0, REQUEST_FORM.maximumProfiles)
    .map(function (profile) {
      const fields = {};
      REQUEST_FORM.requesterFields.forEach(function (field) {
        const value = profile.fields && profile.fields[field];
        fields[field] = REQUEST_FORM.listFields.indexOf(field) !== -1
          ? (Array.isArray(value) ? value : []).map(function (x) { return normalizedText_(x).slice(0, 200); }).filter(Boolean).slice(0, 10)
          : normalizedText_(value).slice(0, 200);
      });
      return {
        id: String(profile.id).slice(0, 40),
        name: normalizedText_(profile.name).slice(0, 80) || profileName_(fields),
        updatedAt: Number(profile.updatedAt) || 0,
        fields: fields,
      };
    });
  const lastUsedId = String((store && store.lastUsedId) || '');
  // Deleted IDs are kept so a stale copy in another browser can't bring a profile back.
  const deleted = ((store && store.deleted) || []).map(String).slice(-50);
  return {
    lastUsedId: profiles.some(function (p) { return p.id === lastUsedId; }) ? lastUsedId : '',
    profiles: profiles,
    deleted: deleted,
  };
}


function profileName_(fields) {
  const person = normalizedText_(fields.contactPerson).split(',')[0];
  return [normalizedText_(fields.organization), person].filter(Boolean).join(' – ') || 'Untitled profile';
}


/** Venue, date and times from the Availability result row the cursor is on. */
function selectedAvailabilitySlot_(ss) {
  const sheet = ss.getActiveSheet();
  const config = HE_CONFIG.availability;
  if (sheet.getName() !== config.sheetName) return {};
  const row = sheet.getActiveRange().getRow();
  if (row < config.outputStartRow) return {};
  const slot = sheet.getRange(row, 2, 1, 4).getValues()[0];
  if (!slot[0] || !(slot[1] instanceof Date) || !(slot[2] instanceof Date) || !(slot[3] instanceof Date)) return {};
  const timeZone = ss.getSpreadsheetTimeZone();
  return {
    venue: String(slot[0]),
    date: Utilities.formatDate(slot[1], timeZone, 'yyyy-MM-dd'),
    startTime: Utilities.formatDate(slot[2], timeZone, 'HH:mm'),
    endTime: Utilities.formatDate(slot[3], timeZone, 'HH:mm'),
  };
}


function getRequestFormUrl_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HE_CONFIG.settings.sheetName);
  const value = sheet ? normalizedText_(sheet.getRange(HE_CONFIG.settings.requestFormUrlCell).getDisplayValue()) : '';
  return /^https:\/\/docs\.google\.com\/forms\//.test(value)
    ? value.replace(/\?.*$/, '')
    : REQUEST_FORM.defaultUrl;
}


/** Writes the request form address to Settings if it isn't there yet. */
function setupVenueRequest() {
  assertSheetCaller_();
  const settings = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), HE_CONFIG.settings.sheetName);
  const cell = settings.getRange(HE_CONFIG.settings.requestFormUrlCell);
  if (!normalizedText_(cell.getDisplayValue())) {
    settings.getRange('A8:C8').setValues([[
      'Venue request form',
      REQUEST_FORM.defaultUrl,
      'HE Facilities & Equipment Request Form. New venue request builds its prefilled link from this address.',
    ]]);
    cell.setBackground('#d9ead3').setWrap(true).setFontSize(8).setHorizontalAlignment('center');
    settings.getRange('C8').setWrap(true);
  }
  return 'ok';
}


function parseDialogDateTime_(dateText, timeText) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText));
  const time = parseTimeText_(timeText);
  if (!date || !time) return null;
  return new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), time.hour, time.minute, 0, 0);
}


// --- REQUEST VALIDATION ---

const REQUEST_RULES = Object.freeze({ maxParticipants: 5000, emailDomain: 'ateneo.edu' });


/**
 * Checks request answers before a link is built. Returns cleaned values and
 * a message per field that needs fixing. RequestShared.html has the same
 * rules for the browser; this is the copy the server trusts.
 */
function checkRequestValues_(values) {
  const errors = {};
  const out = Object.assign({}, values);
  const choices = REQUEST_FORM.choices;

  if (out.localNo && !/^[0-9][0-9 -]{1,14}$/.test(out.localNo)) errors.localNo = 'Use numbers only, like 5155. Leave it blank if you have none.';
  let phone = String(out.contactNumber || '').replace(/[\s()-]/g, '');
  phone = phone.replace(/^\+?63/, '').replace(/^0/, '');
  if (out.contactNumber && !/^9\d{9}$/.test(phone)) errors.contactNumber = 'Use a PH mobile number, like 9171234567 or 0917 123 4567.';
  if (out.contactNumber) out.contactNumber = phone;
  const email = String(out.email || '').toLowerCase();
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  else if (out.email && !/@([a-z0-9-]+\.)*ateneo\.edu$/.test(email)) errors.email = 'Use your official Ateneo email (@obf.ateneo.edu for students, @ateneo.edu for employees).';
  if (out.contactPerson && String(out.contactPerson).indexOf(',') === -1) errors.contactPerson = 'Write it as Last Name, First Name.';
  if (out.approverName && String(out.approverName).length < 3) errors.approverName = 'Write the approver\'s full name.';

  if (out.participants !== undefined && out.participants !== '') {
    const people = Number(out.participants);
    if (!(people >= 1 && people <= REQUEST_RULES.maxParticipants && Math.floor(people) === people)) {
      errors.participants = 'Use a whole number from 1 to ' + REQUEST_RULES.maxParticipants + '.';
    }
  }
  if (out.date) {
    const day = parseDialogDateTime_(out.date, '00:00');
    const today = dateAtMidnight_(new Date());
    if (!day) errors.date = 'Pick a valid date.';
    else if (day < today) errors.date = 'Pick today or a later date.';
  }
  const start = parseTimeText_(out.startTime), end = parseTimeText_(out.endTime);
  if (out.startTime && !start) errors.startTime = 'Pick a valid start time.';
  if (out.endTime && !end) errors.endTime = 'Pick a valid end time.';
  if (start && end && end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
    errors.endTime = 'The end time must be later than the start time.';
  }

  const conditions = out.conditions || [];
  if (conditions.some(function (c) { return choices.conditions.indexOf(c) === -1; })) errors.conditions = 'Pick from the listed options.';
  else if (conditions.length > 1 && conditions.indexOf(REQUEST_FORM.noneCondition) !== -1) {
    errors.conditions = '"None apply" can\'t be picked with the other options.';
  }
  if (conditions.indexOf(choices.conditions[2]) !== -1 && /^(n\/?a|none|)$/i.test(String(out.activityDetails || '').trim())) {
    errors.activityDetails = 'Describe the group dynamics or interactive activities.';
  }
  const equipment = out.equipment || [];
  if (equipment.length > 1 && equipment.indexOf(REQUEST_FORM.noEquipment) !== -1) {
    errors.equipment = '"None" can\'t be picked with other equipment.';
  }
  if (out.proofLink && !/^https:\/\/\S+\.\S+/.test(out.proofLink)) {
    errors.proofLink = 'Paste the full share link, starting with https://';
  }
  return { values: out, errors: errors };
}


// --- CACHING ---

const CACHE_SECONDS = Object.freeze({ calendar: 300, registry: 300 });


/** Returns a cached JSON value, computing and storing it on a miss. */
function cacheKeyFor_(key) {
  return 'v3:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key));
}


function cached_(key, seconds, compute) {
  const cache = CacheService.getScriptCache();
  const cacheKey = cacheKeyFor_(key);
  const hit = cache.get(cacheKey);
  if (hit) return JSON.parse(hit);
  const value = compute();
  const text = JSON.stringify(value);
  // Script cache entries are capped at 100 KB.
  if (text.length < 95000) cache.put(cacheKey, text, seconds);
  return value;
}


function clearPortalCache_() {
  CacheService.getScriptCache().remove('portal-registry-v2');
}


/** Calendar events for a range, cached for five minutes. */
function cachedEvents_(calendarId, range) {
  return cached_(['events', calendarId, range.timeMin, range.timeMax].join('|'), CACHE_SECONDS.calendar, function () {
    return listAllEvents_(calendarId, range).map(function (event) {
      return {
        summary: event.summary || '',
        description: event.description || '',
        transparency: event.transparency || '',
        status: event.status || '',
        start: event.start,
        end: event.end,
      };
    });
  });
}


/**
 * Busy periods for many venues over one range, keyed by calendar ID.
 * A venue whose calendar could not be read maps to null.
 */
function freeBusyForVenues_(venues, range) {
  const result = {};
  for (let offset = 0; offset < venues.length; offset += HE_CONFIG.freeBusyBatchSize) {
    const batch = venues.slice(offset, offset + HE_CONFIG.freeBusyBatchSize);
    const ids = batch.map(function (venue) { return venue.calendarId; });
    const busy = cached_(['freebusy', range.timeMin, range.timeMax].concat(ids.slice().sort()).join('|'),
      CACHE_SECONDS.calendar, function () {
        const response = Calendar.Freebusy.query({
          timeMin: range.timeMin,
          timeMax: range.timeMax,
          timeZone: range.timeZone,
          calendarExpansionMax: HE_CONFIG.freeBusyBatchSize,
          items: ids.map(function (id) { return { id: id }; }),
        });
        const calendars = response.calendars || {};
        const out = {};
        ids.forEach(function (id) {
          const entry = calendars[id];
          out[id] = !entry || (entry.errors && entry.errors.length)
            ? null
            : (entry.busy || []).map(function (p) { return [Date.parse(p.start), Date.parse(p.end)]; });
        });
        return out;
      });
    Object.keys(busy).forEach(function (id) {
      result[id] = busy[id] && busy[id].map(function (p) { return { start: new Date(p[0]), end: new Date(p[1]) }; });
    });
  }
  return result;
}


function openPortalLink() {
  assertSheetCaller_();
  const url = ScriptApp.getService().getUrl();
  const settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HE_CONFIG.settings.sheetName);
  if (url && settings) settings.getRange(HE_CONFIG.settings.portalUrlCell).setValue(url);
  const html = url
    ? '<p style="font:14px Arial">Open the portal: <a href="' + url + '" target="_blank" rel="noopener">HE Venue Explorer portal</a></p>'
    : '<p style="font:14px Arial">The portal has not been deployed yet. In Apps Script, use Deploy &gt; New deployment &gt; Web app.</p>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(360).setHeight(90), 'Web portal');
}


// --- REQUEST FORM STATUS ---

const FORM_STATUS = Object.freeze({
  cacheKey: 'form-status-v1',
  reportProperty: 'FORM_CLOSED_REPORT',
  checkSeconds: 120,
  maxReportsPerUserPerDay: 6,
});


/**
 * Is the CFMO form taking responses? The script first opens the form itself.
 * The form only opens for signed-in Ateneo accounts, so that usually comes
 * back "sign in required"; then the answer comes from people who opened the
 * form and reported that it said it was closed. A report lasts until the next
 * intake window opens.
 */
function formIntakeStatus_() {
  return cached_(FORM_STATUS.cacheKey, FORM_STATUS.checkSeconds, function () {
    const direct = fetchFormState_();
    if (direct.state !== 'unknown') return direct;
    const report = readClosedReport_();
    return report || { state: 'unknown', source: 'none', message: '' };
  });
}


function fetchFormState_() {
  try {
    const response = UrlFetchApp.fetch(getRequestFormUrl_(), { followRedirects: false, muteHttpExceptions: true });
    const code = response.getResponseCode();
    const headers = response.getHeaders();
    const location = String(headers.Location || headers.location || '');
    if (code >= 300 && code < 400 && /closedform/.test(location)) {
      return { state: 'closed', source: 'form', message: 'This form is no longer accepting responses.' };
    }
    if (code === 200) {
      const text = response.getContentText();
      if (/no longer accepting responses/i.test(text)) {
        return { state: 'closed', source: 'form', message: closedMessage_(text) };
      }
      if (/FB_PUBLIC_LOAD_DATA_/.test(text)) return { state: 'open', source: 'form', message: '' };
    }
  } catch (error) {
    console.warn('Form status check failed: ' + error.message);
  }
  return { state: 'unknown', source: 'none', message: '' };
}


/** The owner's message on a closed form, e.g. "60 per day limit acquired." */
function closedMessage_(html) {
  const text = htmlToText_(html).replace(/\s+/g, ' ');
  const match = /(This form is no longer accepting responses\.?[^<]{0,200})/i.exec(text);
  return match ? match[1].replace(/\s*(Try contacting|Report Abuse|Never submit passwords).*$/i, '').trim().slice(0, 220)
    : 'This form is no longer accepting responses.';
}


function readClosedReport_() {
  const raw = PropertiesService.getScriptProperties().getProperty(FORM_STATUS.reportProperty);
  if (!raw) return null;
  try {
    const report = JSON.parse(raw);
    if (!report || Date.now() >= report.until) return null;
    return { state: 'closed', source: 'report', message: report.message, reportedAt: report.at, until: report.until };
  } catch (error) {
    return null;
  }
}


/** When the next intake window opens after `from`, in milliseconds. */
function nextIntakeStart_(from) {
  const intake = REQUEST_FORM.intake;
  for (let offset = 0; offset < 8; offset++) {
    const day = addDays_(dateAtMidnight_(from), offset);
    const windows = day.getDay() === 0 ? [] : day.getDay() === 6 ? intake.saturday : intake.weekday;
    for (let i = 0; i < windows.length; i++) {
      const start = new Date(day.getTime() + windows[i][0] * 60000);
      if (start > from) return start.getTime();
    }
  }
  return from.getTime() + 86400000;
}


/** Someone opened the form: kind 'closed' (it said so) or 'open' (it took answers). */
function reportFormState_(account, kind, note) {
  const properties = PropertiesService.getScriptProperties();
  const limitKey = 'fr:' + todayText_() + ':' + userHash_(account.email);
  const count = Number(properties.getProperty(limitKey) || 0);
  if (count >= FORM_STATUS.maxReportsPerUserPerDay) throw new Error('Thanks, that\'s enough reports from you for today.');
  properties.setProperty(limitKey, String(count + 1));
  if (kind === 'closed') {
    const message = normalizedText_(note).slice(0, 160) || 'This form is no longer accepting responses.';
    properties.setProperty(FORM_STATUS.reportProperty, JSON.stringify({ at: Date.now(), until: nextIntakeStart_(new Date()), message: message }));
  } else {
    properties.deleteProperty(FORM_STATUS.reportProperty);
  }
  CacheService.getScriptCache().remove(cacheKeyFor_(FORM_STATUS.cacheKey));
  logAccess_('form-' + kind, account.email, '');
  return formIntakeStatus_();
}
