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
