# Development history

The application was developed in nine incremental commits before publication. Direct Git push authentication was unavailable, so the GitHub integration imported the saved development trees in their original sequence. Imported commits have new publication timestamps and IDs; no timestamps were backdated.

The original commit objects are preserved in [sweety-history.bundle](sweety-history.bundle). To inspect them independently, download the bundle and run:

```bash
git clone sweety-history.bundle sweety-original-history
cd sweety-original-history
git log --oneline --reverse
```

The source tree at the final imported development stage matches original commit `780e43a`; subsequent documentation updates record publication and verification outcomes.

## Original stages

```text
8a1cb56 chore: scaffold Sweety and record assignment requirements
a92fcdb feat: add PostgreSQL schema, session authentication, readings and reports API
656f382 test: cover authentication, ownership, reading constraints and report boundaries
6f784f8 feat: build responsive dashboard, reading history, reports and validated forms
40cdace chore: package PostgreSQL deployment, CI and development workflow
68b5cca docs: add setup guide, API walkthrough and verification evidence
6f49a2c test: add production HTTP smoke checks and Docker CI
69b3592 docs: record native PostgreSQL and production verification
780e43a fix: resolve demo database paths correctly on Windows
```
