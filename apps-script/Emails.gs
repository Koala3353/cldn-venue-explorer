/**
 * HE Venue Explorer - email kit.
 *
 * Every email the project sends is built here, so they share one look:
 * navy ink, one lime accent, a white card on a cool grey page.
 *
 * Email apps are not browsers. Gmail strips <svg>, <style> in some places,
 * flexbox, grid and data: images, so everything is built from tables with
 * inline styles. The logo is a tiny calendar made of table cells, which
 * renders the same in Gmail, Apple Mail and Outlook. Each email also has a
 * plain-text version for clients that don't show HTML.
 */

const EMAIL = Object.freeze({
  senderName: 'HE Venue Explorer',
  navy: '#17191c',
  ink2: '#5a5f66',
  muted: '#8a8e94',
  lime: '#c94a0a',
  limeSoft: '#fbe9df',
  limeText: '#a63c07',
  page: '#f1f1ef',
  card: '#ffffff',
  line: '#e4e4e1',
  sunk: '#f6f6f4',
  bad: '#b42318',
  badSoft: '#ffe4e0',
  font: "'Geist','Helvetica Neue',Helvetica,Arial,sans-serif",
  mono: "'Geist Mono','SF Mono',Menlo,Consolas,monospace",
});


/** Sends one email built with emailLayout_. options: { to, replyTo, subject, html, text, cc } */
function sendDesignedEmail_(options) {
  MailApp.sendEmail({
    to: options.to,
    cc: options.cc || undefined,
    replyTo: options.replyTo || undefined,
    subject: options.subject,
    body: options.text,
    htmlBody: options.html,
    name: EMAIL.senderName,
  });
}


/** Escapes text for HTML and keeps line breaks. */
function emailText_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '<br>');
}


/**
 * The page around every email.
 * parts: { preheader, badge, title, intro, body (html), cta: { label, url }, note, footer }
 */
