# Verification record

Latest execution: **12 November 2026**, Node.js 24, native PostgreSQL **16.15**.

| Check                                           | Result                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Backend/date suite on native PostgreSQL         | **21 passed, 0 failed**                                                                  |
| React Testing Library form suite                | **14 passed, 0 failed**                                                                  |
| Production frontend build                       | Passed                                                                                   |
| Native PostgreSQL migrations and synthetic seed | Passed                                                                                   |
| Production HTTP smoke check                     | Passed: all four check groups                                                            |
| Production dependency audit (11 November)       | `npm audit --omit=dev`: 0 reported vulnerabilities                                       |
| Browser login and registration rendering        | Observed                                                                                 |
| Browser empty registration validation           | Observed: name, email and password errors                                                |
| Browser authenticated dashboard/CRUD/reports    | Pending: interactive sign-in returned a credential error                                 |
| Mobile browser interaction                      | Pending; responsive styles are implemented                                               |
| Docker build/start                              | **Passed in GitHub Actions**: build, health checks, seed and HTTP smoke                  |
| GitHub Actions                                  | **Both jobs passed**: `test-and-build` and `docker-smoke`                                |
| Public GitHub repository                        | Published: [v182/sweety-glucose-tracker](https://github.com/v182/sweety-glucose-tracker) |

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

Authenticated browser interaction, mobile interaction and native Windows execution remain unverified. Docker and PostgreSQL CI are now verified. An audit with zero findings is not a complete security assessment.

## Captured screenshots

- [Login screen](screenshots/login.jpg)
- [Registration field validation](screenshots/registration-validation.jpg)

These are actual captures of the running app. They do not demonstrate the authenticated reading and report flows. A full capture walkthrough is provided in [DEMO.md](DEMO.md).

## Windows demo path correction

The demo now converts its file URL with Node’s `fileURLToPath` instead of reading `.pathname`, preventing a duplicated drive prefix on Windows and decoding spaces correctly. Windows-style URL conversion and script syntax were checked on Linux; native Windows execution remains to be confirmed on the candidate’s machine. Node engine requirements now match the installed jsdom test dependency.

## Public CI evidence

[GitHub Actions run 43267390444](https://github.com/v182/sweety-glucose-tracker/actions/runs/43267390444) completed successfully on 12 November 2026 against code commit `3402deaa2d4a22711c0cfa4f08ac6491ad176116`. Both jobs and all required steps passed:

- `test-and-build`: PostgreSQL 16 service, dependency installation, all 35 tests, production build and formatting check.
- `docker-smoke`: Compose configuration, production image build, healthy PostgreSQL/app containers, synthetic seed and all production HTTP smoke groups.

Subsequent publication edits only change documentation and add the original Git history bundle. The current source was also rechecked locally after the Windows path fix: 35 tests, build, formatting, actual demo startup, demo API login and all three report endpoints passed. An empty daily report on a new day is valid; existing seed data is preserved rather than replaced on restart.
