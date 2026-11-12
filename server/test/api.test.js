import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { createPostgres } from '../src/db/postgres.js';
import { createEmbeddedDb } from '../../scripts/embedded-db.mjs';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { SLOT_VALUES } from '../../shared/slots.js';

const config = {
  nodeEnv: 'test',
  timeZone: 'Asia/Kolkata',
  appOrigin: 'http://localhost:3000',
  cookieSecure: false,
  trustProxy: false,
  sessionTtlDays: 7,
  bcryptRounds: 4,
};
const runPrefix = `sweety-test-${randomUUID()}`;
let db,
  app,
  sequence = 0;

before(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('TEST_DATABASE_URL database name must end in _test.');
    if (url === process.env.DATABASE_URL)
      throw new Error('The application and test databases must be different.');
    db = createPostgres(url);
    console.log('Integration database: PostgreSQL server.');
  } else {
    db = await createEmbeddedDb();
    console.log(
      'Integration database: embedded PostgreSQL (PGlite); set TEST_DATABASE_URL for real-server tests.',
    );
  }
  await migrate(db);
  app = createApp({
    db,
    config,
    clock: () => new Date('2026-11-09T10:00:00Z'),
    authRateLimit: 1000,
  });
});

after(async () => {
  if (!db) return;
  await db.query('DELETE FROM users WHERE email LIKE $1', [`${runPrefix}%`]);
  await db.close();
});

async function account() {
  const agent = request.agent(app);
  const email = `${runPrefix}-${++sequence}@example.com`;
  const password = 'ExamplePassword!42';
  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'Test Person', email, password })
    .expect(201);
  return {
    agent,
    email,
    password,
    id: response.body.user.id,
    csrf: response.body.csrfToken,
    cookie: response.headers['set-cookie'][0].split(';')[0],
    registration: response,
  };
}
const add = (user, body = {}) =>
  user.agent
    .post('/api/readings')
    .set('X-CSRF-Token', user.csrf)
    .send({ date: '2026-11-09', slot: 'fasting', value: 100, ...body });
const change = (user, id, body) =>
  user.agent.put(`/api/readings/${id}`).set('X-CSRF-Token', user.csrf).send(body);
const remove = (user, id) =>
  user.agent.delete(`/api/readings/${id}`).set('X-CSRF-Token', user.csrf);

test('registration hashes passwords, sets HttpOnly cookie and restores session', async () => {
  const user = await account();
  assert.match(user.registration.headers['set-cookie'][0], /HttpOnly/);
  assert.match(user.registration.headers['set-cookie'][0], /SameSite=Lax/);
  const saved = (await db.query('SELECT password_hash FROM users WHERE id = $1', [user.id]))
    .rows[0];
  assert.notEqual(saved.password_hash, user.password);
  assert.equal(await bcrypt.compare(user.password, saved.password_hash), true);
  const me = await user.agent.get('/api/auth/me').expect(200);
  assert.equal(me.body.user.email, user.email);
  assert.equal(me.body.csrfToken, user.csrf);
  assert.equal('password_hash' in me.body.user, false);
});

test('registration validates input and email uniqueness is case insensitive', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: 'bad', password: 'short' })
    .expect(400);
  const user = await account();
  const duplicate = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Someone Else', email: ` ${user.email.toUpperCase()} `, password: user.password })
    .expect(409);
  assert.equal(duplicate.body.error.code, 'EMAIL_EXISTS');
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'long@example.com', password: '😀'.repeat(20) })
    .expect(400);
});

test('login rejects bad credentials; logout invalidates the actual server session', async () => {
  const user = await account();
  await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'WrongPassword' })
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'missing@example.com', password: user.password })
    .expect(401);
  const fresh = request.agent(app);
  const login = await fresh
    .post('/api/auth/login')
    .send({ email: user.email.toUpperCase(), password: user.password })
    .expect(200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  await fresh.post('/api/auth/logout').set('X-CSRF-Token', login.body.csrfToken).expect(204);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
});

test('unauthenticated, expired and tampered sessions cannot access private data', async () => {
  await request(app).get('/api/readings').expect(401);
  await request(app).get('/api/reports').expect(401);
  await request(app).post('/api/readings').send({}).expect(401);
  const user = await account();
  await db.query(
    "UPDATE sessions SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1",
    [user.id],
  );
  await user.agent.get('/api/auth/me').expect(401);
  await request(app)
    .get('/api/auth/me')
    .set('Cookie', `sweety_session=${'x'.repeat(43)}`)
    .expect(401);
});

