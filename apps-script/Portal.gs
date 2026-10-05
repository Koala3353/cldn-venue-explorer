/**
 * HE Venue Explorer web portal
 *
 * Serves the portal (PortalPage.html) and the calls it makes. Deploy with
 * Deploy > New deployment > Web app, executing as the owner.
 *
 * Every lookup can also run during page load (see doGet), so the portal
 * still works when Google blocks live calls because several Google
 * accounts are signed in.
 */

const PORTAL = Object.freeze({
  registryCacheKey: 'portal-registry-v2',
  maximumDays: 14,
  descriptionLimit: 280,
  // Lookups the page may ask doGet to run during a reload.
  reloadable: Object.freeze(['apiAvailability', 'apiReservations', 'apiVenueDay', 'apiFreeNow', 'apiAccount', 'apiFormStatus']),
});


function doGet(e) {
  const params = (e && e.parameter) || {};
  const boot = portalBoot_();
  boot.view = normalizedText_(params.view);
  boot.state = parseJsonParam_(params.state);

  const call = parseJsonParam_(params.q);
  if (call && PORTAL.reloadable.indexOf(call.fn) !== -1) {
    try {
      boot.prefetch = { fn: call.fn, args: call.args || [], result: globalThis[call.fn].apply(null, call.args || []) };
    } catch (error) {
      boot.prefetch = { fn: call.fn, args: call.args || [], error: error.message };
    }
  }
  return renderPortal_(boot);
}


/**
 * The key request and key redeem forms post here as a normal page load.
 * Background calls (google.script.run) can fail when several Google accounts
 * are signed in; a page load always runs as the account that opened the page.
 */
function doPost(e) {
  const params = (e && e.parameter) || {};
  const action = normalizedText_(params.action);
  const flash = { action: action, ok: false, message: '' };
  try {
    const account = requireAccount_();
    if (!checkFormToken_(account.email, params.token)) {
      throw new Error('This form expired. Reload the page and try again.');
    }
    if (action === 'requestAccess') {
      submitAccessRequest_(account, params);
    } else if (action === 'redeemKey') {
      redeemKey_(account, params.key);
    } else if (action === 'reportIssue') {
      flash.id = submitIssue_(account, params).id;
    } else {
      throw new Error('Unknown action.');
    }
    flash.ok = true;
  } catch (error) {
    flash.message = String(error && error.message || error).replace(/^(Exception|Error):\s*/, '');
    // Hand the typed answers back so nothing has to be retyped.
    if (action === 'requestAccess') {
      flash.form = {};
      ['name', 'organization', 'role', 'contact', 'purpose'].forEach(function (f) {
        flash.form[f] = normalizedText_(params[f]).slice(0, 600);
      });
    }
    if (action === 'reportIssue') {
      flash.form = { kind: normalizedText_(params.kind), page: normalizedText_(params.page), message: String(params.message || '').slice(0, 2000) };
    }
  }
  const boot = portalBoot_();
  boot.view = action === 'reportIssue' ? 'report' : 'access';
  boot.flash = flash;
  return renderPortal_(boot);
}


function renderPortal_(boot) {
  const template = HtmlService.createTemplateFromFile('PortalPage');
  template.bootJson = JSON.stringify(boot).replace(/</g, '\\u003c');
  return template.evaluate()
    .setTitle('HE Venue Explorer')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}


function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}


function portalBoot_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const account = getAccount_();
  const settings = readSettings_(ss);
  const timeZone = ss.getSpreadsheetTimeZone();
  const registry = cached_(PORTAL.registryCacheKey, CACHE_SECONDS.registry, function () {
    return portalRegistry_(ss);
  });
  const settingsSheet = ss.getSheetByName(HE_CONFIG.settings.sheetName);

  return Object.assign(registry, {
    hours: {
      openingMinute: settings.openingHour * 60 + settings.openingMinute,
      closingMinute: settings.closingHour * 60 + settings.closingMinute,
    },
    maximumDays: Math.min(settings.maximumSearchDays, PORTAL.maximumDays,
      account.plan === 'none' ? 1 : PLANS[account.plan].maxDays),
    lastRefresh: settingsSheet
      ? normalizedText_(settingsSheet.getRange(HE_CONFIG.settings.lastRefreshCell).getDisplayValue())
      : '',
    today: Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd'),
    nowMinute: Number(Utilities.formatDate(new Date(), timeZone, 'H')) * 60 +
      Number(Utilities.formatDate(new Date(), timeZone, 'm')),
    execUrl: ScriptApp.getService().getUrl() || '',
    account: accountSummary_(account),
    formToken: account.plan === 'none' ? '' : formToken_(account.email, 0),
    userEmail: account.email,
    profiles: account.plan === 'pro' ? loadProfiles_() : { lastUsedId: '', profiles: [], deleted: [] },
    // Form entry IDs and the form address stay on the server; links are built there.
    form: requestFormSchema_(false),
    issues: { kinds: ISSUES.kinds, pages: ISSUES.pages },
    links: {
      availability: 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/venue-availability',
      forms: 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/forms',
      layout: 'https://sites.google.com/ateneo.edu/lsreservations/he-venues/layout',
      osa: 'https://sites.google.com/ateneo.edu/ateneolsosa/help-me/osa-venues-schedule',
    },
  });
}


