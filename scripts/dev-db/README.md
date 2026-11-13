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
