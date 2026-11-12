import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { createPostgres } from './postgres.js';
import { migrate } from './migrate.js';
import { loadConfig } from '../config.js';
import { todayInZone, addDays, reportRange } from '../../../shared/dates.js';
import { SLOT_VALUES } from '../../../shared/slots.js';

export async function seed(db, { email, password, name = 'Alex Morgan', timeZone = 'Asia/Kolkata', now = new Date(), bcryptRounds = 12 }) {
  if (!email || !password || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error('Set DEMO_EMAIL and a DEMO_PASSWORD of 8+ characters (72 bytes maximum).');
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  const today = todayInZone(timeZone, now);
  const previous = reportRange(today, 'monthly');
  return db.transaction(async (tx) => {
    // Do not overwrite an existing account's name or password.
    const inserted = await tx.query(`INSERT INTO users(id,name,email,password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING id`, [randomUUID(), name, normalizedEmail, passwordHash]);
    if (!inserted.rows.length) return { created: false, email: normalizedEmail, count: 0 };
    const userId = inserted.rows[0].id;
    const dates = new Set();
    for (let day = `${today.slice(0, 7)}-01`; day <= today; day = addDays(day, 1)) dates.add(day);
    // A full previous month makes all three reports useful on the first demo visit.
    for (let day = previous.from; day <= previous.to; day = addDays(day, 1)) dates.add(day);
    let count = 0;
    for (const date of dates) {
      const dayNumber = Number(date.slice(-2));
      for (const [index, slot] of SLOT_VALUES.entries()) {
        if (date === today && index > 1) continue; // leave two slots for the demo
        if (date !== today && (dayNumber + index) % 13 === 0) continue;
        const value = [102, 142, 136, 128][index] + ((dayNumber * 7 + index * 11) % 31) - 10;
        await tx.query('INSERT INTO readings(id,user_id,reading_date,slot,value) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), userId, date, slot, value]);
        count++;
      }
    }
    return { created: true, email: normalizedEmail, count };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const db = createPostgres(config.databaseUrl);
  try {
    await migrate(db);
    const result = await seed(db, { email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD, name: process.env.DEMO_NAME, timeZone: config.timeZone, bcryptRounds: config.bcryptRounds });
    console.log(result.created ? `Created synthetic demo account with ${result.count} readings.` : 'Demo account already exists; existing data and credentials were left unchanged.');
  } finally { await db.close(); }
}
