# How Sweety works

## Follow a reading

1. `ReadingForm` stores input state and runs shared validation. A valid whole-number string becomes a JSON number.
2. `api.js` sends JSON, a session cookie and the in-memory CSRF token. Pending state prevents repeated saves and closing the form.
3. Express identifies the user from the session, validates CSRF and revalidates the input. Client validation is feedback; the API is authoritative.
4. A transaction locks the user’s row, checks their readings on the target date, and inserts or updates. All writes take the same lock so concurrent requests remain consistent.
5. PostgreSQL check constraints enforce slots and values; unique user/date/slot enforces one per slot and therefore at most four daily readings.
6. React reloads affected data after a successful save. Reports recompute from the database; there is no cache to invalidate.

## Decisions to explain

**Raw SQL with pg:** small queries are readable and parameterized. A transaction uses one checked-out connection for BEGIN, queries and COMMIT.

**Per-user row lock:** simple for four readings/day. Writes for one user serialize; other users remain independent. A date-specific lock is an option at larger scale.

**Opaque sessions:** a random 256-bit token is in an HttpOnly cookie; only its SHA-256 hash is stored. Expiry is checked on every request and logout revokes the row. Separate CSRF tokens protect authenticated mutations; an origin check also protects login.

**Calendar dates:** a reading belongs to a day and slot, not an instant. DATE and ISO strings avoid timezone shifts. Only “today” uses APP_TIMEZONE. UTC calendar arithmetic handles leap years and January boundaries.

**SQL reports:** COUNT, MIN, MAX and ROUND(AVG(value), 1) operate on a single snapshot with the reading list. Empty glucose aggregates are null, not zero.

**Charts:** separate slot series show actual recorded values and preserve missing-slot gaps. No medical interpretation is made.

## Tables

| Table             | Main fields                                                    |
| ----------------- | -------------------------------------------------------------- |
| users             | UUID, name, normalized unique email, bcrypt hash               |
| sessions          | Token hash, user FK, CSRF token, expiry                        |
| readings          | UUID, user FK, DATE, checked slot/value, unique user/date/slot |
| schema_migrations | Applied migration filenames                                    |

The unique reading index starts with user and date to support range queries. Sessions have expiry/user indexes. User foreign keys cascade.

## Before the interview

- Explain why client-only validation fails under concurrent requests.
- Explain why editing excludes the existing reading’s own ID from duplicate checks.
- Demonstrate that a forged body user ID cannot expose another account.
- Calculate a report by hand and compare its one-decimal average.
- Distinguish frontend feedback, authoritative API rules and database constraints.
- Explain one test and show a failing input corrected in the UI.
- Be clear that local PGlite verification and a PostgreSQL server run are separate checks.
