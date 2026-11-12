# API reference

Base: `/api`. All protected routes derive the user from the session cookie; a body-supplied user ID is ignored.

| Method | Path             | Purpose                                    |
| ------ | ---------------- | ------------------------------------------ |
| GET    | `/health`        | Database health: 200 or 503                |
| GET    | `/meta`          | Current app-zone date, time zone and slots |
| POST   | `/auth/register` | Register and start session: 201            |
| POST   | `/auth/login`    | Start session: 200                         |
| GET    | `/auth/me`       | Current user and CSRF token                |
| POST   | `/auth/logout`   | Revoke session and clear cookie: 204       |
| GET    | `/readings`      | Current user’s paginated readings          |
| POST   | `/readings`      | Create: 201                                |
| PUT    | `/readings/:id`  | Replace date, slot, value: 200             |
| DELETE | `/readings/:id`  | Delete owned reading: 204                  |
| GET    | `/reports`       | Summary and readings for selected range    |

Register accepts `{ name, email, password }`; login accepts email/password. Responses contain `{ user: { id, name, email }, csrfToken }` and set an HttpOnly cookie. Send `X-CSRF-Token` on authenticated POST/PUT/DELETE requests, and retain the session cookie. Registration/login are limited to 20 attempts per IP per 15 minutes per API process; excess returns 429.

## Readings

```json
{ "date": "2026-10-15", "slot": "after_lunch", "value": 126 }
```

Slots: `fasting`, `after_breakfast`, `after_lunch`, `after_dinner`. Values must be integers 40–600. Invalid input returns 400; duplicate/capacity conflicts return 409; invalid, missing or another user’s reading ID returns 404. Successful writes return `{ reading }`.

`GET /readings?page=1&limit=20&from=2026-10-01&to=2026-10-15&slot=fasting`

Every parameter is optional. Defaults: page 1, limit 20; max limit 100. Inclusive date/slot filters are applied before pagination. Invalid/reversed dates, slots and pagination return 400. Order is newest date first, then daily slot order. Count and items share one SQL snapshot.

```json
{
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

## Reports

`GET /reports?date=2026-10-15&period=mtd`. Date defaults to today; period defaults to `daily`. Allowed periods: `daily`, `mtd`, `monthly`. Future dates are rejected. Monthly means the preceding calendar month.

```json
{
  "date": "2026-10-15",
  "period": "daily",
  "range": { "from": "2026-10-15", "to": "2026-10-15" },
  "timeZone": "Asia/Kolkata",
  "summary": { "count": 0, "highest": null, "lowest": null, "average": null },
  "readings": []
}
```

Reading objects contain `id`, `date`, `slot`, `value`, `created_at`, `updated_at`. Report rows are chronological, then slot order; no report exceeds 31 × 4 rows.

## Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a glucose value.",
    "fields": { "value": "Please enter a glucose value." }
  }
}
```

`fields` is optional. Other codes include `UNAUTHENTICATED` (401), `ORIGIN_REJECTED`/`CSRF_REJECTED` (403), `DUPLICATE_SLOT`/`DAY_FULL` (409). API responses are `Cache-Control: no-store`. SQL is parameterized and internal errors do not return database details or stacks.
