# Two-to-three-minute demo

Use only the synthetic account. Run the app yourself before recording. Do not display `.env`, connection strings or personal health information.

| Time      | Demonstration                                                        |
| --------- | -------------------------------------------------------------------- |
| 0:00–0:20 | Log in; introduce React + Express + PostgreSQL.                      |
| 0:20–0:45 | Show four slots and summaries; add a missing reading.                |
| 0:45–1:05 | Show empty/decimal/out-of-range errors, then correct one.            |
| 1:05–1:25 | Edit a value and show the updated average; delete your demo reading. |
| 1:25–1:45 | Filter history by date/slot and change pages.                        |
| 1:45–2:15 | Switch report periods, explain ranges, show an empty date.           |
| 2:15–2:45 | Briefly show tests, README and SQL constraints.                      |

Suggested screenshots: dashboard, reading validation, previous-month report, reading history and a mobile view of the actual running app.

## Publish the preserved history

The submission archive includes `sweety-history.bundle`. Restore it:

```bash
git clone sweety-history.bundle sweety
cd sweety
git log --oneline
```

Create an empty public GitHub repository without a generated README. Copy its URL from GitHub:

```bash
git remote remove origin
git remote add origin YOUR_COPIED_GITHUB_REPOSITORY_URL
git push -u origin main
```

Use your normal GitHub authentication. Never commit `.env`. Check Actions against PostgreSQL and try Docker locally before submitting. Review the AI-assisted code and personalize the README while preserving the real incremental history.
