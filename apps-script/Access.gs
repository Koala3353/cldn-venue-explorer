/**
 * HE Venue Explorer - plans, usage caps and access keys
 *
 * Free: any @student.ateneo.edu account, with daily caps.
 * Pro: unlocked with an access key. Keys live in a separate, private
 * spreadsheet (the access backend) as salted SHA-256 hashes; the plain key
 * is shown once when it is created and never stored. A key can be bound to
 * one account only, and one account can hold one active key.
 *
 * Owner setup: HE Venue Explorer > Access keys > Set up access backend.
 */

const ACCESS = Object.freeze({
  domain: 'student.ateneo.edu',
  defaultNotifyEmail: 'brigadokeene@gmail.com',
  keyPrefix: 'HEVX',
  // Crockford-style alphabet: no I, L, O or U, so keys are easy to read aloud.
  keyAlphabet: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  keyPattern: /^HEVX-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
  maxRedeemFailuresPerDay: 5,
  maxRequestsPerDayGlobal: 40,
  planCacheSeconds: 300,
  properties: Object.freeze({
    sheetId: 'ACCESS_SHEET_ID',
    pepper: 'ACCESS_KEY_PEPPER',
    owner: 'ACCESS_OWNER_EMAIL',
    notify: 'ACCESS_NOTIFY_EMAIL',
  }),
  sheets: Object.freeze({ keys: 'Keys', requests: 'Requests', log: 'Log' }),
  keyStatus: Object.freeze({ unused: 'Unused', reserved: 'Reserved', active: 'Active', revoked: 'Revoked' }),
  requestStatus: Object.freeze(['New', 'Approve', 'Sent', 'Declined']),
});

// Daily caps per plan. 0 means the feature is not in the plan.
const PLANS = Object.freeze({
  free: Object.freeze({
    label: 'Free',
    maxDays: 1,
    limits: Object.freeze({ search: 3, schedule: 5, check: 15, link: 0, request: 1 }),
  }),
  pro: Object.freeze({
    label: 'Pro',
    maxDays: 14,
    limits: Object.freeze({ search: 300, schedule: 300, check: 600, link: 150, request: 1 }),
  }),
});


// --- WHO IS CALLING ---

function activeEmail_() {
  return normalizedText_(Session.getActiveUser().getEmail()).toLowerCase();
}


/**
 * The web portal runs as the owner, so a visitor could call any public
 * function with google.script.run. Functions meant for the sheet call this
 * first. It rejects a caller who is not the account the script runs as.
 * Sheet menus, dialogs and triggers run as the person using them, so they pass.
 */
function assertSheetCaller_() {
  const active = activeEmail_();
  const effective = normalizedText_(Session.getEffectiveUser().getEmail()).toLowerCase();
  if (active && effective && active !== effective) {
    throw new Error('This action is only available in the spreadsheet.');
  }
}


/** Owner-only actions: managing keys and the access backend. */
function assertOwner_() {
  assertSheetCaller_();
  const owner = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.owner);
  if (owner && activeEmail_() !== owner) {
    throw new Error('Only the owner of HE Venue Explorer can manage access keys.');
  }
}


/** The visitor's plan. Pro status is cached for five minutes. */
function getAccount_() {
  const email = activeEmail_();
  if (!email) return { email: '', plan: 'none', reason: 'signin' };
  if (!email.endsWith('@' + ACCESS.domain)) return { email: email, plan: 'none', reason: 'domain' };
  const pro = proStatus_(email);
  return { email: email, plan: pro ? 'pro' : 'free', key: pro };
}


function requireAccount_() {
  const account = getAccount_();
  if (account.plan === 'none') {
    throw new Error('ACCESS:Sign in with your @' + ACCESS.domain + ' account to use the portal.');
  }
  return account;
}


function proStatus_(email) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'plan:' + userHash_(email);
  const hit = cache.get(cacheKey);
  if (hit) return hit === '0' ? null : JSON.parse(hit);

  let status = null;
  const sheet = accessSheet_(ACCESS.sheets.keys, true);
  if (sheet && sheet.getLastRow() > 1) {
    const now = new Date();
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    for (const row of rows) {
      const expires = row[6] instanceof Date ? row[6] : null;
      if (normalizedText_(row[3]).toLowerCase() === email && row[2] === ACCESS.keyStatus.active &&
        (!expires || expires > now)) {
        status = {
          keyId: String(row[0]),
          since: row[5] instanceof Date ? Utilities.formatDate(row[5], 'Asia/Manila', 'd MMM yyyy') : '',
          expires: expires ? Utilities.formatDate(expires, 'Asia/Manila', 'd MMM yyyy') : '',
        };
        break;
      }
    }
  }
  cache.put(cacheKey, status ? JSON.stringify(status) : '0', ACCESS.planCacheSeconds);
  return status;
}


