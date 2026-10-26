# Acquisition Readiness: How It Works

This guide explains every piece of this website. It's written for someone who
built web apps with **Java servlets/JSP** or **classic ASP** and is new to the
modern JavaScript stack. Part 2 covers what changes to run it on **AWS**
instead of your laptop.

- [Part 1: The application](#part-1-the-application)
  1. [Quick start](#1-quick-start)
  2. [What the site does](#2-what-the-site-does)
  3. [The stack, translated](#3-the-stack-translated)
  4. [Project layout](#4-project-layout)
  5. [How a request flows](#5-how-a-request-flows)
  6. [Server Components vs. Client Components](#6-server-components-vs-client-components)
  7. [The data model](#7-the-data-model)
  8. [Business rules: building a survey](#8-business-rules-building-a-survey)
  9. [Scoring](#9-scoring)
  10. [The admin section and security](#10-the-admin-section-and-security)
  11. [Rendering, streaming, and `loading.tsx`](#11-rendering-streaming-and-loadingtsx)
  12. [Database access, migrations, and seed data](#12-database-access-migrations-and-seed-data)
  13. [Configuration](#13-configuration)
  14. [Common tasks](#14-common-tasks)
  15. [Debugging tips](#15-debugging-tips)
  16. [Known demo limitations](#16-known-demo-limitations)
- [Part 2: Deploying to AWS](#part-2-deploying-to-aws)

---

# Part 1: The application

## 1. Quick start

Prerequisites: **Node.js 20+** (24 is installed), **Docker Desktop** (must be
running), and Git.

```bash
npm install            # download dependencies into node_modules/ (like Maven/Ivy resolving JARs)
cp .env.example .env   # local settings (already done on this machine)
npm run setup          # start Postgres in Docker, create the tables, load demo data
npm run dev            # start the dev server at http://localhost:3000
```

| URL | What it is |
|---|---|
| http://localhost:3000 | Public home page |
| http://localhost:3000/assess | Start an assessment |
| http://localhost:3000/admin | Admin. Log in with **admin / admin** (set in `.env`) |

### npm scripts (defined in `package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload. Edit a file and the browser updates. |
| `npm run build` | Production build (compiles, type-checks, prerenders static parts). |
| `npm start` | Runs the production build. Use this to see real performance. |
| `npm run lint` | Static analysis (ESLint). |
| `npm run db:up` / `db:down` | Start or stop the Postgres container. Data survives a stop. |
| `npm run db:generate` | After editing `src/db/schema.ts`, generate a new SQL migration file. |
| `npm run db:migrate` | Apply any pending migrations to the database. |
| `npm run db:seed` | **Wipe all data** and reload the demo data. |
| `npm run db:studio` | Open Drizzle Studio, a browser-based table viewer and editor. |
| `npm run setup` | `db:up` + `db:migrate` + `db:seed`, for first-time setup. |

To start completely fresh, delete the database volume with
`docker compose down -v`, then run `npm run setup`.

---

## 2. What the site does

A company that helps businesses get acquired uses this site to qualify
prospects. A representative of a potential client:

1. **Starts an assessment** (`/assess`), entering company name, email, and a
   few **identity questions**. One identity question ("Which industry best
   describes your company?") decides which **industry track** they take.
2. **Answers the industry survey** (`/assess/<id>`): **core** questions asked of
   everyone, questions **specific to their industry**, and **tagged** questions
   slotted in because they share a tag with the industry.
3. **Gets a score from 1 to 5** (`/results/<id>`) and a placeholder for the
   future recommendations dashboard.

There are also **short forms**: named subsets of an industry's questions (for
example a 6-question "Quick Check"). The home page links to each industry's
full survey and its short forms, with the industry preset.

Admins (`/admin`) manage **industries**, **tags**, and **questions**. They can
**reorder questions per industry** and **build short forms**.

The demo seeds 4 industries (Software & SaaS, Manufacturing, Healthcare
Services, Professional Services), 7 tags, 37 questions, and one "Quick Check"
short form per industry. Nothing is hard-coded to 4 industries. The design
works the same way with 98.

---

## 3. The stack, translated

| Piece | What we use | Rough equivalent in your experience |
|---|---|---|
| Language | **TypeScript**: JavaScript plus static types | Java's type checking, applied to JavaScript. Compiled away at build time. |
| Web framework | **Next.js 16** (App Router) | The servlet container + JSP + the URL mapping in `web.xml`, all in one. |
| UI library | **React 19** | JSP tag files / custom tags, but written as functions that return HTML-like markup (**JSX**). |
| Server-side pages | **Server Components** | A JSP page, or an `.asp` page with `<% %>` blocks. Runs on the server, queries the DB, outputs HTML. |
| Form handling | **Server Actions** | A servlet's `doPost()`, or a classic ASP page reading `Request.Form`. |
| Browser interactivity | **Client Components** | Hand-written JavaScript in a `<script>` tag, but organized as components. |
| Database | **PostgreSQL 16** in Docker | Any SQL database server. Docker just runs it in a disposable box. |
| DB access | **Drizzle ORM** + `pg` driver | JDBC/ADO with type-safe query builders. Much thinner than Hibernate. |
| Schema changes | **Drizzle Kit migrations** | Hand-written `ALTER TABLE` scripts, generated for you and tracked. |
| Validation | **Zod** | Struts `ActionForm.validate()` / Bean Validation annotations. |
| Styling | **Tailwind CSS 4** | CSS, written as small utility classes right on the elements (`class="mt-4 text-sm"`). |
| Request filter | **`src/proxy.ts`** | A servlet `Filter` mapped to `/admin/*`. |
| Package manager | **npm** (`package.json`) | Maven `pom.xml` + the local repository (`node_modules/`). |

### The biggest mental shift

In JSP/ASP, each page is a file that mixes HTML and server code, and every
click is a full page load. In Next.js:

- **Pages are still server-rendered HTML.** View source and you'll see real
  HTML, just like JSP. The difference is that once the first page loads, React
  takes over in the browser. Later link clicks fetch only the changed part of
  the page and swap it in without a full reload.
- **Pages are composed from components.** A component is a function that
  takes parameters (**props**) and returns markup. `<QuestionField question={q} />`
  is like `<my:questionField question="${q}"/>` in a JSP tag library.
- **The same language runs on both sides.** You choose per component whether
  it runs on the server (the default) or in the browser (`"use client"`).

---

## 4. Project layout

```
├── docker-compose.yml        Local Postgres container definition
├── drizzle.config.ts         Tells drizzle-kit where the schema and DB are
├── drizzle/                  Generated SQL migrations (commit these!)
│   └── 0000_init.sql
├── next.config.ts            Next.js settings
├── package.json              Dependencies + npm scripts
├── .env / .env.example       Environment settings (.env is git-ignored)
└── src/
    ├── proxy.ts              "Servlet filter": Basic Auth for /admin
    ├── db/
    │   ├── schema.ts         ★ Table definitions: the source of truth for the DB
    │   ├── index.ts          Connection pool + `db` object used everywhere
    │   └── seed.ts           Demo data script (npm run db:seed)
    ├── lib/                  Plain TypeScript: business logic, no UI
    │   ├── questionnaire.ts  ★ Which questions an industry gets, and in what order
    │   ├── scoring.ts        ★ 1-5 scoring rules
    │   ├── auth.ts           Basic Auth credential check
    │   ├── validation.ts     Form-reading and id-checking helpers
    │   └── site.ts           Site name / tagline
    ├── components/           Reusable UI pieces
    │   ├── QuestionField.tsx Renders one question's inputs (radio, select, …)
    │   ├── ActionForm.tsx    <form> that displays a Server Action's error/success message
    │   ├── SubmitButton.tsx  Button that disables itself while saving
    │   ├── ConfirmButton.tsx "Are you sure?" submit button
    │   ├── Badges.tsx        Little colored labels (Core, Industry, tag names)
    │   └── PageLoading.tsx   Spinner shown while a page loads
    └── app/                  ★ Every folder here is a URL
        ├── layout.tsx        Wraps every page: <html>, header, footer
        ├── globals.css       Tailwind setup + a few named CSS classes (.btn-primary, .card…)
        ├── page.tsx          /
        ├── not-found.tsx     404 page
        ├── assess/
        │   ├── page.tsx      /assess                 step 1: identity questions
        │   ├── actions.ts    Server Actions: startAssessment, submitAssessment
        │   └── [responseId]/
        │       └── page.tsx  /assess/<uuid>          step 2: industry survey
        ├── results/[responseId]/
        │   └── page.tsx      /results/<uuid>         score + dashboard placeholder
        └── admin/
            ├── layout.tsx    Admin sidebar, wraps every /admin page
            ├── actions.ts    ★ All admin Server Actions (create/update/delete/reorder)
            ├── page.tsx      /admin                  overview + recent responses
            ├── industries/   /admin/industries, /admin/industries/<id>, …/order, …/short-forms/<id>
            ├── questions/    /admin/questions, /admin/questions/new, /admin/questions/<id>
            └── tags/         /admin/tags
```

### File-based routing

There's no `web.xml` or route table. **The folder structure is the URL map.**

| File | Meaning |
|---|---|
| `app/foo/page.tsx` | The page at `/foo`. |
| `app/foo/[id]/page.tsx` | A page with a URL parameter: `/foo/123` arrives as `params.id = "123"`. Like a servlet mapped to `/foo/*` reading `getPathInfo()`. |
| `app/foo/layout.tsx` | Wraps every page under `/foo` (like a JSP include of a header and footer, but it stays mounted while you navigate). |
| `app/foo/loading.tsx` | What to show instantly while `/foo`'s data loads. See [section 11](#11-rendering-streaming-and-loadingtsx). |
| `app/foo/error.tsx` | Error page for anything under `/foo` (like `<error-page>` in `web.xml`). |
| `actions.ts` with `"use server"` | Not a route. A module of Server Actions. |

Files in `app/` that aren't one of those special names (like
`OrderEditor.tsx`) are ignored by the router. That lets you keep a page's
helper components next to the page.

---

## 5. How a request flows

### Viewing a page (GET)

Example: `GET /assess/3f9c…` (the industry survey).

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js server
    participant DB as PostgreSQL
    B->>N: GET /assess/3f9c…
    N->>B: HTML shell (header + "Loading…") immediately
    N->>DB: SELECT response, industry, questions…
    DB-->>N: rows
    N->>B: rest of the HTML streamed into the same response
```

1. Next.js matches the URL to `src/app/assess/[responseId]/page.tsx`.
2. It immediately sends the parts of the page that need no data (the header
   from `layout.tsx` and the spinner from `loading.tsx`).
3. The page component, an `async` function, runs on the server:

   ```tsx
   export default async function SurveyPage({ params }) {
     const { responseId } = await params;                // URL parameter
     const response = await db.query.responses.findFirst(…); // SQL query
     const questions = await getSurveyQuestions(…);       // business logic
     return <form action={submit}> … </form>;             // markup
   }
   ```

   This is the JSP model: query, loop, output HTML. `await` means "wait for
   this to finish". It's how JavaScript does blocking-style code without
   blocking the server.
4. The finished HTML is streamed into the same HTTP response and replaces the
   spinner.

### Submitting a form (POST)

The survey `<form>` posts to a **Server Action**:

```tsx
// src/app/assess/actions.ts
"use server";
export async function submitAssessment(responseId: string, formData: FormData) {
  const value = formData.get("q_12");    // like request.getParameter("q_12")
  …                                      // score, INSERT, UPDATE in a transaction
  redirect(`/results/${responseId}`);    // like response.sendRedirect(...)
}
```

```tsx
// src/app/assess/[responseId]/page.tsx
const submit = submitAssessment.bind(null, responseId); // pre-fill the first argument
<form action={submit}> … </form>
```

You never write a URL for the action. Next.js gives each Server Action a
hidden ID and creates the endpoint for you. The form is a normal HTML form
with `method="POST"`, so it **works even with JavaScript disabled**: the
browser posts, the server redirects, and the browser loads the results page
(Post/Redirect/Get, like you'd do in a servlet). With JavaScript on, React
sends the post in the background and swaps in the new page without a full
reload.

---

## 6. Server Components vs. Client Components

Every component is a **Server Component** unless its file starts with
`"use client"`.

| | Server Component (default) | Client Component (`"use client"`) |
|---|---|---|
| Runs | On the server, at request time | In the browser (and once on the server for the first HTML) |
| Can | `await` database queries, read secrets and env vars | Respond to clicks, keep state (`useState`), use browser APIs like `confirm()` |
| Can't | Have click handlers or state | Import `@/db` (the build fails, on purpose) |
| JSP analogy | A JSP page | JavaScript in a `<script>` block |

The usual pattern: **a Server Component loads data and passes it as props to
a small Client Component that handles interaction.** For example:

- `admin/industries/[id]/order/page.tsx` (server) loads the industry's
  questions, then renders
- `OrderEditor.tsx` (client), which lets you drag rows and click arrows,
  keeping the working order in browser memory. Clicking **Save order** calls
  the `saveIndustryOrder` Server Action like an ordinary function. React turns
  that into a POST behind the scenes.

Client Components in this app: `OrderEditor`, `QuestionForm` (fields that
appear or disappear by question type), `ActionForm`, `SubmitButton`,
`ConfirmButton`, and `admin/error.tsx`. Everything else is server-only.

`src/db/index.ts` starts with `import "server-only"`. If a Client Component
ever imports it, even indirectly, the build fails. That keeps database
credentials out of browser JavaScript.

---

## 7. The data model

All tables are defined in **`src/db/schema.ts`**.

```mermaid
erDiagram
    industries ||--o{ industry_tags : "uses"
    tags ||--o{ industry_tags : ""
    tags ||--o{ question_tags : ""
    questions ||--o{ question_tags : "tagged with"
    industries ||--o{ questions : "owns (kind = industry)"
    industries ||--o{ industry_question_order : "custom order"
    questions ||--o{ industry_question_order : ""
    industries ||--o{ short_forms : "has"
    short_forms ||--o{ short_form_questions : "includes"
    questions ||--o{ short_form_questions : ""
    industries ||--o{ responses : ""
    short_forms |o--o{ responses : "optional"
    responses ||--o{ answers : ""
    questions ||--o{ answers : ""
```

| Table | Purpose | Notes |
|---|---|---|
| `industries` | The 98 (here, 4) industry tracks | `slug` is the URL-friendly name used in links (`?industry=saas`). `is_active = false` hides it from the public. |
| `tags` | Topics like "Recurring Revenue" | |
| `industry_tags` | Which tags each industry pulls questions from | Many-to-many join table |
| `questions` | Every question | `kind` is `identity`, `core`, `industry`, or `tagged` (Postgres enum). `industry_id` is set **only** for kind `industry`, enforced by a `CHECK` constraint. `options` is a JSON array for multiple choice, e.g. `[{"label":"Audited","score":5}]`. `weight` controls importance in the average. |
| `question_tags` | Tags on tagged questions | Many-to-many. A question can have several tags. |
| `industry_question_order` | An admin's custom order for one industry | `(industry_id, question_id, position)`. No rows means default order. |
| `short_forms` | A named subset survey for one industry | |
| `short_form_questions` | Which questions a short form includes | Order is inherited from the industry's order |
| `responses` | One company's run through a survey | Primary key is a random **UUID**, which also serves as the unguessable URL token, so no login is needed to resume or view results. |
| `answers` | One answer per question per response | Stores the raw `value` and its 1-5 `score` (for the future dashboard). |

**Answer types** (`answer_type` enum):

| Type | Input | Stored `value` | Score |
|---|---|---|---|
| `scale` | 1-5 Strongly disagree to Strongly agree | `"1"`-`"5"` | Same number |
| `yes_no` | Yes / No | `"yes"` / `"no"` | 5 / 1 |
| `choice` | Pick one option | option index, `"0"`, `"1"`, … | The option's own score |
| `text` | Free text | the text | not scored |
| `industry` | Dropdown of active industries (identity only) | industry id | not scored |

Foreign keys mostly use `ON DELETE CASCADE`. Deleting an industry deletes its
industry-specific questions, short forms, and responses. The UI warns before
doing this.

---

## 8. Business rules: building a survey

All of this lives in **`src/lib/questionnaire.ts`**. Read that file first if
you need to change survey behavior.

### Which questions are in an industry's survey

```
identity questions                       (start page, every industry)
+ every active core question
+ every active industry question whose industry_id = this industry
+ every active tagged question that shares ≥ 1 tag with this industry
```

### Default order

1. **Identity**: on the start page, ordered by id (creation order)
2. **Core**
3. **Industry-specific**
4. **Tagged**, grouped by **tag name A-Z**. A question with several tags that
   match the industry sorts under the alphabetically first one. For example,
   "Customer contracts are assignable…" is tagged *Recurring Revenue* and
   *Customer Concentration*, so it sorts with Customer Concentration.

Within each group, ties break by question id (creation order).

### Custom order per industry

On **Admin → Industries → (industry) → Arrange questions**, an admin can drag
questions into any order and save. That writes one `industry_question_order`
row per question. Rules:

- Saved positions win over the default sort.
- A question that joins the industry later (new core question, newly assigned
  tag, …) has no saved position, so it goes **to the end** in default order.
- **Reset to default order** deletes the rows.
- Identity questions are shown locked. They're shared by all industries and
  asked before the industry is known, so per-industry ordering doesn't apply.

### Short forms

A short form stores only *which* questions it includes. When displayed, it
takes the industry's (possibly custom) ordered list and filters it, so short
forms follow the industry's order automatically. Identity questions are
always asked on the start page, so they aren't part of the selection.

### How the industry is decided

- From the home page's industry links (`/assess?industry=saas`), the industry
  is preset and the "Which industry…" question is hidden.
- From the plain `/assess` link, the respondent answers the identity question
  with answer type **`industry`**, and that answer picks the track.

---

## 9. Scoring

**`src/lib/scoring.ts`**: pure functions with no database access.

- Each scored answer becomes 1-5 (see the answer-type table above).
- **Overall score = weighted average** of scored answers, rounded to 1 decimal:
  `Σ(score × weight) / Σ(weight)`. Unanswered, unscored, and weight-0
  questions are skipped. Identity questions are always weight 0.
- Bands: ≥ 4.5 *Acquisition ready* · ≥ 3.5 *Nearly ready* · ≥ 2.5 *Needs work* ·
  ≥ 1.5 *Significant gaps* · otherwise *Not yet ready*.

The score is saved on `responses.score`, and each answer's score on
`answers.score`. That gives the future dashboard per-question data to group
by kind or tag.

---

## 10. The admin section and security

| Page | What you can do |
|---|---|
| `/admin` | Counts, plus the 20 most recent responses (click a score to see the results page). |
| `/admin/industries` | List industries; add a new one. |
| `/admin/industries/<id>` | Edit name, slug, description, and active flag; **choose the industry's tags**; manage short forms; delete. |
| `/admin/industries/<id>/order` | **Drag-and-drop question order** for this industry. |
| `/admin/industries/<id>/short-forms/<id>` | Name the short form and tick which questions it includes. |
| `/admin/questions` | Filter by search text, type, industry, and tag (a GET form, so filters live in the URL). |
| `/admin/questions/new`, `/admin/questions/<id>` | Create or edit a question. Fields adapt to the type: industry picker, tag checkboxes, options editor. |
| `/admin/tags` | Add, rename, and delete tags; see which industries use each. |

All admin writes are in **`src/app/admin/actions.ts`**. Each one:

1. **Re-checks admin credentials** (`requireAdmin()`).
2. Validates input (Zod for questions, simple checks elsewhere).
3. Writes inside a **transaction** when it touches several tables.
4. Calls `revalidatePath("/", "layout")` so every page shows fresh data on the
   next view.
5. Either `redirect()`s or returns `{ message }` / `{ error }`, which
   `<ActionForm>` shows above the form.

### Authentication (demo-grade)

- **`src/proxy.ts`** runs before any `/admin` request (like a servlet
  `Filter`) and requires **HTTP Basic Auth** (`ADMIN_USER`/`ADMIN_PASSWORD`
  in `.env`). The browser shows its built-in login box.
- **Why the actions check again:** Server Actions are HTTP endpoints, and
  Next.js lets them be POSTed to from *any* URL, not just `/admin/...`. A
  filter on the `/admin` path alone would leave them callable. Each admin
  action therefore calls `requireAdmin()` itself. Treat every Server Action as
  a public API endpoint.
- Survey respondents don't log in. Their response UUID is the access token.

Basic Auth is fine for a demo. For production, see the AWS section
(Amazon Cognito).

---

## 11. Rendering, streaming, and `loading.tsx`

This version of Next.js has **Cache Components** turned on (in
`next.config.ts`). The practical rules:

1. **Database reads happen on every request by default.** Nothing is cached
   unless you opt in with the `"use cache"` directive. This behaves like
   JSP/ASP, and this app never opts in, so data is always fresh.
2. **Static parts are prerendered at build time.** Anything that doesn't
   depend on data or the request (header, footer, home-page hero) is turned
   into HTML during `npm run build` and served instantly. The build output
   marks routes with `◐` (*Partial Prerender*): a static shell plus dynamic
   content streamed in per request.
3. **Data-dependent parts must be inside a `<Suspense>` boundary.** It gives
   React something to show while the data loads. Two ways to provide one:
   - **`loading.tsx`** in the route folder. Next.js wraps the page in
     `<Suspense fallback={<Loading/>}>` automatically. Every data-driven route
     here has a one-line `loading.tsx` that re-exports a spinner from
     `src/components/PageLoading.tsx`.
   - **An explicit `<Suspense>`** in the page. The home page does this: its
     hero is static, and only `<IndustryList>` waits for the database.

   If you add a page that reads the database and forget its `loading.tsx`, the
   **dev server warns** ("uncached data … outside of `<Suspense>`") in the
   terminal and the on-screen dev overlay. The page still works. Fix it by
   adding the file.

   *Why every route folder needs its own `loading.tsx`:* when you click from
   `/admin/questions` to `/admin/questions/5`, the boundary from a parent
   folder is already on screen, so React won't reuse it as a loading
   indicator. The new page needs its own boundary to show something instantly.

4. **HTTP status of not-found pages.** Because the page shell starts
   streaming before the database answers, a missing record (`notFound()`)
   still returns status **200** with the "Page not found" content. That's the
   trade-off of streaming. It's normal in modern
   Next.js and harmless here.

---

## 12. Database access, migrations, and seed data

### The connection pool (`src/db/index.ts`)

A single `pg.Pool` (max 10 connections) is created per server process, like a
JNDI `DataSource`. In development, Next.js reloads modules when you edit
files, so the pool is stored on `globalThis` to avoid opening a new one on
every save.

### Writing queries with Drizzle

Two styles, both type-checked against the schema:

```ts
// SQL-like builder: reads like the SQL it generates
await db.select().from(questions).where(eq(questions.kind, "core")).orderBy(asc(questions.id));

// Relational queries: nested data in one call, using the `relations` in schema.ts
await db.query.industries.findMany({ with: { shortForms: true } });
```

If you misspell a column, TypeScript flags it in your editor before you run
anything. Drizzle always uses bound parameters, so user input can't cause SQL
injection. When you need raw SQL, use ``sql`...` `` (see `seed.ts`).

### Changing the schema (migrations)

1. Edit `src/db/schema.ts` (add a column, a table, …).
2. `npm run db:generate`. Drizzle compares the schema with the last migration
   and writes a new SQL file in `drizzle/`. **Read it**, it's plain SQL.
3. `npm run db:migrate` applies it. Drizzle records applied migrations in a
   `drizzle.__drizzle_migrations` table, so each runs once.
4. Commit the SQL file. Every other environment (teammates, AWS) runs the same
   files.

### Seed data

`src/db/seed.ts` is a standalone Node script, run with `tsx`, which executes
TypeScript directly. It **truncates all tables** and inserts the demo
industries, tags, questions, and short forms. Edit the arrays at the top to
change demo content.

### Looking at the data

- `npm run db:studio` opens a web UI for browsing and editing tables.
- Or use psql inside the container:
  `docker exec -it readiness-db psql -U readiness -d readiness`
- Or any SQL client (DBeaver, pgAdmin, DataGrip) at `localhost:5432`, with
  user, password, and database all `readiness`.

---

## 13. Configuration

Settings come from **environment variables**, read with `process.env.NAME`.
Locally they live in `.env` (git-ignored; template in `.env.example`).
Next.js loads `.env` automatically. The standalone tools (`drizzle-kit`, the
seed script) load it themselves with Node's `process.loadEnvFile()`.

| Variable | Used for |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Admin Basic Auth. An empty password disables the check (local use only). |

Only variables prefixed `NEXT_PUBLIC_` are ever sent to the browser. None
are used here, so all of these stay server-side.

---

## 14. Common tasks

**Add a page.** Create `src/app/whatever/page.tsx` exporting a default
component, plus a `loading.tsx` if it queries the database. It's live at
`/whatever`.

**Add a column.** Edit `schema.ts`, then `npm run db:generate`, then
`npm run db:migrate`. Then use it. TypeScript shows you every place the types
changed.

**Add an answer type** (e.g. "number"):
1. Add it to the `answerType` enum in `schema.ts` and run a migration.
2. Render its input in `components/QuestionField.tsx`.
3. Score it in `lib/scoring.ts`.
4. Add a label in `components/Badges.tsx` (`ANSWER_TYPE_LABELS`).

TypeScript will point out any `switch` statements you missed.

**Rebrand.** Edit `src/lib/site.ts` and the colors at the top of
`src/app/globals.css`.

**Build the real dashboard.** Replace `DashboardPlaceholder` in
`src/app/results/[responseId]/page.tsx`. Per-answer scores are in
`answers.score`. Join to `questions` and `question_tags` to group by kind or
tag.

---

## 15. Debugging tips

- **Server-side `console.log` prints in the terminal** running `npm run dev`,
  not the browser console. Client Component logs go to the browser console.
- The **dev overlay** (red or orange badge, bottom-left of the browser) shows
  errors and warnings with source links.
- **VS Code debugging:** run `npm run dev` from a "JavaScript Debug Terminal"
  and set breakpoints in server code.
- **Is the database up?** `docker compose ps`. Postgres logs:
  `docker compose logs db`.
- **Port 5432 already in use?** You may have a local Postgres installed.
  Change the left side of `"5432:5432"` in `docker-compose.yml` (e.g.
  `"5433:5432"`) and the port in `DATABASE_URL`.
- **Weird stale build behavior:** stop the server, delete the `.next` folder,
  and start again.

---

## 16. Known demo limitations

- The recommendations dashboard is a placeholder (as requested).
- Admin auth is a single shared Basic Auth login, with no users, roles, or
  audit trail.
- No email is sent. The contact email is just stored.
- A respondent who abandons the survey leaves an "in progress" response
  behind. They can resume it via the same URL.
- No automated tests yet. The scoring and ordering logic in `src/lib/` is
  pure and easy to unit-test (e.g. with Vitest) when the time comes.
- Editing a question's options after people have answered changes how their
  stored option index reads. For production, consider versioning questions or
  storing the option label alongside the index.

---

# Part 2: Deploying to AWS

The good news: **the application code barely changes.** What changes is where
the pieces run, how they find each other, and how secrets get in.

## What maps to what

| Local (now) | On AWS |
|---|---|
| Postgres in a Docker container | **Amazon RDS for PostgreSQL** (managed: backups, patching, failover) |
| `npm run dev` / `npm start` on your laptop | The app in a **Docker container on Amazon ECS (Fargate)** behind an **Application Load Balancer**, or **AWS Amplify Hosting** |
| `.env` file | **AWS Secrets Manager** / **SSM Parameter Store**, injected as environment variables |
| `npm run db:migrate` by hand | A **migration step in the deploy pipeline** (one-off ECS task) |
| Basic Auth with a password in `.env` | **Amazon Cognito** (or keep Basic Auth with a strong secret, for a demo) |
| `http://localhost:3000` | Your domain via **Route 53**, HTTPS certificate from **ACM** |
| Terminal output | **CloudWatch Logs** |

## Recommended architecture: ECS Fargate + RDS

```mermaid
flowchart LR
    U[Users] -->|HTTPS| R53[Route 53 DNS]
    R53 --> ALB[Application Load Balancer<br/>ACM certificate]
    subgraph VPC
      subgraph Public subnets
        ALB
      end
      subgraph Private subnets
        ECS[ECS Fargate service<br/>Next.js container ×2]
        RDS[(RDS PostgreSQL)]
      end
    end
    ECS -->|5432| RDS
    ECS -.secrets.-> SM[Secrets Manager]
    ECS -.logs.-> CW[CloudWatch Logs]
    ECR[ECR image registry] -.image.-> ECS
```

**Why containers on ECS Fargate:** the app runs exactly as it does under
`npm start`, so every Next.js feature works (streaming, Server Actions,
`proxy.ts`). There's no adapter layer that has to keep up with new Next.js
versions, and you don't manage servers. It's the closest thing to "deploy my
WAR to Tomcat", with the container image as the WAR file.

**The simpler alternative, AWS Amplify Hosting:** connect the GitHub repo and
Amplify builds and hosts the app (it runs SSR on AWS-managed compute). There's
less to set up: no VPC, load balancer, or Dockerfile. The trade-offs:

- Amplify's support for the newest Next.js versions can lag. **Check
  Amplify's supported-versions page for Next.js 16** before choosing it.
- Connecting to a *private* RDS instance takes extra networking setup.

It's good for a demo. ECS is better for production.

## Step-by-step (ECS)

### 1. Networking (one time)

- A **VPC** with 2 public and 2 private subnets across 2 Availability Zones.
  The VPC console's "VPC and more" wizard creates this.
- **Security groups:**
  - `alb-sg`: allow 443 from the internet.
  - `app-sg`: allow 3000 **only from `alb-sg`**.
  - `db-sg`: allow 5432 **only from `app-sg`**.

  The database is never reachable from the internet.
- **NAT gateway**, or VPC endpoints for ECR, Secrets Manager, and CloudWatch
  Logs, so tasks in private subnets can pull images and read secrets.

### 2. Database: RDS for PostgreSQL

- Engine **PostgreSQL 16** (same major version as local), in the private
  subnets with `db-sg`. Turn on automated backups. Use Multi-AZ for
  production.
- Choose **"Manage master credentials in AWS Secrets Manager"**.
- Create the app's database (`readiness`) and, ideally, a separate
  least-privilege app user rather than using the master user.

### 3. Secrets

Store in Secrets Manager (or SSM Parameter Store SecureString):

| Name | Value |
|---|---|
| `DATABASE_URL` | `postgres://app_user:…@your-db.xxxx.us-east-1.rds.amazonaws.com:5432/readiness` |
| `ADMIN_PASSWORD` | A long random string (if keeping Basic Auth) |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Output of `openssl rand -base64 32`. **Required with more than one container.** See below. |

The ECS task definition's `secrets` section maps each one to an environment
variable. **No application code change is needed**, because the code already
reads `process.env`.

> Tip: node-postgres also reads the standard `PGHOST`, `PGUSER`,
> `PGPASSWORD`, and `PGDATABASE` variables. You can map those straight from
> the RDS-managed secret's JSON keys and leave `DATABASE_URL` unset.

### 4. Code and config changes

These are the only file changes needed:

**a) `next.config.ts`: produce a self-contained server bundle**

```ts
const nextConfig: NextConfig = {
  output: "standalone",                          // ← add: minimal server + only needed node_modules
  deploymentId: process.env.DEPLOYMENT_VERSION,   // ← add: version-skew protection during rolling deploys
  cacheComponents: true,
  partialPrefetching: true,
  // …
};
```

**b) `src/db/index.ts`: TLS to RDS.** RDS requires encrypted connections by
default. Either add `?sslmode=no-verify` to `DATABASE_URL` (encrypted, but
doesn't verify the server certificate; acceptable for a demo inside a VPC),
or do it properly by verifying against the RDS certificate bundle:

```ts
import fs from "node:fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Download https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem into the image
  ssl: process.env.DB_CA_PATH ? { ca: fs.readFileSync(process.env.DB_CA_PATH, "utf8") } : undefined,
});
```

Also size `max` with the database in mind: **containers × max** must stay
under RDS's `max_connections`. For example, 4 tasks × 10 = 40 is fine on a
small instance. For many containers or bursty traffic, put **RDS Proxy** in
front of the database.

**c) Add a `Dockerfile`** (new file):

```dockerfile
# ---- dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build
FROM deps AS build
COPY . .
RUN npm run build

# ---- migrations: runs `drizzle-kit migrate` as a one-off task
FROM deps AS migrator
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
COPY src/db/schema.ts ./src/db/schema.ts
CMD ["npx", "drizzle-kit", "migrate"]

# ---- runtime: small image with only what the server needs
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

Plus a **`.dockerignore`** containing `node_modules`, `.next`, `.env`, and
`.git`, so local files and secrets never end up in the image.

You can test it locally before touching AWS:

```bash
docker build --target runtime -t readiness-app .
docker run -p 3000:3000 --env-file .env -e DATABASE_URL=postgres://readiness:readiness@host.docker.internal:5432/readiness readiness-app
```

The build doesn't need database access. Pages that read data render at
request time, which this project's build already confirms. So CI/CD doesn't
need a route to RDS for building, only for migrating.

### 5. ECS service

- **ECR**: create repositories for `readiness-app` and `readiness-migrator`
  and push both images.
- **Task definition** (Fargate, e.g. 0.5 vCPU / 1 GB): container port 3000,
  `secrets` from step 3, the `awslogs` log driver to CloudWatch, and a health
  check on `/`.
- **Service**: 2+ tasks in private subnets with `app-sg`, attached to an ALB
  target group (health check path `/`). Enable auto scaling on CPU if needed.
- **ALB**: HTTPS listener on 443 with an **ACM** certificate, plus HTTP→HTTPS
  redirect. ALBs pass streamed responses through, so `loading.tsx` streaming
  works as it does locally.
- **Route 53**: an alias record for your domain pointing to the ALB.

### 6. Migrations on each deploy

Order matters: **migrate first, then roll out the new app version.** In your
pipeline (GitHub Actions or AWS CodePipeline):

1. Build and push both images, tagged with the git commit SHA.
2. `aws ecs run-task` the **migrator** image (same subnets and security group
   as the app, same `DATABASE_URL` secret). Wait for exit code 0.
3. `aws ecs update-service` to the new app image. ECS does a rolling
   deployment with no downtime.

Keep migrations **backward-compatible** (add columns and tables first, remove
later), because old and new containers run side by side for a few minutes
during a rollout.

Seed data: run `npm run db:seed` **only once** against a fresh demo database,
for example from the migrator image with the command overridden to
`npx tsx src/db/seed.ts` (copy `src/db/seed.ts` into that stage). Never run
it against production. It deletes everything.

### 7. Running more than one container: what to know

| Concern | Why | What to do |
|---|---|---|
| Server Action encryption key | Each build generates its own key. Containers from different builds can't decrypt each other's action payloads. | Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to the same value everywhere (step 3). |
| Version skew | During a rollout, a browser with the old page may talk to a new container. | Set `deploymentId` (step 4a) to the commit SHA via `DEPLOYMENT_VERSION`. |
| Caching | Next.js's built-in cache is per-container memory. | Nothing to do today: this app doesn't use `"use cache"`. If you add caching later, use `'use cache: remote'` with a shared cache handler (e.g. ElastiCache/Redis). |
| Sessions | | None needed. Respondents use UUID links, and Basic Auth is stateless. With Cognito, sessions live in signed cookies. |
| Static assets | `/_next/static/*` files are fingerprinted and immutable. | Optional: put **CloudFront** in front of the ALB to cache them at the edge. |

### 8. Authentication for real admins

Replace Basic Auth with **Amazon Cognito**:

- Create a Cognito user pool (admins only, no self sign-up).
- Use **Auth.js** (`next-auth`) with its Cognito provider, or the AWS Amplify
  auth library, for the login flow.
- In `src/proxy.ts`, redirect to the login page when there's no valid session
  instead of returning a 401.
- In `requireAdmin()` (`src/app/admin/actions.ts`), check the session instead
  of the Basic Auth header. The structure stays the same: the filter guards
  pages, and each action re-checks.

An alternative with no app code: an ALB listener rule with
**`authenticate-cognito`** in front of `/admin*`. The ALB handles login before
requests reach the app. Because of the Server Actions caveat in
[section 10](#10-the-admin-section-and-security), you'd still have the
actions verify the user, using the `x-amzn-oidc-data` header the ALB adds.

### 9. Operations checklist

- **Logs:** CloudWatch Logs (everything written by `console.log` on the
  server).
- **Alarms:** ALB 5xx count, ECS CPU and memory, RDS CPU and free storage,
  RDS connections.
- **Backups:** RDS automated backups (7-35 days) plus snapshots before risky
  migrations.
- **Infrastructure as code:** define all of the above in **AWS CDK** or
  **Terraform** rather than clicking through the console, so environments
  (staging, production) are reproducible.
- **Rough cost** for a small demo (us-east-1, on-demand): RDS `db.t4g.micro`
  ~$15/mo, 2 small Fargate tasks ~$20-30/mo, ALB ~$20/mo, and a NAT gateway
  ~$35/mo. That's roughly **$90-100/month**, and most of it is fixed overhead.
  Amplify Hosting plus a small RDS instance is cheaper for low traffic.

## Summary of changes for AWS

| File | Change |
|---|---|
| `next.config.ts` | Add `output: "standalone"` and `deploymentId` |
| `src/db/index.ts` | Add TLS (`ssl`) settings for RDS; tune pool size |
| `Dockerfile`, `.dockerignore` | New: build runtime and migrator images |
| CI/CD workflow (e.g. `.github/workflows/deploy.yml`) | New: build → push → migrate → deploy |
| `src/proxy.ts`, `requireAdmin()` | Only if moving from Basic Auth to Cognito |
| `.env` | Not deployed. Its values move to Secrets Manager. |

Everything else (pages, components, schema, migrations, business logic) is
unchanged.