/** Venues from the registry, joined with their specs and building. */
function portalRegistry_(ss) {
  const specs = {};
  const specSheet = ss.getSheetByName(HE_CONFIG.venueSpecsSheetName);
  if (specSheet && specSheet.getLastRow() > 1) {
    specSheet.getRange(2, 1, specSheet.getLastRow() - 1, 10).getValues().forEach(function (row) {
      const name = normalizedKey_(row[4]);
      if (!name) return;
      specs[name] = {
        building: normalizedText_(row[0]),
        floor: normalizedText_(row[2]),
        room: normalizedText_(row[3]),
        facility: normalizedText_(row[5]),
        equipment: normalizedText_(row[6]),
        airCon: normalizedText_(row[7]),
        capacity: Number(row[8]) || null,
        capacityNote: normalizedText_(row[9]),
      };
    });
  }

  const buildings = getBuildingRows_(ss);
  const venues = getVenueRows_(ss).map(function (row) {
    const spec = specs[normalizedKey_(row.venueName)] || null;
    const building = spec && spec.building
      ? spec.building
      : (buildings.find(function (b) { return venueMatchesBuilding_(row.venueName, b); }) || {}).building || '';
    return {
      name: row.venueName,
      type: row.type,
      building: building,
      floor: spec ? spec.floor : '',
      facility: spec ? spec.facility : '',
      equipment: spec ? spec.equipment : '',
      airCon: spec ? spec.airCon : '',
      capacity: spec ? spec.capacity : null,
      capacityNote: spec ? spec.capacityNote : '',
      hasSpecs: Boolean(spec),
    };
  }).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });

  return {
    venues: venues,
    types: uniqueSorted_(venues.map(function (v) { return v.type; })),
    buildings: uniqueSorted_(venues.map(function (v) { return v.building; }).filter(Boolean)),
  };
}


// --- API (called with google.script.run, or during a reload) ---

/**
 * Free slots for every venue matching the filters.
 * query: { startDate, endDate, type, building, minCapacity, maxCapacity, airCon, minFree, venue,
 *          text, equipment, days: 'all'|'weekdays'|'monsat', timeMode: 'any'|'exact'|'window', fromTime, toTime }
 * timeMode 'exact' keeps rooms free for the whole fromTime-toTime slot.
 * timeMode 'window' keeps free time inside fromTime-toTime that lasts at least minFree minutes.
 */