function clearPlanCache_(email) {
  CacheService.getScriptCache().remove('plan:' + userHash_(email));
}


// --- USAGE CAPS ---

/**
 * Counts one use of a feature for today (Asia/Manila) and throws a
 * LIMIT error when the plan's daily cap is reached. Counts are stored per
 * person per day in script properties, keyed by a salted hash of the email.
 */
function consume_(account, kind) {
  const limit = PLANS[account.plan].limits[kind] || 0;
  if (!limit) throw new Error('PRO:' + kind);
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    pruneUsage_();
    const properties = PropertiesService.getScriptProperties();
    const key = usageKey_(account.email);
    const usage = JSON.parse(properties.getProperty(key) || '{}');
    const used = usage[kind] || 0;
    if (used >= limit) throw new Error('LIMIT:' + kind);
    usage[kind] = used + 1;
    properties.setProperty(key, JSON.stringify(usage));
    return { kind: kind, used: used + 1, limit: limit };
  } finally {
    lock.releaseLock();
  }
}


function usageToday_(account) {
  if (account.plan === 'none') return {};
  return JSON.parse(PropertiesService.getScriptProperties().getProperty(usageKey_(account.email)) || '{}');
}


function usageKey_(email) {
  return 'u:' + todayText_() + ':' + userHash_(email);
}


/** Deletes counters from earlier days, once per day. */
function pruneUsage_() {
  const properties = PropertiesService.getScriptProperties();
  const today = todayText_();
  if (properties.getProperty('u:pruned') === today) return;
  properties.getKeys().forEach(function (key) {
    if ((key.indexOf('u:') === 0 || key.indexOf('rf:') === 0) && key !== 'u:pruned' && key.indexOf(':' + today + ':') === -1) {
      properties.deleteProperty(key);
    }
  });
  properties.setProperty('u:pruned', today);
}


function todayText_() {
  return Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd');
}


function userHash_(email) {
  return sha256_(pepper_() + '|user|' + normalizedText_(email).toLowerCase()).slice(0, 24);
}


// --- KEYS ---

/** Called from the portal: unlock Pro with an access key. */
function redeemKey_(account, rawKey) {
  if (account.plan === 'pro') throw new Error('You already have Pro on this account.');
  const key = normalizeKey_(rawKey);

  const properties = PropertiesService.getScriptProperties();
  const failKey = 'rf:' + todayText_() + ':' + userHash_(account.email);
  const failures = Number(properties.getProperty(failKey) || 0);
  if (failures >= ACCESS.maxRedeemFailuresPerDay) {
    throw new Error('Too many tries today. Try again tomorrow, or request a new key.');
  }
  const fail = function () {
    properties.setProperty(failKey, String(failures + 1));
    logAccess_('redeem-failed', account.email, '');
    return new Error('That key is not valid for this account. Check it and try again.');
  };
  if (!ACCESS.keyPattern.test(key)) throw fail();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = accessSheet_(ACCESS.sheets.keys);
    const last = sheet.getLastRow();
    if (last < 2) throw fail();
    const rows = sheet.getRange(2, 1, last - 1, 8).getValues();
    const keyId = key.split('-')[1];
    const hash = keyHash_(key);

    // One active key per account.
    if (rows.some(function (r) { return normalizedText_(r[3]).toLowerCase() === account.email && r[2] === ACCESS.keyStatus.active; })) {
      throw new Error('This account already has an active key.');
    }

    const index = rows.findIndex(function (r) { return String(r[0]) === keyId && safeEqual_(String(r[1]), hash); });
    if (index === -1) throw fail();
    const row = rows[index];
    const owner = normalizedText_(row[3]).toLowerCase();
    const usable = row[2] === ACCESS.keyStatus.unused ||
      (row[2] === ACCESS.keyStatus.reserved && owner === account.email);
    if (!usable) throw fail();

    sheet.getRange(index + 2, 3, 1, 4).setValues([[ACCESS.keyStatus.active, account.email, row[4], new Date()]]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  clearPlanCache_(account.email);
  logAccess_('redeemed', account.email, key.split('-')[1]);
  return proStatus_(account.email);
}


function normalizeKey_(raw) {
  const compact = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0').replace(/[IL]/g, '1');
  const body = compact.indexOf(ACCESS.keyPrefix) === 0 ? compact.slice(ACCESS.keyPrefix.length) : compact;
  if (body.length !== 12) return String(raw || '');
  return [ACCESS.keyPrefix, body.slice(0, 4), body.slice(4, 8), body.slice(8, 12)].join('-');
}


/** Makes a new key, stores only its hash, and returns the plain key once. */
function createKey_(assignTo, note) {
  const sheet = accessSheet_(ACCESS.sheets.keys);
  const existingIds = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
    : [];
  let key, keyId;
  do {
    key = randomKey_();
    keyId = key.split('-')[1];
  } while (existingIds.indexOf(keyId) !== -1);
  sheet.appendRow([
    keyId,
    keyHash_(key),
    assignTo ? ACCESS.keyStatus.reserved : ACCESS.keyStatus.unused,
    assignTo || '',
    new Date(),
    '',
    '',
    safeSheetText_(note || ''),
  ]);
  return { key: key, keyId: keyId };
}


function randomKey_() {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Utilities.getUuid() + Date.now());
  let chars = '';
  for (let i = 0; i < 12; i++) chars += ACCESS.keyAlphabet[(bytes[i] + 256) % 32];
  return [ACCESS.keyPrefix, chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].join('-');
}


