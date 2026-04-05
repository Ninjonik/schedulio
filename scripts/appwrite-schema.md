# Appwrite TablesDB schema for Schedulio

Database ID: `schedulio_db`

## classes
Table permissions: none (row-level ACL only)
- `ownerId` varchar(64) required
- `title` varchar(255) required
- `classKind` enum: `lecture`, `lab`, `other`
- `code` varchar(50)
- `weekday` integer required (1..7)
- `startTime` varchar(5) required (`HH:mm`)
- `endTime` varchar(5) required (`HH:mm`)
- `weekPattern` enum required: `all`, `odd`, `even`
- `location` varchar(255)
- `descriptionMd` longtext
- `imageUrl` url
- `color` varchar(20)

Indexes:
- key: `idx_classes_owner_weekday_time` on (`ownerId`, `weekday`, `startTime`)

## class_skips
Table permissions: none (row-level ACL only)
- `ownerId` varchar(64) required
- `classId` varchar(64) required
- `date` varchar(10) required (`YYYY-MM-DD`)
- `reason` varchar(255)

Indexes:
- key: `idx_skips_owner_date` on (`ownerId`, `date`)
- unique: `idx_skips_class_date` on (`classId`, `date`)

## tasks
Table permissions: none (row-level ACL only)
- `ownerId` varchar(64) required
- `classId` varchar(64) required
- `occurrenceDate` varchar(10) required (`YYYY-MM-DD`)
- `title` varchar(255) required
- `notesMd` longtext
- `done` boolean required default false

Indexes:
- key: `idx_tasks_owner_date` on (`ownerId`, `occurrenceDate`)
- key: `idx_tasks_class_date` on (`classId`, `occurrenceDate`)
- unique: `idx_tasks_owner_class_date_unique` on (`ownerId`, `classId`, `occurrenceDate`)

## subtasks
Table permissions: none (row-level ACL only)
- `ownerId` varchar(64) required
- `taskId` varchar(64) required
- `title` varchar(255) required
- `done` boolean required default false

Indexes:
- key: `idx_subtasks_owner_task` on (`ownerId`, `taskId`)