test('CSRF and cross-origin write attempts are rejected', async () => {
  const user = await account();
  const reading = { date: '2026-11-09', slot: 'fasting', value: 100 };
  await user.agent.post('/api/readings').send(reading).expect(403);
  await user.agent
    .post('/api/readings')
    .set('X-CSRF-Token', 'x'.repeat(64))
    .send(reading)
    .expect(403);
  await user.agent
    .post('/api/readings')
    .set('X-CSRF-Token', 'ø'.repeat(64))
    .send(reading)
    .expect(403);
  await user.agent
    .post('/api/readings')
    .set('X-CSRF-Token', user.csrf)
    .set('Origin', 'https://other.example')
    .send(reading)
    .expect(403);
  await request(app)
    .post('/api/auth/login')
    .set('Origin', 'https://other.example')
    .send({ email: user.email, password: user.password })
    .expect(403);
});

test('required value, integer range, slot and date validation is enforced by API', async () => {
  const user = await account();
  for (const body of [
    { value: undefined },
    { value: '' },
    { value: 39 },
    { value: 601 },
    { value: 120.5 },
    { value: '120' },
    { date: '2026-11-10' },
    { date: '2026-02-30' },
    { slot: 'snack' },
  ]) {
    const response = await add(user, body).expect(400);
    assert.ok(response.body.error.fields);
  }
  await add(user, { value: 40 }).expect(201);
  await add(user, { slot: 'after_breakfast', value: 600 }).expect(201);
});

test('one reading per slot, four per day, and editing a full day works', async () => {
  const user = await account();
  const first = await add(user).expect(201);
  assert.equal((await add(user).expect(409)).body.error.code, 'DUPLICATE_SLOT');
  for (const slot of SLOT_VALUES.slice(1)) await add(user, { slot }).expect(201);
  assert.equal((await add(user).expect(409)).body.error.code, 'DAY_FULL');
  await change(user, first.body.reading.id, {
    date: '2026-11-09',
    slot: 'fasting',
    value: 105,
  }).expect(200);
  await remove(user, first.body.reading.id).expect(204);
  await add(user).expect(201);
  assert.equal((await user.agent.get('/api/readings')).body.pagination.total, 4);
});

test('concurrent duplicate submissions create exactly one record', async () => {
  const user = await account();
  const results = await Promise.all([add(user), add(user), add(user)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409]);
  assert.equal((await user.agent.get('/api/readings')).body.pagination.total, 1);
});

test('simultaneous writes to four different slots preserve the daily limit', async () => {
  const user = await account();
  const responses = await Promise.all(SLOT_VALUES.map((slot) => add(user, { slot })));
  assert.ok(responses.every((response) => response.status === 201));
  await add(user).expect(409);
  assert.equal((await user.agent.get('/api/readings')).body.pagination.total, 4);
});

test('ownership protects list, reports, update and delete, including supplied user IDs', async () => {
  const a = await account();
  const b = await account();
  const created = await add(a, { user_id: b.id }).expect(201);
  const id = created.body.reading.id;
  assert.equal((await b.agent.get('/api/readings')).body.items.length, 0);
  assert.equal((await b.agent.get('/api/reports')).body.summary.count, 0);
  await change(b, id, { date: '2026-11-09', slot: 'fasting', value: 300 }).expect(404);
  await remove(b, id).expect(404);
  assert.equal((await a.agent.get('/api/readings')).body.items[0].value, 100);
});

test('date/slot moves reject conflicts without changing the original reading', async () => {
  const user = await account();
  const a = (await add(user)).body.reading;
  await add(user, { date: '2026-11-08' }).expect(201);
  await change(user, a.id, { date: '2026-11-08', slot: 'fasting', value: 150 }).expect(409);
  assert.equal(
    (await user.agent.get('/api/readings')).body.items.find((r) => r.id === a.id).date,
    '2026-11-09',
  );
  await change(user, a.id, { date: '2026-11-08', slot: 'after_lunch', value: 150 }).expect(200);
  await remove(user, a.id).expect(204);
  await remove(user, a.id).expect(404);
});