function keyHash_(key) {
  return sha256_(pepper_() + '|key|' + key);
}


function pepper_() {
  const properties = PropertiesService.getScriptProperties();
  let pepper = properties.getProperty(ACCESS.properties.pepper);
  if (!pepper) {
    pepper = sha256_(Utilities.getUuid() + Utilities.getUuid() + Date.now());
    properties.setProperty(ACCESS.properties.pepper, pepper);
  }
  return pepper;
}


function sha256_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8));
}


/** Compares two strings in time that does not depend on where they differ. */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}


// --- ACCESS REQUESTS ---

/** Called from the portal: records a request and emails the owner. */
function submitAccessRequest_(account, form) {
  const clean = function (value, max) { return normalizedText_(value).replace(/[\u0000-\u001f]/g, ' ').slice(0, max); };
  // A hidden field people never see; bots tend to fill it.
  if (clean(form.website, 50)) return { ok: true };

  const request = {
    name: clean(form.name, 80),
    organization: clean(form.organization, 120),
    role: clean(form.role, 80),
    contact: clean(form.contact, 30),
    purpose: clean(form.purpose, 600),
  };
  const missing = ['name', 'organization', 'purpose'].filter(function (f) { return !request[f]; });
  if (missing.length) throw new Error('Fill in your name, organization and what you need Pro for.');

  const properties = PropertiesService.getScriptProperties();
  const globalKey = 'u:' + todayText_() + ':requests';
  const globalCount = Number(properties.getProperty(globalKey) || 0);
  if (globalCount >= ACCESS.maxRequestsPerDayGlobal) {
    throw new Error('Requests are paused for today. Try again tomorrow.');
  }
  // Check the daily cap before saving anything, but only use it up once the
  // request is safely in the sheet.
  const used = usageToday_(account).request || 0;
  if (used >= (PLANS[account.plan].limits.request || 0)) {
    throw new Error('You already sent a request today. If it is approved, the key is emailed to ' + account.email + '.');
  }
  const sheet = accessSheet_(ACCESS.sheets.requests, true);
  if (!sheet) throw new Error('Pro requests are not open yet. Try again later.');
  sheet.appendRow([new Date(), account.email, safeSheetText_(request.name), safeSheetText_(request.organization),
    safeSheetText_(request.role), safeSheetText_(request.contact), safeSheetText_(request.purpose), 'New', '', '']);
  SpreadsheetApp.flush();
  consume_(account, 'request');
  properties.setProperty(globalKey, String(globalCount + 1));

  // The email is a heads-up only. The request is already saved, so a mail
  // problem (quota, permissions) must not fail it.
  try {
    notifyAccessRequest_(account, request, sheet.getParent().getUrl());
  } catch (error) {
    logAccess_('notify-failed', account.email, String(error && error.message || error).slice(0, 200));
  }
  logAccess_('requested', account.email, '');
  return { ok: true };
}


