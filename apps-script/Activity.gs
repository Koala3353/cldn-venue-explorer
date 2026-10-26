/**
 * HE Venue Explorer - activity log and the owner's daily report
 *
 * Every portal lookup (slot search, venue schedule, calendar check, form
 * autofill) and every error is written to an Activity tab in the access sheet.
 * Once a day the owner gets one email with everything since the last report,
 * with autofills for orgs outside Celadon flagged. No activity, no email.
 *
 * Owner setup: HE Venue Explorer > Access keys (owner) > Turn daily activity email on or off.
 */

const ACTIVITY = Object.freeze({
  sheetName: 'Activity',
  header: ['When', 'Email', 'Plan', 'Kind', 'Result', 'Venue', 'Dates', 'Organization', 'Outside Celadon', 'Details'],
  // An autofill whose organization or event title mentions one of these counts as Celadon.
  homeOrgs: Object.freeze(['celadon', 'cldn']),
  reportHour: 21,
  keepDays: 90,
  lastReportProperty: 'ACTIVITY_LAST_REPORT',
  clientErrorsPerDay: 20,
  kinds: Object.freeze({ search: 'Slot search', schedule: 'Venue schedule', check: 'Calendar check', link: 'Form autofill', error: 'Page error' }),
});


// --- PUBLIC PORTAL CALLS (each wraps the real lookup and logs it) ---

function apiAvailability(query) {
  return tracked_('search', searchSlots_, [query], function (q, r) {
    q = q || {};
    const filters = [q.type, q.building, q.text && '"' + q.text + '"', q.equipment && 'equipment: ' + q.equipment,
      q.minCapacity && q.minCapacity + '+ people', q.airCon && 'aircon',
      q.timeMode && q.timeMode !== 'any' ? q.timeMode + ' ' + (q.fromTime || '') + '-' + (q.toTime || '') : '']
      .filter(Boolean).join(', ');
    return { venue: q.venue || '', dates: dateSpan_(q.startDate, q.endDate),
      details: (filters || 'No filters') + (r && r.slots ? ' · ' + r.slots.length + ' free slots' : '') };
  });
}

function apiReservations(query) {
  return tracked_('schedule', venueSchedule_, [query], function (q) {
    q = q || {};
    return { venue: q.venue || '', dates: dateSpan_(q.startDate, q.endDate) };
  });
}

function apiVenueDay(venueName, dateText) {
  return tracked_('check', venueDayCheck_, [venueName, dateText], function () {
    return { venue: venueName || '', dates: dateText || '' };
  });
}

function apiBuildRequestLink(request) {
  return tracked_('link', requestLink_, [request], function (r) {
    r = r || {};
    const org = String(r.organization || '').trim();
    return {
      venue: r.venue || '', dates: [r.date, r.startTime && r.endTime ? r.startTime + '-' + r.endTime : ''].filter(Boolean).join(' '),
      organization: org, outside: isOutsideCeladon_(org, r.eventTitle) ? 'Yes' : 'No',
      details: [r.eventTitle, r.contactPerson && 'contact: ' + r.contactPerson, r.participants && r.participants + ' people', r.nature]
        .filter(Boolean).join(' · '),
    };
  });
}

/** Errors the page saw that never reached the server (network, blocked calls). */
function apiLogClientError(message, page) {
  const account = getAccount_();
  if (account.plan === 'none') return false;
  const cache = CacheService.getScriptCache();
  const key = 'clientErr:' + userHash_(account.email) + ':' + todayKey_();
  const count = Number(cache.get(key) || 0);
  if (count >= ACTIVITY.clientErrorsPerDay) return false;
  cache.put(key, String(count + 1), 21600);
  writeActivity_(account, 'error', 'error', { details: String(page || '').slice(0, 40) + ': ' + String(message || '').slice(0, 300) });
  return true;
}


// --- LOGGING ---

function tracked_(kind, fn, args, describe) {
  let result, failure = null;
  try {
    result = fn.apply(null, args);
  } catch (error) {
    failure = error;
  }
  try {
    const account = getAccount_();
    const info = describe.apply(null, args.concat([result])) || {};
    if (failure) {
      const message = String(failure.message || failure);
      // Quota and Pro-only refusals are expected; log them as such, not as errors.
      const expected = /^(LIMIT|PRO|ACCESS):/.test(message);
      const reason = expected ? refusalText_(message) : 'Error: ' + message;
      info.details = [info.details, reason].filter(Boolean).join(' · ');
      writeActivity_(account, kind, expected ? 'refused' : 'error', info);
    } else {
      writeActivity_(account, kind, 'ok', info);
    }
  } catch (logError) {
    console.warn('Activity log failed: ' + logError.message);
  }
  if (failure) throw failure;
  return result;
}

