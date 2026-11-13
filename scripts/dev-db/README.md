# Local dev databases

Questions are edited in local dev copies of the 4 exam databases, then promoted to production.

| Exam key | Database | Images folder |
|---|---|---|
| jeemains | jee-mains | jeemains |
| neet | neet | neet |
| jeeadvanced | jee-advanced | jeeadvanced |
| mpscgs | mpsc-gs | mpscgs |

- Mongo: Docker container `emt-dev-mongo` (mongo:8), `mongodb://127.0.0.1:27019`, localhost only. Data in the docker volume `emt-dev_mongo-data`.
- Images and backups: `/Volumes/DevStorage/code/emt-dev-data/{images,backups}`.
- Content copied: courses, subjects, chapters, topics, paragraphs, questions, set_tests. User data never leaves production.

## Commands

```
npm run devdb:up                         # start local Mongo
npm run devdb:refresh [-- mpscgs ...]    # overwrite dev with a fresh copy of prod (backs up first)
npm run devdb:backup                     # back up dev DBs + images (keeps newest 14)
npm run devdb:restore -- <backup-name>   # restore a backup (backs up current state first)
bash scripts/dev-db/install-daily-backup.sh [--remove]   # daily 21:00 backup via launchd
```

`refresh` reads production through SSH using the VPS backup user; it never writes to production.

## Admin app

The admin app reads and writes the local dev databases directly (Next.js server routes + MongoDB driver). No login; it only listens on 127.0.0.1.

```
npm run devdb:up          # once, if the container is not running
npm run dev:mpscgs        # http://localhost:3023  (dev:jeemains 3020, dev:neet 3021, dev:jeeadvanced 3022)
```

- `EXAM` (set by the dev:<exam> scripts) picks the database and images folder (`src/config/exams.js`).
- `src/utils/db/client.ts`: the supabase-style client the pages use; it calls `src/app/api/db/route.ts`.
- Images: `/api/images/<resources_directory>/<file>` from `/Volumes/DevStorage/code/emt-dev-data/images/<exam>/`.
- New questions get the same defaults Supabase used and their chapter/subject/course ids filled from the topic. Duplicate question+answer inserts are rejected as a whole, like before.

## Promote dev → production

```
npm run devdb:promote -- mpscgs            # dry run: shows what would change, writes nothing
npm run devdb:promote -- mpscgs --apply    # asks you to type the exam name, backs up prod, applies
npm run devdb:rollback -- <log file>       # undo one promotion (logs in emt-dev-data/promotions)
```

- Compares dev and prod by `id`: courses, subjects, chapters, topics, paragraphs, questions, set_tests.
- Questions go only if `verified_in_app` is true; unverified new/changed ones are shown as HOLD.
- A passage goes only when every question using it is verified.
- A question whose question+answer already exists in prod under another id is blocked.
- Never deletes in prod. Items only in prod are listed as prod-only.
- Images used by promoted questions are copied if new or changed; replaced prod files are kept in `/var/backups/emt/promote/<stamp>-<exam>-images-replaced`.
- Before writing: full `mongodump` of that prod database to `/var/backups/emt/promote/`. Every write is logged (exact Mongo types) so rollback restores documents byte for byte.
- If anything fails mid-way, what was written is rolled back automatically.
- Unknown arguments are rejected. Test mode against a local copy needs all three of `--target-uri`, `--target-db`, `--target-images`.