function notifyAccessRequest_(account, request, backendUrl) {
  const properties = PropertiesService.getScriptProperties();
  const notify = properties.getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
  const mail = emailAccessRequestToOwner_(account, request, backendUrl);
  sendDesignedEmail_({ to: notify, replyTo: account.email, subject: mail.subject, html: mail.html, text: mail.text });
  // A receipt for the student, so they know it went through.
  const receipt = emailAccessRequestReceipt_(account, request, ScriptApp.getService().getUrl());
  sendDesignedEmail_({ to: account.email, replyTo: notify, subject: receipt.subject, html: receipt.html, text: receipt.text });
}


/**
 * A token that ties a form post to the signed-in person and today's date, so
 * another site can't post forms in someone's name.
 */
function formToken_(email, dayOffset) {
  const day = Utilities.formatDate(addDays_(new Date(), dayOffset || 0), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return sha256_(pepper_() + '|form|' + String(email).toLowerCase() + '|' + day).slice(0, 32);
}


function checkFormToken_(email, token) {
  const given = String(token || '');
  return Boolean(email) && given.length === 32 &&
    (safeEqual_(given, formToken_(email, 0)) || safeEqual_(given, formToken_(email, -1)));
}


// --- OWNER MENU ---

function setupAccessBackend() {
  assertOwner_();
  const properties = PropertiesService.getScriptProperties();
  const owner = activeEmail_();
  if (!properties.getProperty(ACCESS.properties.owner)) properties.setProperty(ACCESS.properties.owner, owner);
  if (!properties.getProperty(ACCESS.properties.notify)) properties.setProperty(ACCESS.properties.notify, ACCESS.defaultNotifyEmail);
  pepper_();

  let ss = null;
  const id = properties.getProperty(ACCESS.properties.sheetId);
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (error) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('HE Venue Explorer - Access (private)');
    properties.setProperty(ACCESS.properties.sheetId, ss.getId());
  }

  const tabs = [
    [ACCESS.sheets.keys, ['Key ID', 'Key hash', 'Status', 'Assigned to', 'Created', 'Activated', 'Expires', 'Note'],
      [90, 200, 100, 260, 150, 150, 120, 260]],
    [ACCESS.sheets.requests, ['Received', 'Email', 'Name', 'Organization', 'Role', 'Contact', 'Purpose', 'Status', 'Key ID', 'Notes'],
      [150, 260, 160, 180, 120, 120, 360, 100, 90, 200]],
    [ACCESS.sheets.log, ['When', 'Event', 'Email', 'Detail'], [150, 140, 260, 200]],
  ];
  tabs.forEach(function (tab) {
    let sheet = ss.getSheetByName(tab[0]);
    if (!sheet) sheet = ss.insertSheet(tab[0]);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, tab[1].length).setValues([tab[1]]);
    sheet.getRange(1, 1, 1, tab[1].length).setFontWeight('bold').setBackground('#16161a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    tab[2].forEach(function (width, i) { sheet.setColumnWidth(i + 1, width); });
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  ss.getSheetByName(ACCESS.sheets.keys).getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(ACCESS.keyStatus).map(function (k) { return ACCESS.keyStatus[k]; }), true)
    .setAllowInvalid(false).build());
  ss.getSheetByName(ACCESS.sheets.keys).getRange('A1').setNote(
    'Keys are stored as hashes. The plain key is shown once when it is made. ' +
    'Set Status to Revoked to remove access (takes effect within 5 minutes).');
  ss.getSheetByName(ACCESS.sheets.requests).getRange('H2:H').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(ACCESS.requestStatus, true).setAllowInvalid(false).build());

  showLinkDialog_('Access backend ready',
    'The private access sheet is set up. Keep it unshared.', ss.getUrl(), 'Open the access sheet');
}


function openAccessBackend() {
  assertOwner_();
  const id = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.sheetId);
  if (!id) throw new Error('Run Access keys > Set up access backend first.');
  showLinkDialog_('Access backend', 'Keys, requests and the access log.', SpreadsheetApp.openById(id).getUrl(), 'Open the access sheet');
}


