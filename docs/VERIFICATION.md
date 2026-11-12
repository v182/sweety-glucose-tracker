# Verification record

Latest execution: **12 November 2026**, Node.js 24, native PostgreSQL **16.15**.

| Check                                           | Result                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Backend/date suite on native PostgreSQL         | **21 passed, 0 failed**                                         |
| React Testing Library form suite                | **14 passed, 0 failed**                                         |
| Production frontend build                       | Passed                                                          |
| Native PostgreSQL migrations and synthetic seed | Passed                                                          |
| Production HTTP smoke check                     | Passed: all four check groups                                   |
| Production dependency audit (11 November)       | `npm audit --omit=dev`: 0 reported vulnerabilities              |
| Browser login and registration rendering        | Observed                                                        |
| Browser empty registration validation           | Observed: name, email and password errors                       |
| Browser authenticated dashboard/CRUD/reports    | Pending: interactive sign-in returned a credential error        |
| Mobile browser interaction                      | Pending; responsive styles are implemented                      |
| Docker build/start                              | Pending; Docker is unavailable in this execution environment    |
| GitHub Actions                                  | Native PostgreSQL and Docker smoke jobs configured; not yet run |
| Public GitHub repository                        | Pending repository creation; browser sign-in did not complete   |

## Native database and production checks

A temporary native PostgreSQL 16.15 cluster was launched on a loopback port using the `embedded-postgres` package's server binaries. This is a real PostgreSQL server accessed through `pg`, separate from the PGlite fallback. Application and test databases were separate. The full test/build command passed, including concurrent duplicate requests and database constraint tests. The temporary cluster was removed after verification.

The production Express server served the built React client against that native PostgreSQL database. `npm run smoke` passed these groups:

1. Production HTML, JavaScript/CSS assets and SPA deep links.
2. Database health, seeded demo login, session restoration and seeded report.
3. Registration, CSRF rejection, reading creation, duplicate rejection, cross-user access rejection, editing, daily/MTD/previous-month reports and pagination.
4. Deletion, empty report and logout/session revocation.

The synthetic preview account's stored bcrypt hash was also checked against the documented demo password successfully. API login is verified; this does not replace the outstanding interactive browser check or explain the credentials entered in that session.

## Repeatable verification

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database whose name ends in `_test`, then run `npm run check`. For production smoke checks, start and seed the built app and run `npm run smoke`; see the README for environment settings. The committed GitHub workflow performs both native PostgreSQL tests and a full Docker build/start/seed/smoke sequence after publication.

Docker execution, GitHub Actions success and authenticated browser interaction are explicitly **not claimed as verified**. An audit with zero findings is not a complete security assessment.

## Captured screenshots

- [Login screen](screenshots/login.jpg)
- [Registration field validation](screenshots/registration-validation.jpg)

These are actual captures of the running app. They do not demonstrate the authenticated reading and report flows. A full capture walkthrough is provided in [DEMO.md](DEMO.md).