function apiAvailability(query) {
  query = query || {};
  const account = requireAccount_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readSettings_(ss);
  const range = portalRange_(query.startDate, query.endDate, settings, account);
  const time = availabilityWindow_(query, settings);
  const usage = consume_(account, 'search');
  const registry = cached_(PORTAL.registryCacheKey, CACHE_SECONDS.registry, function () {
    return portalRegistry_(ss);
  });
  const byName = {};
  registry.venues.forEach(function (v) { byName[normalizedKey_(v.name)] = v; });

  const minCapacity = Math.max(0, Number(query.minCapacity) || 0);
  const maxCapacity = Math.max(0, Number(query.maxCapacity) || 0);
  const minFree = Math.max(0, Number(query.minFree) || 0);
  const text = normalizedKey_(query.text || '');
  const equipment = normalizedKey_(query.equipment || '');
  let skippedNoSpecs = 0;
  const venues = getVenueRows_(ss).filter(function (row) {
    const info = byName[normalizedKey_(row.venueName)] || {};
    if (query.venue && normalizedKey_(row.venueName) !== normalizedKey_(query.venue)) return false;
    if (query.type && normalizedKey_(row.type) !== normalizedKey_(query.type)) return false;
    if (query.building && normalizedKey_(info.building) !== normalizedKey_(query.building)) return false;
    if (text && normalizedKey_([row.venueName, info.building, info.facility].join(' ')).indexOf(text) === -1) return false;
    if (minCapacity > 0 || maxCapacity > 0 || query.airCon || equipment) {
      if (!info.hasSpecs) {
        skippedNoSpecs++;
        return false;
      }
      if (minCapacity > 0 && !(info.capacity >= minCapacity)) return false;
      if (maxCapacity > 0 && !(info.capacity && info.capacity <= maxCapacity)) return false;
      if (query.airCon && info.airCon !== 'Yes') return false;
      if (equipment && normalizedKey_(info.equipment).indexOf(equipment) === -1) return false;
    }
    return true;
  });

  const busyByCalendar = freeBusyForVenues_(venues, range);
  const slots = [];
  const failed = [];
  venues.forEach(function (venue) {
    const busy = busyByCalendar[venue.calendarId];
    if (!busy) {
      failed.push(venue.venueName);
      return;
    }
    calculateAvailableSlots_(range.start, range.endExclusive, busy, settings).forEach(function (slot) {
      const weekday = slot.start.getDay();
      if (query.days === 'weekdays' && (weekday === 0 || weekday === 6)) return;
      if (query.days === 'monsat' && weekday === 0) return;
      let start = slot.start.getHours() * 60 + slot.start.getMinutes();
      let end = slot.end.getHours() * 60 + slot.end.getMinutes();
      if (end === 0 && slot.end > slot.start) end = 1440;
      if (time.mode === 'exact') {
        if (start > time.from || end < time.to) return;
      } else if (time.mode === 'window') {
        start = Math.max(start, time.from);
        end = Math.min(end, time.to);
        if (end - start < Math.max(minFree, 15)) return;
      } else if (end - start < minFree) {
        return;
      }
      slots.push({
        venue: venue.venueName,
        date: Utilities.formatDate(slot.start, range.timeZone, 'yyyy-MM-dd'),
        start: start,
        end: end,
      });
    });
  });

  return { slots: slots, checked: venues.length - failed.length, failed: failed, skippedNoSpecs: skippedNoSpecs,
    time: time, usage: usage };
}


/** Reads and checks the optional time-of-day part of a search. */
function availabilityWindow_(query, settings) {
  const mode = query.timeMode === 'exact' || query.timeMode === 'window' ? query.timeMode : 'any';
  if (mode === 'any') return { mode: 'any' };
  const from = parseTimeText_(query.fromTime);
  const to = parseTimeText_(query.toTime);
  if (!from || !to) throw new Error('Pick both a start and an end time.');
  const fromMinute = from.hour * 60 + from.minute;
  const toMinute = to.hour * 60 + to.minute;
  if (toMinute <= fromMinute) throw new Error('The end time must be later than the start time.');
  const opening = settings.openingHour * 60 + settings.openingMinute;
  const closing = settings.closingHour * 60 + settings.closingMinute;
  if (fromMinute < opening || toMinute > closing) {
    throw new Error('Pick times between ' + clockText_(settings.openingHour, settings.openingMinute) + ' and ' +
      clockText_(settings.closingHour, settings.closingMinute) + '. Rooms are not bookable outside those hours.');
  }
  return { mode: mode, from: fromMinute, to: toMinute };
}


/**
 * Bookings for one venue, already split per day.
 * query: { venue, startDate, endDate }
 */
function apiReservations(query) {
  const account = requireAccount_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readSettings_(ss);
  const range = portalRange_(query.startDate, query.endDate, settings, account);
  const venue = getVenueRows_(ss).find(function (row) {
    return normalizedKey_(row.venueName) === normalizedKey_(query.venue);
  });
  if (!venue) throw new Error('That venue is not in the registry.');
  const usage = consume_(account, 'schedule');

  const days = splitEventsByDay_(cachedEvents_(venue.calendarId, range), range.start, range.endExclusive);
  days.forEach(function (day) {
    day.items.forEach(function (item) { item.description = item.description.slice(0, PORTAL.descriptionLimit); });
  });
  return { venue: venue.venueName, startDate: query.startDate, endDate: query.endDate || query.startDate, days: days, usage: usage };
}


/** One venue's bookings on one day, for the request availability check. */
function apiVenueDay(venueName, dateText) {
  const account = requireAccount_();
  const day = getVenueDay_(venueName, dateText);
  day.usage = consume_(account, 'check');
  return day;
}


