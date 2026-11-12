function integerEnv(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  return value;
}

export function loadConfig() {
  const timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  new Intl.DateTimeFormat('en', { timeZone }).format(); // fail fast for invalid zones
  const appOrigin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : null;
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: integerEnv('PORT', 3000, 1, 65535),
    databaseUrl: process.env.DATABASE_URL,
    timeZone,
    appOrigin,
    cookieSecure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
    sessionTtlDays: integerEnv('SESSION_TTL_DAYS', 7, 1, 30),
    bcryptRounds: integerEnv('BCRYPT_ROUNDS', 12, 10, 15),
  };
}
