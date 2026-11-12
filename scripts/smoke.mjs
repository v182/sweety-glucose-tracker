// Exercise the built application through HTTP, including PostgreSQL-backed auth.
// This intentionally creates a synthetic account; use a disposable local database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.SMOKE_BASE_URL || 'http://localhost:3000');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'Smoke tests only run on localhost.',
);
assert.ok(
  process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD,
  'Set the seeded DEMO_EMAIL and DEMO_PASSWORD.',
);

function client() {
  let cookie = '';
  let csrfToken = '';
  return {
    async request(path, { method = 'GET', body, status = 200, csrf = true } = {}) {
      const response = await fetch(new URL(`/api${path}`, base), {
        method,
        headers: {
          ...(cookie && { Cookie: cookie }),
          ...(body && { 'Content-Type': 'application/json' }),
          ...(csrf && csrfToken && { 'X-CSRF-Token': csrfToken }),
          Origin: base.origin,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(
        response.status,
        status,
        `${method} ${path}: expected ${status}, received ${response.status}`,
      );
      const setCookie = response.headers
        .getSetCookie()
        .find((value) => value.startsWith('sweety_session='));
      if (setCookie) cookie = setCookie.split(';')[0];
      const result = response.status === 204 ? null : await response.json();
      if (result?.csrfToken) csrfToken = result.csrfToken;
      return result;
    },
  };
}

const page = await fetch(new URL('/reports', base), { signal: AbortSignal.timeout(10000) });
assert.equal(page.status, 200);
const html = await page.text();
assert.match(html, /Sweety/);
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
assert.ok(
  assets.length >= 2,
  'Expected production JavaScript and CSS assets. Run npm run build first.',
);
for (const path of assets) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, `Missing built asset: ${path}`);
  assert.doesNotMatch(
    response.headers.get('content-type') || '',
    /text\/html/,
    'Asset request returned the SPA fallback.',
  );
}
console.log('PASS: built frontend, assets and SPA route');

const demo = client();
await demo.request('/health');
const meta = await demo.request('/meta');
await demo.request('/auth/login', {
  method: 'POST',
  body: { email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD },
});
await demo.request('/auth/me');
const seeded = await demo.request(`/reports?date=${meta.today}&period=mtd`);
assert.ok(seeded.summary.count > 0, 'Expected synthetic seed readings. Run db:seed first.');
console.log('PASS: database health, seeded login, session restore and seeded report');

const test = client();
const registration = await test.request('/auth/register', {
  method: 'POST',
  status: 201,
  body: {
    name: 'Smoke Test',
    email: `sweety-smoke-${randomUUID()}@example.test`,
    password: randomUUID(),
  },
});
assert.ok(registration.user.id);
const body = { date: meta.today, slot: 'after_lunch', value: 123 };
await test.request('/readings', { method: 'POST', body, csrf: false, status: 403 });
const created = await test.request('/readings', { method: 'POST', body, status: 201 });
const id = created.reading.id;
try {
  await test.request('/readings', { method: 'POST', body, status: 409 });
  await demo.request(`/readings/${id}`, { method: 'PUT', body, status: 404 });
  await test.request(`/readings/${id}`, { method: 'PUT', body: { ...body, value: 147 } });
  for (const period of ['daily', 'mtd', 'monthly']) {
    const report = await test.request(`/reports?date=${meta.today}&period=${period}`);
    assert.equal(report.summary.count, period === 'monthly' ? 0 : 1);
    assert.equal(report.summary.average, period === 'monthly' ? null : 147);
  }
  const history = await test.request('/readings?page=1&limit=1');
  assert.equal(history.items[0].id, id);
  assert.equal(history.pagination.total, 1);
  console.log(
    'PASS: register, CSRF, create, duplicate rejection, privacy, edit, reports and pagination',
  );
} finally {
  await test.request(`/readings/${id}`, { method: 'DELETE', status: 204 });
}
const empty = await test.request(`/reports?date=${meta.today}&period=daily`);
assert.equal(empty.summary.count, 0);
await test.request('/auth/logout', { method: 'POST', status: 204 });
await test.request('/auth/me', { status: 401 });
await demo.request('/auth/logout', { method: 'POST', status: 204 });
console.log('PASS: deletion, empty report and logout revocation');
console.log(
  'Production smoke test passed. The disposable Smoke Test account remains in this test database.',
);
