# Sweety — implementation checklist

Source: Kenpath's Junior Full Stack Developer assignment supplied by the candidate.

## Required
- [ ] React frontend, Node.js / Express API, PostgreSQL database
- [ ] Register with name, email, password; bcrypt hashing; login and logout
- [ ] Authentication and ownership enforced on every reading/report endpoint
- [ ] Create, view, edit, delete a reading: calendar date, one of four slots, mg/dl value
- [ ] Required integer value, 40–600 inclusive; reject future dates
- [ ] One reading per user/date/slot; at most four readings per user/date
- [ ] Friendly field/server errors in the UI
- [ ] Daily: selected date; include slot readings
- [ ] Month-to-date: first of selected month through selected date
- [ ] Monthly: entire month before the selected date's month
- [ ] Highest, lowest, average rounded to one decimal, count; friendly empty states
- [ ] README: install, database setup, server/client, tests, assumptions, improvements
- [ ] .env.example with every environment variable and no real secrets
- [ ] Repeatable seed script with synthetic demo data
- [ ] Screenshots or a 2–3 minute screen recording
- [ ] Public GitHub repository with real incremental commits

## Selected bonuses (after required features)
- [ ] Paginated GET /readings
- [ ] Monthly line chart
- [ ] Docker Compose with PostgreSQL and the app
- [ ] React Testing Library form tests

## Decisions
- Keep the required PostgreSQL stack; MongoDB is not needed.
- A calendar date is stored as PostgreSQL DATE. APP_TIMEZONE defines today's date.
- Default time zone: Asia/Kolkata. Document this shared-app assumption.
- Four allowed slot values plus a unique (user_id, reading_date, slot) constraint
  mathematically enforce the four-per-day maximum. Serialize writes per user to
  produce clear capacity/duplicate errors even for concurrent requests.
- Full days report empty aggregate values as null, not misleading zero mg/dl.
- When all four slots are occupied, capacity errors take precedence on creation.
- Session cookies are HttpOnly; session identifiers are hashed in PostgreSQL.
- No clinical classifications or treatment advice; this is a tracking app.
- Optional Redis, reminders and doctor access are outside this submission.