function emailLayout_(parts) {
  const E = EMAIL;
  const badge = parts.badge
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px"><tr>' +
      '<td style="background:' + (parts.badgeTone === 'bad' ? E.badSoft : E.limeSoft) + ';color:' + (parts.badgeTone === 'bad' ? E.bad : E.limeText) +
      ';font:700 11px/1 ' + E.font + ';letter-spacing:.08em;text-transform:uppercase;padding:7px 11px;border-radius:99px">' + emailText_(parts.badge) + '</td></tr></table>'
    : '';
  const cta = parts.cta ? emailButton_(parts.cta.label, parts.cta.url) : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">' +
    '<title>' + emailText_(parts.title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + E.page + ';-webkit-text-size-adjust:100%">' +
    // Preview text in the inbox list; hidden in the email itself.
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:' + E.page + '">' + emailText_(parts.preheader || '') +
      '&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + E.page + '">' +
    '<tr><td align="center" style="padding:32px 14px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">' +
        // Header: logo and wordmark
        '<tr><td style="padding:0 6px 18px">' + emailLogo_() + '</td></tr>' +
        // Card
        '<tr><td style="background:' + E.card + ';border:1px solid ' + E.line + ';border-radius:22px;overflow:hidden">' +
          // Lime strip across the top of the card
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td style="height:6px;line-height:6px;font-size:0;background:' + E.lime + '">&nbsp;</td>' +
            '<td width="22%" style="height:6px;line-height:6px;font-size:0;background:' + E.navy + '">&nbsp;</td></tr></table>' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:34px 34px 30px">' +
            badge +
            '<h1 style="margin:0 0 12px;font:800 28px/1.15 ' + E.font + ';letter-spacing:-.02em;color:' + E.navy + '">' + emailText_(parts.title) + '</h1>' +
            (parts.intro ? '<p style="margin:0 0 22px;font:400 16px/1.6 ' + E.font + ';color:' + E.ink2 + '">' + parts.intro + '</p>' : '') +
            (parts.body || '') +
            cta +
            (parts.note ? '<p style="margin:24px 0 0;font:400 13px/1.6 ' + E.font + ';color:' + E.muted + '">' + parts.note + '</p>' : '') +
          '</td></tr></table>' +
        '</td></tr>' +
        // Footer
        '<tr><td style="padding:22px 10px 0;font:400 12px/1.6 ' + E.font + ';color:' + E.muted + ';text-align:center">' +
          (parts.footer || 'Sent by HE Venue Explorer, a student-made tool for finding free rooms at the Ateneo HE venues.') +
          '<br>Made by Keene Brigado. Special thanks to David Yu.' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>';
}


/** A tiny calendar made of table cells, with the wordmark beside it. */
function emailLogo_() {
  const E = EMAIL;
  const cell = function (color) {
    return '<td width="7" height="6" style="width:7px;height:6px;line-height:6px;font-size:0;background:' + color + ';border-radius:2px">&nbsp;</td>';
  };
  const gap = '<td width="3" style="width:3px;font-size:0">&nbsp;</td>';
  const icon =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:' + E.navy + ';border-radius:9px">' +
      '<tr><td style="padding:9px 7px 7px">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
          '<tr>' + cell('#3a3d42') + gap + cell(E.lime) + gap + cell('#3a3d42') + '</tr>' +
          '<tr><td colspan="5" style="height:3px;font-size:0;line-height:3px">&nbsp;</td></tr>' +
          '<tr>' + cell(E.lime) + gap + cell('#3a3d42') + gap + cell(E.lime) + '</tr>' +
        '</table>' +
      '</td></tr></table>';
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td valign="middle">' + icon + '</td>' +
    '<td valign="middle" style="padding-left:10px;font:800 17px/1 ' + E.font + ';letter-spacing:-.02em;color:' + E.navy + '">Venue Explorer</td>' +
  '</tr></table>';
}


/** A button that works in every email app, Outlook included. */
function emailButton_(label, url) {
  const E = EMAIL;
  if (!url) return '';
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0"><tr>' +
    '<td align="center" bgcolor="' + E.navy + '" style="border-radius:99px;background:' + E.navy + '">' +
      '<a href="' + emailText_(url) + '" target="_blank" style="display:inline-block;padding:14px 26px;font:700 15px/1 ' + E.font +
        ';color:#ffffff;text-decoration:none;border-radius:99px">' + emailText_(label) + ' &rarr;</a>' +
    '</td></tr></table>';
}


/** Label and value rows inside a soft panel. rows: [[label, value(text)], ...] */
function emailDetails_(rows, title) {
  const E = EMAIL;
  const body = rows.filter(function (r) { return r && r[1] !== undefined && r[1] !== null && String(r[1]) !== ''; }).map(function (r, i) {
    return '<tr>' +
      '<td valign="top" style="padding:11px 0;' + (i ? 'border-top:1px solid ' + E.line + ';' : '') + 'width:38%;font:600 13px/1.5 ' + E.font + ';color:' + E.muted + '">' + emailText_(r[0]) + '</td>' +
      '<td valign="top" style="padding:11px 0;' + (i ? 'border-top:1px solid ' + E.line + ';' : '') + 'font:600 14px/1.5 ' + E.font + ';color:' + E.navy + ';word-break:break-word">' + emailText_(r[1]) + '</td>' +
    '</tr>';
  }).join('');
  return (title ? '<p style="margin:0 0 8px;font:700 12px/1 ' + E.font + ';letter-spacing:.06em;text-transform:uppercase;color:' + E.muted + '">' + emailText_(title) + '</p>' : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + E.sunk + ';border-radius:16px;margin:0 0 18px">' +
      '<tr><td style="padding:6px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + body + '</table></td></tr>' +
    '</table>';
}


/** Someone's own words, set off with a lime rule. */
function emailQuote_(text, title) {
  const E = EMAIL;
  return (title ? '<p style="margin:0 0 8px;font:700 12px/1 ' + E.font + ';letter-spacing:.06em;text-transform:uppercase;color:' + E.muted + '">' + emailText_(title) + '</p>' : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr>' +
      '<td width="4" style="width:4px;background:' + E.lime + ';border-radius:4px;font-size:0">&nbsp;</td>' +
      '<td style="padding:4px 0 4px 16px;font:400 15px/1.65 ' + E.font + ';color:' + E.navy + '">' + emailText_(text) + '</td>' +
    '</tr></table>';
}


/** The access key, big and easy to copy. */
function emailKeyBlock_(key) {
  const E = EMAIL;
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px"><tr>' +
    '<td align="center" style="background:' + E.navy + ';border-radius:18px;padding:26px 16px">' +
      '<p style="margin:0 0 10px;font:700 11px/1 ' + E.font + ';letter-spacing:.14em;text-transform:uppercase;color:#9aa4c4">Your access key</p>' +
      '<p style="margin:0;font:700 26px/1.2 ' + E.mono + ';letter-spacing:.08em;color:#ff9b6b;word-break:break-all">' + emailText_(key) + '</p>' +
    '</td></tr></table>';
}


/** Numbered steps. steps: [html, ...] */
function emailSteps_(steps) {
  const E = EMAIL;
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px">' +
    steps.map(function (step, i) {
      return '<tr>' +
        '<td width="34" valign="top" style="padding:0 0 14px">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td width="26" height="26" align="center" style="width:26px;height:26px;border-radius:99px;background:' + E.lime + ';font:800 13px/26px ' + E.font + ';color:#ffffff">' + (i + 1) + '</td>' +
          '</tr></table>' +
        '</td>' +
        '<td valign="top" style="padding:3px 0 14px 8px;font:400 15px/1.55 ' + E.font + ';color:' + E.ink2 + '">' + step + '</td>' +
      '</tr>';
    }).join('') + '</table>';
}


// --- THE EMAILS ---

/** To the owner: someone asked for a Pro key. */
function emailAccessRequestToOwner_(account, request, backendUrl) {
  const html = emailLayout_({
    preheader: request.name + ' from ' + request.organization + ' wants a Pro key.',
    badge: 'New Pro request',
    title: request.name + ' wants a Pro key',
    intro: emailText_(request.organization) + (request.role ? ', ' + emailText_(request.role) : '') + '. Reply to this email to reach them directly.',
    body: emailDetails_([
      ['Name', request.name], ['Account', account.email], ['Organization', request.organization],
      ['Role', request.role || 'Not given'], ['Contact number', request.contact || 'Not given'],
    ]) + emailQuote_(request.purpose, 'What they need it for') +
      emailSteps_([
        'Open the <strong style="color:' + EMAIL.navy + '">Requests</strong> tab and set Status to <strong style="color:' + EMAIL.navy + '">Approve</strong>.',
        'In the sheet, use <strong style="color:' + EMAIL.navy + '">Access keys &rsaquo; Send keys to approved requests</strong>. The key is emailed to them.',
      ]),
    cta: backendUrl ? { label: 'Open the Requests tab', url: backendUrl } : null,
  });
  const text = [
    'New Pro access request', '',
    'Name: ' + request.name, 'Account: ' + account.email, 'Organization: ' + request.organization,
    'Role: ' + (request.role || '-'), 'Contact number: ' + (request.contact || '-'), '',
    'What they need it for:', request.purpose, '',
    'To approve: open the Requests tab, set Status to Approve, then use',
    'Access keys > Send keys to approved requests.', backendUrl || '',
  ].join('\n');
  return { subject: 'Pro request: ' + request.name + ' (' + request.organization + ')', html: html, text: text };
}


/** To the student: we got your request. */
function emailAccessRequestReceipt_(account, request, portalUrl) {
  const html = emailLayout_({
    preheader: 'Your Pro request is in. If it is approved, your key arrives in this inbox.',
    badge: 'Request received',
    title: 'Thanks, ' + firstName_(request.name) + '. Your request is in.',
    intro: 'We got your request for HE Venue Explorer Pro. Requests are checked by hand, usually within a few days.',
    body: emailDetails_([['Organization', request.organization], ['Account', account.email]], 'What you sent') +
      emailSteps_([
        'If it is approved, a key like <span style="font-family:' + EMAIL.mono + ';color:' + EMAIL.navy + '">HEVX-XXXX-XXXX-XXXX</span> is emailed here.',
        'Open the portal, go to <strong style="color:' + EMAIL.navy + '">Plan</strong>, and paste it.',
        'The key only works with ' + emailText_(account.email) + '.',
      ]),
    cta: portalUrl ? { label: 'Open the portal', url: portalUrl } : null,
    note: 'You can keep using the free plan while you wait.',
  });
  const text = [
    'Hi ' + firstName_(request.name) + ',', '',
    'We got your request for HE Venue Explorer Pro. Requests are checked by hand, usually within a few days.',
    'If it is approved, your key is emailed to ' + account.email + '. Paste it on the Plan page.', '',
    portalUrl || '',
  ].join('\n');
  return { subject: 'We got your Pro request', html: html, text: text };
}


/** To the student: here is your key. */
function emailAccessKey_(name, email, key, portalUrl) {
  const planUrl = portalUrl ? portalUrl + '?view=access' : '';
  const html = emailLayout_({
    preheader: 'Your HE Venue Explorer Pro key is inside. It only works with ' + email + '.',
    badge: 'Pro unlocked',
    title: 'Your Pro key is here, ' + firstName_(name) + '.',
    intro: 'Pro gives you 14-day searches, saved org profiles and a CFMO request form that fills itself in.',
    body: emailKeyBlock_(key) +
      emailSteps_([
        'Open the portal and go to <strong style="color:' + EMAIL.navy + '">Plan</strong>.',
        'Paste the key under <strong style="color:' + EMAIL.navy + '">Have a key?</strong> and press Unlock Pro.',
        'That is it. The key is now tied to ' + emailText_(email) + ' and won\'t work for anyone else.',
      ]),
    cta: planUrl ? { label: 'Unlock Pro', url: planUrl } : null,
    note: 'Keep the key to yourself. If it stops working, reply to this email.',
  });
  const text = [
    'Hi ' + firstName_(name) + ',', '',
    'Your Pro access key for HE Venue Explorer:', '', '    ' + key, '',
    'It only works with ' + email + '.',
    'Open the portal, go to Plan, and paste the key.', planUrl, '',
    'Keep the key to yourself. If it stops working, reply to this email.',
  ].join('\n');
  return { subject: 'Your HE Venue Explorer Pro key', html: html, text: text };
}


/** To the owner: someone reported an issue. */
function emailIssueToOwner_(account, issue) {
  const html = emailLayout_({
    preheader: issue.category + ': ' + issue.message.slice(0, 90),
    badge: issue.category,
    badgeTone: issue.kind === 'bug' || issue.kind === 'form' ? 'bad' : 'ok',
    title: 'New issue ' + issue.id,
    intro: 'From ' + emailText_(account.email) + ' on the ' + emailText_(issue.pageLabel) + ' page. Reply to this email to answer them.',
    body: emailQuote_(issue.message, 'What happened') +
      emailDetails_([
        ['Reported by', account.email], ['Plan', account.plan === 'pro' ? 'Pro' : 'Free'], ['Page', issue.pageLabel],
        ['When', issue.when], ['Last error', issue.lastError], ['Browser', issue.browser], ['Screen', issue.screen],
      ], 'Details'),
    note: 'Issue ID ' + emailText_(issue.id) + '. It is also logged in the Issues tab of the access sheet.',
  });
  const text = [
    'New issue ' + issue.id + ' (' + issue.category + ')', '',
    'From: ' + account.email + ' (' + account.plan + ')', 'Page: ' + issue.pageLabel, 'When: ' + issue.when, '',
    issue.message, '',
    issue.lastError ? 'Last error: ' + issue.lastError : '', issue.browser ? 'Browser: ' + issue.browser : '',
    issue.screen ? 'Screen: ' + issue.screen : '',
  ].filter(function (line, i, all) { return line !== '' || all[i - 1] !== ''; }).join('\n');
  return { subject: '[' + issue.category + '] ' + issue.message.replace(/\s+/g, ' ').slice(0, 60) + ' (' + issue.id + ')', html: html, text: text };
}


/** To the reporter, if they asked for a copy. */
function emailIssueReceipt_(account, issue, portalUrl) {
  const html = emailLayout_({
    preheader: 'We got your report ' + issue.id + '. Thanks for flagging it.',
    badge: 'Report received',
    title: 'Thanks for the heads-up.',
    intro: 'Your report is with the person who runs HE Venue Explorer. If they need more details, they will reply to this email.',
    body: emailQuote_(issue.message, 'What you sent') +
      emailDetails_([['Report ID', issue.id], ['Type', issue.category], ['Page', issue.pageLabel], ['Sent', issue.when]]),
    cta: portalUrl ? { label: 'Back to the portal', url: portalUrl } : null,
  });
  const text = [
    'Thanks for the heads-up.', '',
    'Your report ' + issue.id + ' (' + issue.category + ') was sent:', '', issue.message, '',
    'If more details are needed, you will get a reply to this email.', portalUrl || '',
  ].join('\n');
  return { subject: 'We got your report (' + issue.id + ')', html: html, text: text };
}


function firstName_(name) {
  const text = normalizedText_(name);
  // "Chua, Jay Miguel" -> "Jay"; "Jay Miguel Chua" -> "Jay"
  const part = text.indexOf(',') !== -1 ? text.split(',')[1] : text;
  return normalizedText_(part).split(' ')[0] || 'there';
}


/** Owner tool: emails one sample of each design to the notify address. */
function sendEmailPreviews() {
  assertOwner_();
  const to = PropertiesService.getScriptProperties().getProperty(ACCESS.properties.notify) || ACCESS.defaultNotifyEmail;
  const portalUrl = ScriptApp.getService().getUrl();
  const account = { email: 'juan.delacruz@student.ateneo.edu', plan: 'free' };
  const request = { name: 'Juan Dela Cruz', organization: 'Ateneo MEA', role: 'Logistics head', contact: '09171234567',
    purpose: 'Weekly GA bookings and room requests for our core team activities.' };
  const issue = { id: 'HE-SAMPLE', kind: 'bug', category: 'Something is broken', pageLabel: 'Find a slot',
    message: 'Sample report: the search kept loading for CTC rooms on Friday.', when: new Date().toString(),
    lastError: '', browser: 'Chrome on macOS', screen: '1440x900' };
  [
    emailAccessRequestToOwner_(account, request, 'https://docs.google.com/spreadsheets/'),
    emailAccessRequestReceipt_(account, request, portalUrl),
    emailAccessKey_(request.name, account.email, 'HEVX-SAMP-LEKE-Y000', portalUrl),
    emailIssueToOwner_(account, issue),
    emailIssueReceipt_(account, issue, portalUrl),
  ].forEach(function (mail) {
    sendDesignedEmail_({ to: to, subject: '[Preview] ' + mail.subject, html: mail.html, text: mail.text });
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Sent 5 sample emails to ' + to + '.', 'Email previews', 6);
}


/** Owner's daily digest of portal activity. rows follow ACTIVITY.header. */
function emailActivityReport_(rows, from, to) {
  const E = EMAIL;
  const tz = Session.getScriptTimeZone();
  const fmt = function (d, p) { return Utilities.formatDate(d, tz, p); };
  const by = function (kind) { return rows.filter(function (r) { return r[3] === kind; }); };
  const links = by('link'), searches = by('search'), schedules = by('schedule'), checks = by('check');
  const errors = rows.filter(function (r) { return r[4] === 'error'; });
  const refused = rows.filter(function (r) { return r[4] === 'refused'; });
  const outside = links.filter(function (r) { return r[4] === 'ok' && r[8] === 'Yes'; });
  const people = {};
  rows.forEach(function (r) { people[r[1]] = true; });
  const peopleCount = Object.keys(people).length;

  function stat(n, label, tone) {
    return '<td width="25%" style="padding:14px 10px;text-align:center;border-radius:14px;background:' + (tone ? E.limeSoft : E.sunk) + '">' +
      '<p style="margin:0;font:800 26px/1 ' + E.font + ';color:' + (tone ? E.limeText : E.navy) + '">' + n + '</p>' +
      '<p style="margin:6px 0 0;font:600 11px/1.3 ' + E.font + ';color:' + E.muted + ';text-transform:uppercase;letter-spacing:.05em">' + emailText_(label) + '</p></td>';
  }
  function heading(text) {
    return '<p style="margin:22px 0 8px;font:700 12px/1 ' + E.font + ';letter-spacing:.06em;text-transform:uppercase;color:' + E.muted + '">' + emailText_(text) + '</p>';
  }
  function list(items) {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + E.sunk + ';border-radius:16px;margin:0 0 6px">' +
      '<tr><td style="padding:4px 18px">' + items.map(function (it, i) {
        return '<div style="padding:11px 0;' + (i ? 'border-top:1px solid ' + E.line + ';' : '') + '">' +
          '<p style="margin:0;font:700 14px/1.4 ' + E.font + ';color:' + E.navy + '">' + it.title + '</p>' +
          (it.sub ? '<p style="margin:3px 0 0;font:500 13px/1.5 ' + E.font + ';color:' + E.ink2 + ';word-break:break-word">' + it.sub + '</p>' : '') + '</div>';
      }).join('') + '</td></tr></table>';
  }
  function flag(text, bad) {
    return '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font:700 11px/1.5 ' + E.font + ';background:' +
      (bad ? E.badSoft : E.limeSoft) + ';color:' + (bad ? E.bad : E.limeText) + '">' + emailText_(text) + '</span>';
  }
  const when = function (r) { return fmt(r[0], 'EEE h:mm a'); };

  let body = '<table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0" style="margin:0 -6px 6px"><tr>' +
    stat(peopleCount, peopleCount === 1 ? 'person' : 'people') + stat(searches.length + schedules.length, 'lookups') +
    stat(links.length, 'autofills') + stat(outside.length, 'outside Celadon', outside.length > 0) + '</tr></table>';

  if (links.length) {
    body += heading('Form autofills');
    body += list(links.map(function (r) {
      const org = r[7] || 'No organization';
      return {
        title: emailText_(org) + ' &nbsp;' + (r[4] !== 'ok' ? flag(r[4] === 'refused' ? 'Refused' : 'Failed', true) : r[8] === 'Yes' ? flag('Outside Celadon', true) : flag('Celadon')),
        sub: emailText_(r[1]) + ' · ' + emailText_(r[5]) + ' · ' + emailText_(r[6]) + (r[9] ? '<br>' + emailText_(r[9]) : '') + '<br>' + emailText_(when(r)),
      };
    }));
  }

  const lookups = searches.concat(schedules, checks);
  if (lookups.length) {
    body += heading('Searches and schedules by person');
    const perPerson = {};
    lookups.forEach(function (r) { (perPerson[r[1]] = perPerson[r[1]] || []).push(r); });
    body += list(Object.keys(perPerson).sort().map(function (email) {
      const mine = perPerson[email];
      const venues = {};
      mine.forEach(function (r) { if (r[5]) venues[r[5]] = true; });
      const lines = mine.slice(0, 8).map(function (r) {
        return emailText_(when(r)) + ' · ' + emailText_(ACTIVITY.kinds[r[3]] || r[3]) + (r[5] ? ' · ' + emailText_(r[5]) : '') +
          (r[6] ? ' · ' + emailText_(r[6]) : '') + (r[3] === 'search' && r[9] ? ' · ' + emailText_(r[9]) : '');
      });
      if (mine.length > 8) lines.push('…and ' + (mine.length - 8) + ' more in the Activity tab');
      return {
        title: emailText_(email) + ' &nbsp;<span style="font-weight:500;color:' + E.muted + '">' + mine.length + ' lookup' + (mine.length === 1 ? '' : 's') +
          (mine[0][2] === 'pro' ? ' · Pro' : ' · Free') + '</span>',
        sub: (Object.keys(venues).length ? 'Venues: ' + emailText_(Object.keys(venues).join(', ')) + '<br>' : '') + lines.join('<br>'),
      };
    }));
  }

  if (errors.length) {
    body += heading('Errors');
    body += list(errors.slice(0, 15).map(function (r) {
      return { title: emailText_(ACTIVITY.kinds[r[3]] || r[3]) + ' · ' + emailText_(r[1]), sub: emailText_(when(r)) + '<br>' + emailText_(r[9]) };
    }));
  }
  if (refused.length) {
    body += '<p style="margin:14px 0 0;font:500 13px/1.5 ' + E.font + ';color:' + E.ink2 + '">' + refused.length +
      ' request' + (refused.length === 1 ? ' was' : 's were') + ' turned away for hitting a daily limit or a Pro-only feature.</p>';
  }

  const range = fmt(from, 'EEE d MMM, h:mm a') + ' to ' + fmt(to, 'h:mm a');
  const subjectBits = [peopleCount + (peopleCount === 1 ? ' person' : ' people'), links.length + ' autofill' + (links.length === 1 ? '' : 's')];
  if (outside.length) subjectBits.push(outside.length + ' outside Celadon');
  if (errors.length) subjectBits.push(errors.length + ' error' + (errors.length === 1 ? '' : 's'));

  const html = emailLayout_({
    preheader: subjectBits.join(', '),
    badge: outside.length ? 'Check autofills' : errors.length ? 'Errors today' : 'Daily activity',
    badgeTone: outside.length || errors.length ? 'bad' : 'ok',
    title: 'Portal activity, ' + fmt(to, 'EEE d MMM'),
    intro: 'Everything people did on HE Venue Explorer from ' + emailText_(range) + '.',
    body: body,
    note: 'Every row is in the Activity tab of the access sheet. Autofills count as Celadon when the organization or event title mentions ' +
      ACTIVITY.homeOrgs.join(' or ') + '.',
  });

  const text = ['Portal activity, ' + fmt(to, 'EEE d MMM') + ' (' + range + ')', subjectBits.join(', '), '',
    'FORM AUTOFILLS'].concat(links.length ? links.map(function (r) {
      return '- ' + (r[7] || 'No organization') + (r[8] === 'Yes' ? ' [OUTSIDE CELADON]' : '') + ' | ' + r[1] + ' | ' + r[5] + ' ' + r[6] + ' | ' + r[4];
    }) : ['- none'], ['', 'LOOKUPS'], lookups.length ? lookups.map(function (r) {
      return '- ' + when(r) + ' ' + r[1] + ' ' + (ACTIVITY.kinds[r[3]] || r[3]) + ' ' + r[5] + ' ' + r[6];
    }) : ['- none'], ['', 'ERRORS'], errors.length ? errors.map(function (r) { return '- ' + when(r) + ' ' + r[1] + ' ' + r[9]; }) : ['- none']).join('\n');

  return { subject: 'HE Venue Explorer activity, ' + fmt(to, 'd MMM') + ': ' + subjectBits.join(', '), html: html, text: text };
}
