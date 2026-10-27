const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const outlook = require('../src/bug-report/outlook-draft');
const language = require('../src/engine/language-registry');
const emailDraft = require('../src/bug-report/email-draft');
const ui = vm.createContext({ T9LanguageRegistry: language });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/ui/i18n.js'), 'utf8'), ui);
const keys = ['title', 'help', 'permission', 'open', 'file', 'close', 'working', 'created',
  'consent', 'uncertain', 'size', 'configuration', 'failed'];
const makeEmail = locale => emailDraft.build({ title: 'Captured title', packageId: 'test' }, '', {
  locale, to: 'support@example.com', attachments: [{ fileName: 'report.pdf',
    mediaType: 'application/pdf', base64: 'JVBERg==' }] });
for (const { locale } of language.supported('ui')) {
  for (const key of keys) assert.notEqual(ui.T9UiI18n.translate('outlook.' + key, locale), 'outlook.' + key);
  const email = makeEmail(locale);
  assert.equal(email.subject, 'Captured title');
  assert(email.content.includes('X-Unsent: 1'));
  assert(email.htmlBody.includes('<html>'));
  assert.equal(email.attachments[0].mediaType, 'application/pdf');
}
function harness(mode = 'success', values = {}, locks = null, sessionValues = null,
  account = { tenantId: 'tenant', objectId: 'user', email: 'user@example.com' }, clock = Date.now) {
  const calls = [], auth = [];
  const identity = { getRedirectURL: purpose => 'https://extension.chromiumapp.org/' + purpose,
    launchWebAuthFlow: async options => {
      auth.push(options);
      if (mode === 'cancel') throw Error('cancelled');
      const request = new URL(options.url);
      assert.equal(request.searchParams.get('scope'), outlook.SCOPE);
      assert.equal(request.searchParams.get('code_challenge_method'), 'S256');
      assert.equal(request.searchParams.get('prompt'), options.interactive ? null : 'none');
      assert.equal(request.searchParams.get('login_hint'), account.email || null);
      assert(!options.url.includes('License.Check'));
      const response = new URL(request.searchParams.get('redirect_uri'));
      response.searchParams.set('state', mode === 'state' ? 'wrong' : request.searchParams.get('state'));
      if (mode === 'interaction' && !options.interactive) {
        response.searchParams.set('error', 'interaction_required');
      } else response.searchParams.set('code', 'code');
      return response.href;
    } };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    assert(!url.includes('sendMail') && !url.endsWith('/send'));
    if (url.endsWith('/token')) return { ok: true,
      json: async () => ({ access_token: 'graph-token', expires_in: 3600 }) };
    assert.equal(options.headers.Authorization, 'Bearer graph-token');
    if (url.startsWith('https://graph.microsoft.com/v1.0/me/messages/')) {
      assert.equal(options.method, 'GET');
      if (mode === 'missingDraft') return { ok: false, status: 404 };
      const id = decodeURIComponent(url.split('/').pop().split('?')[0]);
      return { ok: true, status: 200, json: async () => ({ id, isDraft: true,
        webLink: mode === 'badLink' ? 'https://evil.example/' : 'https://outlook.office.com/mail/drafts/id' }) };
    }
    assert.equal(url, 'https://graph.microsoft.com/v1.0/me/messages');
    const payload = JSON.parse(options.body);
    assert.equal(payload.toRecipients[0].emailAddress.address, 'support@example.com');
    assert.equal(payload.attachments[0].contentBytes, 'JVBERg==');
    assert.equal(payload.attachments[0]['@odata.type'], '#microsoft.graph.fileAttachment');
    if (mode === 'timeout') throw Error('timeout');
    if (mode === 'server') return { ok: false, status: 503 };
    if (mode === 'denied') return { ok: false, status: 403 };
    if (mode === 'unauthorized') return { ok: false, status: 401 };
    return { ok: true, status: 201, json: async () => ({ id: 'draft-1', isDraft: true,
      webLink: mode === 'badLink' ? 'https://evil.example/' : 'https://outlook.office.com/mail/drafts/id' }) };
  };
  return { client: outlook.create({ identity, fetcher, clientId: 'public-client',
    cryptoApi: webcrypto, locks, now: clock, getAccount: async () => account,
    sessionStorage: sessionValues ? {
      get: async key => ({ [key]: sessionValues[key] }),
      set: async data => Object.assign(sessionValues, data),
      remove: async key => { delete sessionValues[key]; }
    } : null }), calls, auth, values };
}
(async () => {
  const h = harness();
  assert.equal(h.calls.length, 0);
  const request = { reportKey: 'report:revision-1', email: makeEmail('en-US') };
  const result = await h.client.draft(request);
  assert.equal(result.webLink,
    'https://outlook.office.com/mail/deeplink/compose/draft-1?ItemID=draft-1&exvsurl=1');
  assert(!result.recovery, 'a verified draft should open directly in compose mode');
  assert.equal(h.auth.length, 1);
  assert.equal(h.auth[0].interactive, false, 'existing Microsoft session must be tried silently');
  const sessions = {};
  const account = { tenantId: 'tenant', objectId: 'user', email: 'user@example.com' };
  const first = harness('success', {}, null, sessions, account);
  await first.client.draft({ ...request, reportKey: 'first-report' });
  assert.equal(Object.keys(sessions).length, 1);
  assert(!JSON.stringify(first.values).includes('graph-token'), 'Graph tokens must never reach local storage');
  const next = harness('success', {}, null, sessions, account);
  await next.client.draft({ ...request, reportKey: 'second-report' });
  assert.equal(next.auth.length, 0, 'new report tab must reuse the browser-session token');
  assert.equal(next.calls.filter(call => call.url.endsWith('/token')).length, 0,
    'cached token must bypass token exchange');
  const expired = harness('success', {}, null, sessions, account, () => Date.now() + 3601000);
  await expired.client.draft({ ...request, reportKey: 'expired-report' });
  assert.equal(expired.auth.length, 1, 'expired tokens must be reacquired');
  const changed = harness('success', {}, null, sessions,
    { tenantId: 'tenant', objectId: 'other-user', email: 'other@example.com' });
  await changed.client.draft({ ...request, reportKey: 'changed-account' });
  assert.equal(changed.auth.length, 1, 'a different license account must not reuse another account token');
  await changed.client.clearToken();
  assert.equal(Object.keys(sessions).length, 1, 'clearing a token removes only the current account cache');
  const rejectedSessions = {};
  const rejected = harness('unauthorized', {}, null, rejectedSessions, account);
  await assert.rejects(rejected.client.draft({ ...request, reportKey: 'rejected-token' }),
    e => e.outlookCode === 'consent');
  assert.equal(Object.keys(rejectedSessions).length, 0, '401 must invalidate shared credentials');
  const background = fs.readFileSync(path.join(__dirname, '../src/recorder/background.js'), 'utf8');
  const signOutCase = background.slice(background.indexOf('case "T9_CONSULTANT_LICENSE_SIGN_OUT"'),
    background.indexOf('case "T9_START"'));
  const sessionEntries = { 't9OutlookAuthSessionV1:one': { value: 'token' }, unrelated: { retain: true } };
  let signedOut = false, responded = false;
  await vm.runInNewContext('(async () => { switch ("T9_CONSULTANT_LICENSE_SIGN_OUT") { ' +
    signOutCase + ' } })()', {
    consultantLicense: { signOut: async () => { signedOut = true; } },
    chrome: { storage: { session: { get: async () => sessionEntries,
      remove: async keys => keys.forEach(key => { delete sessionEntries[key]; }) } } },
    sendResponse: response => { responded = response.ok; }
  });
  assert(signedOut && responded);
  assert.deepEqual(sessionEntries, { unrelated: { retain: true } }, 'sign-out must clear only Outlook credentials');
  const interaction = harness('interaction');
  await interaction.client.draft({ ...request, reportKey: 'needs-consent' });
  assert.deepEqual(interaction.auth.map(call => call.interactive), [false, true]);
  assert.equal(new URL(interaction.auth[1].url).searchParams.get('prompt'), null,
    'interactive fallback must not force account selection');
  assert(!JSON.stringify(h.values).includes('graph-token'), 'tokens must not be persisted');
  const shared = {};
  let queue = Promise.resolve();
  const locks = { request: (_key, task) => { const job = queue.then(task); queue = job.catch(() => {}); return job; } };
  const tabA = harness('success', shared, locks), tabB = harness('success', shared, locks);
  const tabResults = await Promise.all([tabA.client.draft(request), tabB.client.draft(request)]);
  assert.equal(tabResults.filter(value => value.reused).length, 0);
  assert.equal(tabA.calls.concat(tabB.calls).filter(call => call.url === 'https://graph.microsoft.com/v1.0/me/messages' && call.options.method === 'POST').length, 2,
    'each explicit request, including a later request for the same report, creates a new draft');
  const retry = harness();
  await retry.client.draft(request);
  assert.equal(retry.calls.filter(call => call.url === 'https://graph.microsoft.com/v1.0/me/messages' && call.options.method === 'POST').length, 1,
    'a new user action must create a new draft for the same report');
  for (const mode of ['cancel', 'state', 'denied']) {
    const test = harness(mode);
    await assert.rejects(test.client.draft(request), e => e.outlookCode === 'consent');
    if (mode !== 'denied') assert.equal(test.calls.length, 0);
    else assert.deepEqual(test.values, {});
  }
  for (const mode of ['timeout', 'server']) {
    const test = harness(mode);
    await assert.rejects(test.client.draft(request), e => e.outlookCode === 'uncertain');
    const next = harness('success');
    await next.client.draft(request);
    assert.equal(next.calls.filter(call => call.url === 'https://graph.microsoft.com/v1.0/me/messages' && call.options.method === 'POST').length, 1,
      'a deliberate new attempt must be allowed after an uncertain prior request');
  }
  const duplicate = harness();
  const pending = duplicate.client.draft(request);
  await assert.rejects(duplicate.client.draft(request), e => e.outlookCode === 'busy');
  await pending;
  const large = harness();
  await assert.rejects(large.client.draft({ ...request, email: { ...request.email,
    attachments: [{ fileName: 'report.pdf', mediaType: 'application/pdf',
      base64: 'A'.repeat(4 * 1024 * 1024) }] } }), e => e.outlookCode === 'size');
  assert.equal(large.auth.length, 0);
  const badLink = await harness('badLink').client.draft(request);
  assert.equal(badLink.webLink, 'https://outlook.office.com/mail/drafts');
  assert.equal(badLink.recovery, true, 'an invalid message link should send the user to Drafts for recovery');
  const missingDraft = await harness('missingDraft').client.draft(request);
  assert.equal(missingDraft.webLink, 'https://outlook.office.com/mail/drafts');
  assert.equal(missingDraft.recovery, true, 'a missing message link should open Drafts without reusing an old message');
  for (const link of ['http://outlook.office.com/', 'https://outlook.office.com.evil.example/',
    'https://user:password@outlook.office.com/', 'javascript:alert(1)']) assert.equal(outlook.safeLink(link), null);
  console.log('Outlook draft, silent SSO, shared session cache, expiry/account isolation, PKCE, denial, duplicate/reload, uncertain outcome, .eml and all-language tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