/** Venues free right now, with how long they stay free. */
function apiFreeNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readSettings_(ss);
  const timeZone = Session.getScriptTimeZone();
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const opening = settings.openingHour * 60 + settings.openingMinute;
  const closing = settings.closingHour * 60 + settings.closingMinute;
  if (nowMinute < opening || nowMinute >= closing) {
    return { closed: true, opensAt: opening, closesAt: closing, venues: [], total: 0 };
  }

  const today = Utilities.formatDate(now, timeZone, 'yyyy-MM-dd');
  const range = portalRange_(today, today, settings);
  const venues = getVenueRows_(ss);
  const busyByCalendar = freeBusyForVenues_(venues, range);
  const free = [];
  venues.forEach(function (venue) {
    const busy = busyByCalendar[venue.calendarId];
    if (!busy) return;
    const slot = calculateAvailableSlots_(range.start, range.endExclusive, busy, settings).find(function (s) {
      return s.start <= now && s.end > now;
    });
    if (slot) {
      free.push({ venue: venue.venueName, type: venue.type, until: slot.end.getHours() * 60 + slot.end.getMinutes() });
    }
  });
  free.sort(function (a, b) { return b.until - a.until || a.venue.localeCompare(b.venue, undefined, { numeric: true }); });
  return { closed: false, nowMinute: nowMinute, closesAt: closing, total: venues.length, freeCount: free.length, venues: free };
}


function apiSaveProfiles(store) {
  const account = requireAccount_();
  if (account.plan !== 'pro') throw new Error('PRO:profiles');
  return saveProfiles_(store);
}


/** Pro: builds the prefilled request form link on the server. */
function apiBuildRequestLink(request) {
  const account = requireAccount_();
  if (account.plan !== 'pro') throw new Error('PRO:link');
  const values = readRequestValues_(request || {});
  const required = REQUEST_FORM.requiredRequesterFields.concat(REQUEST_FORM.requiredEventFields);
  const missing = required.filter(function (f) {
    return Array.isArray(values[f]) ? !values[f].length : !values[f];
  });
  if (missing.length) throw new Error('Fill in every required field first.');
  const checked = checkRequestValues_(values);
  const problems = Object.keys(checked.errors);
  if (problems.length) throw new Error(checked.errors[problems[0]]);
  const usage = consume_(account, 'link');
  return { url: buildRequestUrl_(checked.values), usage: usage };
}


/** Whether the CFMO request form is taking responses right now. */
function apiFormStatus() {
  requireAccount_();
  return formIntakeStatus_();
}


/** kind: 'closed' when the form said it is closed, 'open' when it took answers. */
function apiReportFormState(kind, note) {
  const account = requireAccount_();
  if (kind !== 'closed' && kind !== 'open') throw new Error('Unknown report.');
  return reportFormState_(account, kind, note);
}


/** The visitor's plan and today's usage. */
function apiAccount() {
  return accountSummary_(getAccount_());
}


function apiRedeemKey(key) {
  const account = requireAccount_();
  redeemKey_(account, key);
  return accountSummary_(getAccount_());
}


function apiRequestAccess(form) {
  const account = requireAccount_();
  return submitAccessRequest_(account, form || {});
}


function accountSummary_(account) {
  const plan = account.plan === 'none' ? null : PLANS[account.plan];
  return {
    email: account.email,
    plan: account.plan,
    reason: account.reason || '',
    domain: ACCESS.domain,
    label: plan ? plan.label : '',
    maxDays: plan ? plan.maxDays : 0,
    limits: plan ? plan.limits : {},
    usage: usageToday_(account),
    key: account.key || null,
    accessReady: Boolean(PropertiesService.getScriptProperties().getProperty(ACCESS.properties.sheetId)),
  };
}


function clockText_(hour, minute) {
  return (hour % 12 === 0 ? 12 : hour % 12) + ':' + String(minute).padStart(2, '0') + ' ' + (hour < 12 ? 'AM' : 'PM');
}


// --- HELPERS ---

function portalRange_(startText, endText, settings, account) {
  const start = parseDialogDateTime_(startText, '00:00');
  const end = parseDialogDateTime_(endText || startText, '00:00');
  if (!start || !end) throw new Error('Pick a valid date.');
  if (end < start) throw new Error('The end date must be on or after the start date.');
  const days = Math.round((end - start) / 86400000) + 1;
  const planDays = account && PLANS[account.plan] ? PLANS[account.plan].maxDays : 1;
  const limit = Math.min(settings.maximumSearchDays, PORTAL.maximumDays, planDays);
  if (days > limit) {
    throw new Error(limit === 1 ? 'PRO:range' : `Search ${limit} days or fewer at a time.`);
  }
  const endExclusive = addDays_(end, 1);
  const timeZone = Session.getScriptTimeZone();
  return {
    start: start,
    endExclusive: endExclusive,
    timeZone: timeZone,
    timeMin: toRfc3339_(start, timeZone),
    timeMax: toRfc3339_(endExclusive, timeZone),
  };
}


function parseJsonParam_(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}
