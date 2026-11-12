// Keep dates as YYYY-MM-DD strings. Never interpret a reading as a local timestamp.
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function todayInZone(timeZone = 'Asia/Kolkata', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date, amount) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function reportRange(date, period) {
  if (!isValidDate(date)) throw new RangeError('Please choose a valid date.');
  const firstOfMonth = `${date.slice(0, 7)}-01`;
  if (period === 'daily') return { from: date, to: date };
  if (period === 'mtd') return { from: firstOfMonth, to: date };
  if (period === 'monthly') {
    const lastOfPreviousMonth = addDays(firstOfMonth, -1);
    if (lastOfPreviousMonth.startsWith('0000'))
      throw new RangeError('This date is outside the supported reporting range.');
    return { from: `${lastOfPreviousMonth.slice(0, 7)}-01`, to: lastOfPreviousMonth };
  }
  throw new RangeError('Choose daily, mtd, or monthly.');
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}