function writeActivity_(account, kind, outcome, info) {
  const sheet = activitySheet_();
  if (!sheet) return;
  sheet.appendRow([
    new Date(), account.email, account.plan, kind, outcome,
    safeSheetText_(info.venue || ''), safeSheetText_(info.dates || ''), safeSheetText_(info.organization || ''),
    info.outside || '', safeSheetText_(String(info.details || '').slice(0, 500)),
  ]);
}

function activitySheet_() {
  const log = accessSheet_(ACCESS.sheets.log, true);
  if (!log) return null;
  const ss = log.getParent();
  let sheet = ss.getSheetByName(ACTIVITY.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(ACTIVITY.sheetName);
    sheet.appendRow(ACTIVITY.header);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, ACTIVITY.header.length).setFontWeight('bold');
  }
  return sheet;
}

function refusalText_(message) {
  const parts = message.split(':'), what = ACTIVITY.kinds[parts[1]] || parts[1] || '';
  if (parts[0] === 'LIMIT') return 'Refused: daily ' + what.toLowerCase() + ' limit reached';
  if (parts[0] === 'PRO') return 'Refused: ' + what.toLowerCase() + ' is Pro only';
  return 'Refused: not signed in with a school account';
}

function isOutsideCeladon_(organization, title) {
  const text = (String(organization || '') + ' ' + String(title || '')).toLowerCase();
  return !ACTIVITY.homeOrgs.some(function (word) { return text.indexOf(word) !== -1; });
}

function dateSpan_(start, end) {
  if (!start) return '';
  return end && end !== start ? start + ' to ' + end : String(start);
}

function todayKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
}


// --- DAILY REPORT ---

/** Time trigger: emails the owner everything logged since the last report. */
function sendDailyActivityReport() {
  const sheet = activitySheet_();
  if (!sheet) return;
  const properties = PropertiesService.getScriptProperties();
  const since = Number(properties.getProperty(ACTIVITY.lastReportProperty) || 0) || (Date.now() - 24 * 3600 * 1000);
  const now = Date.now();
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, ACTIVITY.header.length).getValues() : [];
  const fresh = rows.filter(function (r) { return r[0] instanceof Date && r[0].getTime() > since && r[0].getTime() <= now; });
  properties.setProperty(ACTIVITY.lastReportProperty, String(now));
  pruneActivity_(sheet, rows);
  if (!fresh.length) return;

  const notify = properties.getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
  const mail = emailActivityReport_(fresh, new Date(since), new Date(now));
  sendDesignedEmail_({ to: notify, subject: mail.subject, html: mail.html, text: mail.text });
}

function pruneActivity_(sheet, rows) {
  const cutoff = Date.now() - ACTIVITY.keepDays * 24 * 3600 * 1000;
  let old = 0;
  while (old < rows.length && rows[old][0] instanceof Date && rows[old][0].getTime() < cutoff) old++;
  if (old) sheet.deleteRows(2, old);
}

/** Owner menu: turns the 9 PM activity email on or off. */
function toggleActivityReport() {
  assertOwner_();
  const say = function (text) { try { SpreadsheetApp.getUi().alert(text); } catch (e) { console.log(text); } };
  const existing = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'sendDailyActivityReport'; });
  if (existing.length) {
    existing.forEach(function (t) { ScriptApp.deleteTrigger(t); });
    say('Daily activity email is off.');
    return;
  }
  ScriptApp.newTrigger('sendDailyActivityReport').timeBased().everyDays(1).atHour(ACTIVITY.reportHour).create();
  PropertiesService.getScriptProperties().setProperty(ACTIVITY.lastReportProperty, String(Date.now()));
  say('Daily activity email is on. It arrives around ' + ACTIVITY.reportHour % 12 + ' PM on days with portal activity.');
}

/** Owner menu: sends the report now, covering the last 24 hours, without moving the daily marker. */
function sendActivityReportNow() {
  assertOwner_();
  const sheet = activitySheet_();
  const last = sheet ? sheet.getLastRow() : 1;
  const since = Date.now() - 24 * 3600 * 1000;
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, ACTIVITY.header.length).getValues() : [];
  const fresh = rows.filter(function (r) { return r[0] instanceof Date && r[0].getTime() > since; });
  if (!fresh.length) { SpreadsheetApp.getUi().alert('No portal activity in the last 24 hours.'); return; }
  const notify = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
  const mail = emailActivityReport_(fresh, new Date(since), new Date());
  sendDesignedEmail_({ to: notify, subject: mail.subject, html: mail.html, text: mail.text });
  SpreadsheetApp.getActiveSpreadsheet().toast('Sent to ' + notify + '.', 'Activity report', 5);
}
