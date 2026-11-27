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

### Clear solutions in production (`--solutions-only`)

```
npm run devdb:promote -- jeemains --solutions-only           # dry run
npm run devdb:promote -- jeemains --solutions-only --apply   # backs up prod, asks you to type the exam name
```

- For every question whose solution is empty in dev but not in prod (verified or not), sets prod `solutions` to null. No other field or collection is written.
- Prod images used only by those solutions are moved (not deleted) to `/var/backups/emt/promote/<stamp>-<exam>-solution-images/`. Images still used by any question, option, other solution or passage, or whose name is referenced anywhere, stay.
- Same safety as a normal promote: mongodump first, every write logged, automatic rollback on error, `npm run devdb:rollback -- <log>` restores the solutions and moves the images back.

## Clear solutions in dev

```
npm run devdb:clear-solutions -- <exam|all>              # dry run
npm run devdb:clear-solutions -- <exam|all> --apply      # saves solutions to emt-dev-data/cleared-solutions/, then clears
npm run devdb:clear-solutions -- restore <file.json>     # put them back
```

- Local dev only. Touches only questions that really have a solution (already-empty ones are left alone). `verified_in_app` is not changed.
- Afterwards run `devdb:clean-images` to quarantine the images that only the solutions used.

## Clean unused dev images

```
npm run devdb:clean-images -- all            # dry run: unused files per exam (or one exam key)
npm run devdb:clean-images -- all --apply    # move unused files to emt-dev-data/unused-images/<stamp>/
npm run devdb:clean-images -- restore <dir>  # put a quarantine folder back
```

- Local dev only; production images are never touched.
- "Used" = referenced by any question (active or inactive) or passage under its topic's folder. Files whose name is referenced anywhere in the exam are kept too.
- Files are moved, not deleted (with `manifest.tsv`). Delete an old quarantine folder by hand when you're sure.
- `devdb:refresh` mirrors prod images, so unused files come back after a refresh; run this again afterwards.
