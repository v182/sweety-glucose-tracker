# Verification record

Checked on 11 November 2026 in the development environment (Node 24).

| Check                                        | Result                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Backend/date suite                           | 21 passed, 0 failed                                                |
| React Testing Library form suite             | 14 passed, 0 failed                                                |
| Production frontend build                    | Passed                                                             |
| Production dependency audit                  | `npm audit --omit=dev`: 0 reported vulnerabilities                 |
| Browser login and registration rendering     | Observed                                                           |
| Browser empty registration validation        | Observed: name, email and password errors                          |
| Browser authenticated dashboard/CRUD/reports | Pending: the secure sign-in attempt returned incorrect credentials |
| Mobile browser interaction                   | Pending; responsive styles are implemented                         |
| Native PostgreSQL server tests               | Pending; no PostgreSQL server available here                       |
| Docker build/start                           | Pending; Docker unavailable here                                   |
| GitHub Actions                               | Configured for Node 22 + PostgreSQL 16; not yet run                |
| Public GitHub repository                     | Pending GitHub connection/publication                              |

The local API suite executed real SQL on PGlite (embedded PostgreSQL), not a mocked repository. It exercises concurrent requests, but its serialized embedded execution does **not** prove native PostgreSQL locking behavior. The same suite can run on the real server with `TEST_DATABASE_URL`; the GitHub workflow is configured for this.

An audit with zero findings is not a complete security assessment. Native-server tests, Docker and authenticated browser checks should be completed before submitting the public repository.

## Captured screenshots

- [Login screen](screenshots/login.jpg)
- [Registration field validation](screenshots/registration-validation.jpg)

These are actual captures of the running app. They do not demonstrate the authenticated reading and report flows; capture those after signing in successfully. A full demo script is in [DEMO.md](DEMO.md).
