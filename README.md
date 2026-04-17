# LCK Fantasy Backend

Backend setup for an LCK fantasy app using PostgreSQL and Prisma.

## Current Status

This project currently has:

- Prisma configured with PostgreSQL
- Database models for `User`, `League`, `LckPlayer`, and `FantasyTeam`
- A working seed script in [`prisma/seed.js`](./prisma/seed.js)
- Initial seeded player data for testing

## Tech Stack

- Node.js
- Prisma
- PostgreSQL
- Express

## Project Structure

```text
lck-fantasy-backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── src/
├── package.json
└── prisma.config.ts
```

## Environment Variables

Create a `.env` file with the following values:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/YOUR_DATABASE?schema=public"
JWT_SECRET="your_secret_here"
PORT=3001
```

## Install Dependencies

```powershell
npm install
```

## Prisma Commands

Generate the Prisma client:

```powershell
npx.cmd prisma generate
```

Run the database migration:

```powershell
npx.cmd prisma migrate dev
```

Seed the database:

```powershell
npm.cmd run db:seed
```

Open Prisma Studio:

```powershell
npx.cmd prisma studio
```

## Available Scripts

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

## Testing So Far

The database setup has been manually verified by:

- running migrations successfully
- running the seed script successfully
- querying PostgreSQL directly and confirming seeded rows exist

Example query:

```sql
SELECT * FROM "LckPlayer";
```

Expected seeded rows:

- Faker
- Chovy

## Notes

- PostgreSQL normally runs on port `5432`
- Prisma Studio runs on its own local browser port, which is separate from the database port
- If `npm` is blocked in PowerShell, use `npm.cmd`

## Next Step

A good next step is building the first API route that fetches players from Prisma, such as:

- `GET /players`

