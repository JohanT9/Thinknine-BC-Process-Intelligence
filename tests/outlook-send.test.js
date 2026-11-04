// Sending a bug report directly from the user's mailbox: its own permission, one request per
// confirmed send, no automatic retry, and a confirmation in the report before anything is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const outlook = require('../src/bug-report/outlook-draft');
const language = require('../src/engine/language-registry');
const emailDraft = require('../src/bug-report/email-draft');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const email = emailDraft.build({ title: 'Captured title', packageId: 'test' }, '', {
  locale: 'sv-SE', to: 'support@example.com', attachments: [{ fileName: 'felrapport.pdf',
    mediaType: 'application/pdf', base64: 'JVBERg==' }] });
const request = { reportKey: 'report:revision-1', email };

function harness(mode = 'success', sessionValues = null) {
  const calls = [], auth = [];
  const identity = { getRedirectURL: purpose => 'https://extension.chromiumapp.org/' + purpose,
    launchWebAuthFlow: async options => {
      auth.push(options);
      const url = new URL(options.url);
      const response = new URL(url.searchParams.get('redirect_uri'));
      response.searchParams.set('state', url.searchParams.get('state'));
      response.searchParams.set('code', 'code-for:' + url.searchParams.get('scope'));
      return response.href;
    } };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/token')) {
      const scope = new URLSearchParams(options.body).get('scope');
      return { ok: true, json: async () => ({ access_token: 'token-for:' + scope, expires_in: 3600 }) };
    }
    if (url === 'https://graph.microsoft.com/v1.0/me/sendMail') {
      assert.equal(options.headers.Authorization, 'Bearer token-for:' + outlook.SEND_SCOPE);
      if (mode === 'timeout') throw Error('timeout');
      if (mode === 'server') return { ok: false, status: 503 };
      if (mode === 'throttled') return { ok: false, status: 429 };
      if (mode === 'denied') return { ok: false, status: 403 };
      if (mode === 'unauthorized') return { ok: false, status: 401 };
      if (mode === 'bad') return { ok: false, status: 400 };
      return { ok: true, status: 202 };
    }
    assert.fail('unexpected request ' + url);
  };
  const client = outlook.create({ identity, fetcher, clientId: 'public-client', cryptoApi: webcrypto,
    locks: null, getAccount: async () => ({ tenantId: 'tenant', objectId: 'user', email: 'user@example.com' }),
    sessionStorage: sessionValues ? {
      get: async key => ({ [key]: sessionValues[key] }),
      set: async data => Object.assign(sessionValues, data),
      remove: async key => { delete sessionValues[key]; } } : null });
  return { client, calls, auth };
}