function generateAccessKeys() {
  assertOwner_();
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('Generate access keys', 'How many keys? (1 to 20)', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const count = Math.min(20, Math.max(1, Math.floor(Number(answer.getResponseText())) || 0));
  if (!count) return;
  const keys = [];
  for (let i = 0; i < count; i++) keys.push(createKey_('', 'Generated ' + todayText_()).key);
  logAccess_('generated', activeEmail_(), String(count));
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;line-height:1.5">' +
    '<p><b>Copy these now.</b> Only their hashes are saved, so they cannot be shown again.</p>' +
    '<textarea style="width:100%;height:220px;font:13px monospace" readonly>' + keys.join('\n') + '</textarea>' +
    '<p>Each key unlocks Pro for the first account that redeems it.</p></div>'
  ).setWidth(420).setHeight(360);
  ui.showModalDialog(html, 'New access keys');
}


/**
 * For every request marked Approve: makes a key bound to that person's
 * account and emails it to them. The key only works for that account.
 */
function sendKeysToApprovedRequests() {
  assertOwner_();
  const sheet = accessSheet_(ACCESS.sheets.requests);
  const last = sheet.getLastRow();
  if (last < 2) { SpreadsheetApp.getActiveSpreadsheet().toast('No requests yet.', 'Access keys', 5); return; }
  const rows = sheet.getRange(2, 1, last - 1, 10).getValues();
  const portalUrl = ScriptApp.getService().getUrl();
  let sent = 0, skipped = 0;

  rows.forEach(function (row, i) {
    if (row[7] !== 'Approve' || row[8]) return;
    const email = normalizedText_(row[1]).toLowerCase();
    if (!email.endsWith('@' + ACCESS.domain) || proStatus_(email)) {
      sheet.getRange(i + 2, 8, 1, 3).setValues([['Declined', '', 'Skipped: not a student account or already Pro']]);
      skipped++;
      return;
    }
    const made = createKey_(email, 'Request from ' + row[2]);
    const mail = emailAccessKey_(row[2], email, made.key, portalUrl);
    const notify = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
    sendDesignedEmail_({ to: email, replyTo: notify, subject: mail.subject, html: mail.html, text: mail.text });
    sheet.getRange(i + 2, 8, 1, 2).setValues([['Sent', made.keyId]]);
    logAccess_('key-sent', email, made.keyId);
    sent++;
  });
  SpreadsheetApp.getActiveSpreadsheet().toast(
    sent + ' key(s) sent' + (skipped ? ', ' + skipped + ' skipped' : '') + '.', 'Access keys', 8);
}


function revokeAccess() {
  assertOwner_();
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('Revoke Pro access', 'Account email to revoke:', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const email = normalizedText_(answer.getResponseText()).toLowerCase();
  if (!email) return;
  const sheet = accessSheet_(ACCESS.sheets.keys);
  let count = 0;
  if (sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    values.forEach(function (row, i) {
      if (normalizedText_(row[3]).toLowerCase() === email &&
        (row[2] === ACCESS.keyStatus.active || row[2] === ACCESS.keyStatus.reserved)) {
        sheet.getRange(i + 2, 3).setValue(ACCESS.keyStatus.revoked);
        count++;
      }
    });
  }
  clearPlanCache_(email);
  logAccess_('revoked', email, String(count));
  ui.alert(count ? 'Revoked ' + count + ' key(s) for ' + email + '.' : 'No active keys found for ' + email + '.');
}


// --- BACKEND HELPERS ---

function accessSheet_(name, optional) {
  const id = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.sheetId);
  if (!id) {
    if (optional) return null;
    throw new Error('Pro access is not set up yet.');
  }
  return SpreadsheetApp.openById(id).getSheetByName(name);
}


function logAccess_(event, email, detail) {
  try {
    const sheet = accessSheet_(ACCESS.sheets.log, true);
    if (sheet) sheet.appendRow([new Date(), event, email, safeSheetText_(detail)]);
  } catch (error) {
    console.warn('Access log failed: ' + error.message);
  }
}


function showLinkDialog_(title, text, url, label) {
  const html = HtmlService.createHtmlOutput(
    '<p style="font:14px Arial">' + text + '</p>' +
    '<p style="font:14px Arial"><a href="' + url + '" target="_blank" rel="noopener">' + label + '</a></p>'
  ).setWidth(380).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}


