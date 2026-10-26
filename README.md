# Acquisition Readiness (demo)

Industry-specific surveys that tell a company how ready it is to be acquired.
Each completed survey produces a 1-5 score. The admin section manages
industries, tags, questions, per-industry question order, and short-form
surveys.

Built with Next.js 16 (React 19, TypeScript), PostgreSQL 16 (Docker), Drizzle
ORM, and Tailwind CSS.

## Run it

Requires Node.js 20+ and Docker Desktop (running).

```bash
npm install
cp .env.example .env
npm run setup      # start Postgres, create tables, load demo data
npm run dev        # http://localhost:3000  (admin: /admin, login admin / admin)
```

## Learn how it works

See **[ARCHITECTURE.md](./ARCHITECTURE.md)**, a full walkthrough of every
piece (written for developers coming from servlets/JSP and classic ASP) plus
what changes when deploying to AWS.
