# Schedulio

Schedulio is a Next.js 16 + React 19 college planner with Appwrite (1.9 TablesDB):

- Email/password registration and login
- Weekly class schedule with `all`, `odd`, and `even` week patterns
- Skip dates for holidays/cancellations
- Week-by-week calendar navigation
- Per-class task state (done checkbox), markdown notes, and subtasks
- Modern UI built with Tailwind, shadcn/ui, and Aceternity UI effects

## Tech stack

- Next.js 16 (App Router)
- React 19
- Bun
- Appwrite (Auth + TablesDB)
- Tailwind CSS v4
- shadcn/ui + Aceternity registry components

## 1) Install

```bash
bun install
```

## 2) Configure env

Copy `.env.example` to `.env.local` and fill values.

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

## 3) Appwrite backend setup (CLI)

Schema files:

- `scripts/appwrite-schema.json`
- `scripts/setup-appwrite.ps1`

Run a dry run first:

```powershell
bun run appwrite:setup:dry
```

Apply schema to your Appwrite **scheduler** project:

```powershell
bun run appwrite:setup
```

This creates/ensures:

- Database: `schedulio_db`
- Tables: `classes`, `class_skips`, `tasks`, `subtasks`
- Required columns and indexes for schedule recurrence, skips, tasks, and subtasks

Optional verification:

```powershell
bunx --bun appwrite-cli@latest tables-db list-tables --database-id schedulio_db
bunx --bun appwrite-cli@latest tables-db list-columns --database-id schedulio_db --table-id classes
bunx --bun appwrite-cli@latest tables-db list-indexes --database-id schedulio_db --table-id classes
```

## 4) Run

```bash
bun run dev
```

Open `http://localhost:3000`.

## Security notes

- Appwrite API key is used only on the server.
- Session secret is stored in an HTTP-only cookie (`schedulio_session`).
- Protected routes are guarded by middleware and server-side auth checks.

## Useful scripts

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run typecheck
```