// --- ISSUE REPORTS ---

const ISSUES = Object.freeze({
  // kind: [label shown to people, page tone]
  kinds: Object.freeze({
    bug: 'Something is broken',
    data: 'Wrong room info',
    form: 'Request form problem',
    idea: 'Idea or request',
    other: 'Something else',
  }),
  pages: Object.freeze({ '': 'Home', find: 'Find a slot', schedule: 'Schedule', venues: 'Venues', book: 'Book', access: 'Plan', report: 'Report' }),
  maxPerUserPerDay: 5,
  maxPerDayGlobal: 80,
  sheetName: 'Issues',
});


/** Saves a report, emails it to the owner, and optionally a copy to the reporter. */
function submitIssue_(account, form) {
  const clean = function (value, max) { return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, max); };
  if (clean(form.website, 50)) return { ok: true, id: 'HE-0' };  // honeypot

  const kind = ISSUES.kinds[form.kind] ? form.kind : 'other';
  const message = clean(form.message, 2000);
  if (message.length < 10) throw new Error('Tell us a little more, at least a sentence.');
  const withDetails = String(form.details) === 'on' || form.details === true;
  const page = Object.prototype.hasOwnProperty.call(ISSUES.pages, form.page) ? form.page : '';

  const properties = PropertiesService.getScriptProperties();
  const userKey = 'iss:' + todayText_() + ':' + userHash_(account.email);
  const globalKey = 'iss:' + todayText_() + ':all';
  const mine = Number(properties.getProperty(userKey) || 0);
  const all = Number(properties.getProperty(globalKey) || 0);
  if (mine >= ISSUES.maxPerUserPerDay) throw new Error('You have sent ' + ISSUES.maxPerUserPerDay + ' reports today. Try again tomorrow, or reply to an earlier report email.');
  if (all >= ISSUES.maxPerDayGlobal) throw new Error('Reports are paused for today. Try again tomorrow.');

  const now = new Date();
  const issue = {
    id: 'HE-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMdd') + '-' + randomKey_().split('-')[1],
    kind: kind,
    category: ISSUES.kinds[kind],
    message: message,
    pageLabel: ISSUES.pages[page],
    when: Utilities.formatDate(now, Session.getScriptTimeZone(), 'EEE d MMM yyyy, h:mm a'),
    lastError: withDetails ? clean(form.lastError, 300) : '',
    browser: withDetails ? clean(form.browser, 160) : '',
    screen: withDetails ? clean(form.screen, 30) : '',
  };

  // Keep a record in the access sheet when it exists.
  const book = accessSheet_(ACCESS.sheets.log, true);
  if (book) {
    const ss = book.getParent();
    const sheet = ss.getSheetByName(ISSUES.sheetName) || (function () {
      const created = ss.insertSheet(ISSUES.sheetName);
      created.appendRow(['When', 'ID', 'Email', 'Plan', 'Type', 'Page', 'Message', 'Last error', 'Browser', 'Status']);
      created.setFrozenRows(1);
      created.getRange('A1:J1').setFontWeight('bold');
      return created;
    })();
    sheet.appendRow([now, issue.id, account.email, account.plan, issue.category, issue.pageLabel, safeSheetText_(issue.message),
      safeSheetText_(issue.lastError), safeSheetText_(issue.browser), 'New']);
  }
  properties.setProperty(userKey, String(mine + 1));
  properties.setProperty(globalKey, String(all + 1));

  const notify = properties.getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
  const mail = emailIssueToOwner_(account, issue);
  sendDesignedEmail_({ to: notify, replyTo: account.email, subject: mail.subject, html: mail.html, text: mail.text });
  if (String(form.copy) === 'on' || form.copy === true) {
    try {
      const receipt = emailIssueReceipt_(account, issue, ScriptApp.getService().getUrl());
      sendDesignedEmail_({ to: account.email, replyTo: notify, subject: receipt.subject, html: receipt.html, text: receipt.text });
    } catch (error) {
      logAccess_('issue-copy-failed', account.email, String(error && error.message || error).slice(0, 200));
    }
  }
  logAccess_('issue', account.email, issue.id);
  return { ok: true, id: issue.id };
}