(async () => {
  // One sendMail request with the message, the PDF and a copy kept in Sent Items.
  const sent = harness();
  assert.deepEqual(await sent.client.send(request), { sent: true });
  const sends = sent.calls.filter(call => call.url.endsWith('/sendMail'));
  assert.equal(sends.length, 1);
  const payload = JSON.parse(sends[0].options.body);
  assert.equal(payload.saveToSentItems, true);
  assert.equal(payload.message.subject, 'Captured title');
  assert.equal(payload.message.toRecipients[0].emailAddress.address, 'support@example.com');
  assert.equal(payload.message.attachments[0].name, 'felrapport.pdf');
  assert.equal(payload.message.attachments[0].contentBytes, 'JVBERg==');

  // Several recipients and copies; repeats are dropped and invalid entries are kept apart.
  assert.deepEqual(outlook.addresses(' a@example.com; b@example.com,A@example.com  c@x '),
    { valid: ['a@example.com', 'b@example.com'], invalid: ['c@x'] });
  assert.deepEqual(outlook.addresses(''), { valid: [], invalid: [] });
  const copied = harness();
  await copied.client.send({ ...request, email: { ...email, to: 'support@example.com; lead@example.com',
    cc: 'me@example.com' } });
  const copiedPayload = JSON.parse(copied.calls.find(call => call.url.endsWith('/sendMail')).options.body);
  assert.deepEqual(copiedPayload.message.toRecipients.map(item => item.emailAddress.address),
    ['support@example.com', 'lead@example.com']);
  assert.deepEqual(copiedPayload.message.ccRecipients.map(item => item.emailAddress.address),
    ['me@example.com']);
  assert.ok(!('ccRecipients' in payload.message), 'no empty copy list');
  for (const wrong of [{ to: 'support@example.com; nobody' }, { cc: 'nobody' }, { to: ' ; ' }]) {
    const test = harness();
    await assert.rejects(test.client.send({ ...request, email: { ...email, ...wrong } }),
      error => error.outlookCode === 'configuration');
    assert.equal(test.calls.length, 0);
  }

  // Sending asks for Mail.Send only; drafts keep asking for Mail.ReadWrite only.
  assert.equal(outlook.SEND_SCOPE, 'https://graph.microsoft.com/Mail.Send');
  assert.ok(sent.auth.every(options => new URL(options.url).searchParams.get('scope') === outlook.SEND_SCOPE));
  const sessions = {};
  const both = harness('success', sessions);
  await both.client.send(request);
  assert.equal(Object.keys(sessions).length, 1);
  assert.ok(Object.values(sessions)[0].value === 'token-for:' + outlook.SEND_SCOPE);

  // A send without a confirmed answer may have gone out and is never repeated here.
  for (const mode of ['timeout', 'server', 'throttled']) {
    const test = harness(mode);
    await assert.rejects(test.client.send(request), error => error.outlookCode === 'uncertain');
    assert.equal(test.calls.filter(call => call.url.endsWith('/sendMail')).length, 1, mode);
  }
  for (const [mode, code] of [['denied', 'consent'], ['unauthorized', 'consent'], ['bad', 'failed']]) {
    await assert.rejects(harness(mode).client.send(request), error => error.outlookCode === code);
  }
  // A second send while one is under way is refused.
  const busy = harness();
  const pending = busy.client.send(request);
  await assert.rejects(busy.client.send(request), error => error.outlookCode === 'busy');
  await pending;
  // Invalid recipients and oversized attachments fail before sign-in and before sending.
  const invalid = harness();
  await assert.rejects(invalid.client.send({ ...request, email: { ...email, to: 'nobody' } }),
    error => error.outlookCode === 'configuration');
  await assert.rejects(invalid.client.send({ ...request, email: { ...email, attachments: [{
    fileName: 'felrapport.pdf', mediaType: 'application/pdf', base64: 'A'.repeat(4 * 1024 * 1024) }] } }),
  error => error.outlookCode === 'size');
  assert.equal(invalid.calls.length, 0);
  assert.equal(invalid.auth.length, 0);

  // People suggestions use People.Read only, never open a sign-in window while typing and
  // return valid, distinct addresses.
  function peopleHarness({ silent = true, status = 200, value = [] } = {}) {
    const calls = [], auth = [];
    const identity = { getRedirectURL: purpose => 'https://extension.chromiumapp.org/' + purpose,
      launchWebAuthFlow: async options => {
        auth.push(options);
        if (!options.interactive && !silent) throw Error('interaction required');
        const url = new URL(options.url);
        const response = new URL(url.searchParams.get('redirect_uri'));
        response.searchParams.set('state', url.searchParams.get('state'));
        response.searchParams.set('code', 'code');
        return response.href;
      } };
    const fetcher = async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/token')) {
        assert.equal(new URLSearchParams(options.body).get('scope'), outlook.PEOPLE_SCOPE);
        return { ok: true, json: async () => ({ access_token: 'people-token', expires_in: 3600 }) };
      }
      assert.ok(url.startsWith('https://graph.microsoft.com/v1.0/me/people?'), url);
      return { ok: status === 200, status, json: async () => ({ value }) };
    };
    return { calls, auth, client: outlook.create({ identity, fetcher, clientId: 'public-client',
      cryptoApi: webcrypto, locks: null, getAccount: async () => ({ tenantId: 't', objectId: 'u' }) }) };
  }
  const found = peopleHarness({ value: [
    { displayName: 'Anna Ek', scoredEmailAddresses: [{ address: 'anna@example.com' }, { address: 'ANNA@example.com' }] },
    { displayName: 'Room', scoredEmailAddresses: [{ address: 'not-an-address' }] },
    { displayName: 'Bo', scoredEmailAddresses: [{ address: 'bo@example.com' }] }] });
  assert.deepEqual(await found.client.people('an"na'), [
    { name: 'Anna Ek', address: 'anna@example.com' }, { name: 'Bo', address: 'bo@example.com' }]);
  const search = new URL(found.calls.find(call => call.url.includes('/me/people')).url);
  assert.equal(search.searchParams.get('$search'), '"anna"');
  assert.ok(found.auth.every(options => options.interactive === false), 'typing signs in silently only');
  const notSignedIn = peopleHarness({ silent: false });
  assert.equal(await notSignedIn.client.people('anna'), null);
  assert.ok(notSignedIn.auth.every(options => options.interactive === false));
  assert.equal(notSignedIn.calls.length, 0);
  const signIn = peopleHarness({ silent: false });
  assert.deepEqual(await signIn.client.people('', { interactive: true }), []);
  assert.ok(signIn.auth.some(options => options.interactive === true));
  assert.equal(await signIn.client.people('anna').then(list => list.length), 0, 'token reused');
  await assert.rejects(peopleHarness({ status: 403 }).client.people('anna'),
    error => error.outlookCode === 'consent');

  // The report prepares the email and sends it only from a confirmation that shows the
  // recipient, subject and attachment; an uncertain send closes the confirmation.
  const page = read('src/ui/technical-report.js');
  const html = read('src/ui/technical-report.html');
  assert.match(html, /id="sendDirect"[^>]*data-i18n="outlook\.sendDirect"/);
  assert.match(html, /<section id="sendConfirm"[^>]*aria-labelledby="sendConfirmTitle" hidden>/);
  assert.match(html, /id="sendConfirmTo"[\s\S]*id="sendConfirmSubject"[\s\S]*id="sendConfirmAttachment"/);
  assert.match(html, /data-i18n="outlook\.sendPermission"/);
  const sendClick = page.slice(page.indexOf('sendButton.addEventListener("click"'),
    page.indexOf('cancelSend.addEventListener'));
  assert.ok(!sendClick.includes('outlookClient.send('), 'preparing never sends');
  assert.ok(sendClick.indexOf('chrome.permissions.request') < sendClick.indexOf('await prepareEmail()'),
    'the optional Graph permission is requested from the click itself');
  const confirmClick = page.slice(page.indexOf('confirmSend.addEventListener("click"'));
  assert.match(html, /<input id="sendConfirmTo"[^>]*aria-describedby="sendRecipientsHelp"/);
  assert.match(html, /<label for="sendConfirmCc" data-i18n="outlook\.confirmCc">/);
  // The edited recipients are validated at their field before anything is sent.
  assert.ok(confirmClick.indexOf('field.setAttribute("aria-invalid", "true")') <
    confirmClick.indexOf('outlookClient.send('), 'invalid recipients stop before sending');
  // Suggestions: a combobox per field, recent addresses saved only after a confirmed send,
  // and the People.Read sign-in only from its own button.
  assert.match(html, /id="sendConfirmCc"[^>]*role="combobox"[^>]*aria-controls="recipientSuggestions"/);
  assert.match(html, /<ul id="recipientSuggestions"[^>]*role="listbox"[^>]*data-i18n-aria-label="outlook\.suggestions"/);
  assert.ok(confirmClick.indexOf('await outlookClient.send(') < confirmClick.indexOf('rememberRecipients('));
  const typingStart = page.indexOf('async function suggestRecipients');
  const typing = page.slice(typingStart, page.indexOf('searchPeopleButton.addEventListener', typingStart));
  assert.match(typing, /outlookClient\.people\(term\)/);
  assert.ok(!typing.includes('interactive: true'), 'typing never opens sign-in');
  assert.match(page, /searchPeopleButton\.addEventListener\("click"[\s\S]*outlookClient\.people\("", \{ interactive: true \}\)/);
  assert.match(confirmClick, /email: \{ \.\.\.sending\.draft,\s+to: to\.valid\.join\("; "\), cc: cc\.valid\.join\("; "\) \}/);
  assert.match(confirmClick, /if \(error\?\.outlookCode === "uncertain"\) closeSendConfirm\(\);/);

  // Every interface language has the texts.
  const ui = vm.createContext({ T9LanguageRegistry: language });
  vm.runInContext(read('src/ui/i18n.js'), ui);
  const keys = ['sendDirect', 'sendHelp', 'sendPermission', 'confirmTitle', 'confirmTo',
    'confirmSubject', 'confirmAttachment', 'send', 'cancel', 'sending', 'sent',
    'sendUncertain', 'sendConsent', 'sendFailed', 'confirmCc', 'recipientsHelp',
    'invalidRecipient', 'missingRecipient', 'suggestions', 'peopleSearch', 'peoplePermission',
    'peopleFailed'];
  for (const { locale } of language.supported('ui')) {
    for (const key of keys) {
      const value = ui.T9UiI18n.translate('outlook.' + key, locale);
      assert.notEqual(value, 'outlook.' + key, locale + ' ' + key);
      if (locale !== 'en-US' && !['send', 'confirmCc'].includes(key)) {
        assert.notEqual(value, ui.T9UiI18n.translate('outlook.' + key, 'en-US'), locale + ' ' + key);
      }
    }
    assert.ok(ui.T9UiI18n.translate('outlook.sent', locale).includes('{to}'), locale);
    assert.ok(ui.T9UiI18n.translate('outlook.invalidRecipient', locale).includes('{address}'), locale);
  }
  console.log('Outlook direct send tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