test('daily, MTD and previous-month reports use exact inclusive ranges and rounded aggregates', async () => {
  const user = await account();
  for (const [date, slot, value] of [
    ['2026-10-15', 'after_lunch', 160],
    ['2026-10-15', 'fasting', 100],
    ['2026-10-15', 'after_breakfast', 120],
    ['2026-10-01', 'fasting', 90],
    ['2026-10-14', 'fasting', 190],
    ['2026-09-01', 'fasting', 88],
    ['2026-09-30', 'after_dinner', 144],
    ['2026-11-01', 'fasting', 250],
  ])
    await add(user, { date, slot, value }).expect(201);
  const daily = (await user.agent.get('/api/reports?date=2026-10-15&period=daily').expect(200))
    .body;
  assert.deepEqual(daily.summary, { count: 3, highest: 160, lowest: 100, average: 126.7 });
  assert.deepEqual(
    daily.readings.map((r) => r.slot),
    ['fasting', 'after_breakfast', 'after_lunch'],
  );
  const mtd = (await user.agent.get('/api/reports?date=2026-10-15&period=mtd').expect(200)).body;
  assert.deepEqual(mtd.range, { from: '2026-10-01', to: '2026-10-15' });
  assert.deepEqual(mtd.summary, { count: 5, highest: 190, lowest: 90, average: 132 });
  const monthly = (await user.agent.get('/api/reports?date=2026-10-15&period=monthly').expect(200))
    .body;
  assert.deepEqual(monthly.range, { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(monthly.summary, { count: 2, highest: 144, lowest: 88, average: 116 });
  await user.agent.get('/api/reports?date=2026-11-10').expect(400);
  await user.agent.get('/api/reports?period=yearly').expect(400);
});

test('empty report returns null values, zero count, and no fabricated readings', async () => {
  const user = await account();
  const report = (await user.agent.get('/api/reports').expect(200)).body;
  assert.deepEqual(report.summary, { count: 0, highest: null, lowest: null, average: null });
  assert.deepEqual(report.readings, []);
});

test('pagination and date filters are stable, validated and user scoped', async () => {
  const user = await account();
  for (const day of ['05', '06', '07', '08', '09']) await add(user, { date: `2026-11-${day}` });
  const page = (await user.agent.get('/api/readings?page=2&limit=2')).body;
  assert.deepEqual(page.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 });
  assert.deepEqual(
    page.items.map((r) => r.date),
    ['2026-11-07', '2026-11-06'],
  );
  const filtered = await user.agent
    .get('/api/readings?from=2026-11-07&to=2026-11-08&slot=fasting')
    .expect(200);
  assert.equal(filtered.body.pagination.total, 2);
  assert.equal((await user.agent.get('/api/readings?page=8&limit=2')).body.items.length, 0);
  for (const query of [
    'page=0',
    'page=1.5',
    'limit=101',
    'limit=abc',
    'from=invalid',
    'from=2026-11-08&to=2026-11-07',
    'slot=snack',
  ])
    await user.agent.get(`/api/readings?${query}`).expect(400);
});

test('database constraints reject invalid values, unknown slots and duplicate slots', async () => {
  const user = await account();
  await add(user).expect(201);
  for (const [slot, value, code] of [
    ['fasting', 120, '23505'],
    ['snack', 120, '23514'],
    ['after_lunch', 601, '23514'],
  ]) {
    await assert.rejects(
      db.query('INSERT INTO readings(id,user_id,reading_date,slot,value) VALUES ($1,$2,$3,$4,$5)', [
        randomUUID(),
        user.id,
        '2026-11-09',
        slot,
        value,
      ]),
      (error) => error.code === code,
    );
  }
});

test('seed is repeatable and does not overwrite credentials or existing data', async () => {
  const options = {
    email: `${runPrefix}-seed@example.com`,
    password: 'SeedPassword!42',
    bcryptRounds: 4,
    now: new Date('2026-11-09T10:00:00Z'),
  };
  const first = await seed(db, options);
  assert.equal(first.created, true);
  assert.ok(first.count > 100);
  const second = await seed(db, { ...options, password: 'A different password' });
  assert.equal(second.created, false);
  const hash = (await db.query('SELECT password_hash FROM users WHERE email=$1', [options.email]))
    .rows[0].password_hash;
  assert.equal(await bcrypt.compare(options.password, hash), true);
});

test('invalid JSON, unknown endpoints and rate limiting have clear responses', async () => {
  await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{broken')
    .expect(400);
  await request(app).get('/api/unknown').expect(404);
  const limited = createApp({ db, config, authRateLimit: 1 });
  await request(limited).post('/api/auth/login').send({}).expect(401);
  const response = await request(limited).post('/api/auth/login').send({}).expect(429);
  assert.equal(response.body.error.code, 'RATE_LIMITED');
});
