# musicdesigner

A polished, music-focused graphic design portfolio built with Next.js, Express, and MySQL. The public site presents curated project galleries, case studies, services, biography, and contact details. An authenticated administrator dashboard manages portfolio projects through a standalone HTTPS API.

The canonical frontend URL is:

- <https://musicdesigner.geo-drops.com>

## Features

- Responsive music-industry portfolio and case-study presentation
- Category filtering and accessible project dialogs
- Static portfolio fallback data when the API is unavailable
- Runtime loading of published projects from MySQL
- Session-based signup, login, logout, and authentication status
- First-account administrator provisioning
- Protected project creation, editing, publishing, ordering, and deletion
- MySQL-backed persistent sessions
- Credentialed CORS for approved HTTPS origins
- Standalone HTTPS Express API
- PM2-ready Next.js production deployment

## Prerequisites

Install the following before setting up the application:

- Node.js 18.18 or newer
- npm
- MySQL 8 or a compatible MySQL release with JSON column support
- Trusted TLS certificate and private key for the API
- PM2 for the documented production process setup
- A Unix-like environment for `START.sh`

The database account used during schema installation must be able to create tables and indexes. The runtime account needs permission to read and modify the application tables.

## Installation

Clone or copy the project, enter its root directory, and install dependencies:

```bash
npm install
```

The available npm scripts are:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create the production `.next` build |
| `npm run start` | Start the built Next.js application |
| `npm run server` | Start the standalone HTTPS Express API |

There are no separate frontend and backend dependency installations. All dependencies are installed from the root `package.json`.

## Environment configuration

Copy the supplied example file:

```bash
cp .env.example .env
```

Configure every variable in `.env` before production use.

| Variable | Used by | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Next.js browser client | HTTPS base origin of the Express API. Do not append `/api`; client methods add endpoint paths. |
| `BACKEND_PORT` | Express API | TCP port used by the standalone HTTPS server. |
| `DB_HOST` | Express API | Hostname or IP address of the MySQL server. |
| `DB_USER` | Express API | MySQL username. |
| `DB_PASSWORD` | Express API | Password for the MySQL account. |
| `DB_NAME` | Express API | Database containing users, sessions, and projects. |
| `SESSION_SECRET` | Express API | Long, random value used to sign session cookies. |
| `NODE_ENV` | Next.js and Express | Runtime mode. Use `production` for deployed services and `development` for local development. |
| `PORT` | Next.js | Next.js listening port. The provided PM2 configuration sets it to `5095`. |

Do not commit `.env`. The repository ignores local environment files while retaining `.env.example`.

`NEXT_PUBLIC_API_URL` is a public browser setting, not a secret. Next.js embeds public environment values into browser assets, so rebuild the frontend after changing it for a production deployment.

In production, the API accepts credentialed requests from HTTPS origins under `*.geo-drops.com`. Development mode additionally permits supported localhost origins. The browser client includes credentials so that the API session cookie is sent with authentication and administration requests.

## MySQL setup

Create the database named by `DB_NAME` before importing the schema. The database should use `utf8mb4`.

Import `schema.sql` into the selected database:

```bash
mysql --default-character-set=utf8mb4 \
  -h "$DB_HOST" \
  -u "$DB_USER" \
  -p \
  "$DB_NAME" < schema.sql
```

The schema creates:

- `users`
  - Unique normalized email addresses
  - Password hashes
  - Display names
  - `admin` and `member` roles
  - Creation and update timestamps
- `sessions`
  - Express session identifiers
  - Serialized session data
  - Expiration timestamps and expiration indexes
- `projects`
  - Unique project slugs
  - Portfolio descriptions and metadata
  - JSON service and gallery arrays
  - Cover artwork URLs
  - Featured and published flags
  - Display ordering
  - Project ownership
  - Creation and update timestamps

The API does not create the database or schema automatically. Run `schema.sql` before starting the API.

## HTTPS certificate placement

The Express server reads its certificate files from these exact locations:

```text
/home/arx-app/backends/certs/certificate.crt
/home/arx-app/backends/certs/private.key
```

Place the server certificate or full certificate chain in `certificate.crt` and the matching private key in `private.key`.

The account running the API must be able to read both files. Restrict private-key permissions appropriately. The API always starts as HTTPS; there is no HTTP fallback and no environment variable for changing these certificate paths.

For local development, the same paths must exist. If a development certificate is used, trust it in the browser and ensure it is valid for the hostname used by `NEXT_PUBLIC_API_URL`. Otherwise, browser API requests may fail even when the server itself is running.

## Running locally

### 1. Start MySQL

Ensure MySQL is reachable and that `schema.sql` has been imported.

### 2. Start the HTTPS API

From the project root:

```bash
npm run server
```

The API listens on the port supplied by `BACKEND_PORT`.

A different API port can be selected for a single invocation:

```bash
BACKEND_PORT=3443 npm run server
```

Verify API availability through its HTTPS health endpoint:

```text
GET /health
```

A healthy server returns:

```json
{"status":"ok"}
```

### 3. Start the Next.js development server

In another terminal:

```bash
npm run dev
```

Ensure `NEXT_PUBLIC_API_URL` points to the HTTPS API origin available to the browser.

To use a different local frontend port independently of the package script, invoke Next.js directly:

```bash
npx next dev -p 3000
```

A local frontend and API can also be launched with one-off public settings:

```bash
NEXT_PUBLIC_API_URL=https://localhost:3443 npx next dev -p 3000
```

The API must accept the frontend origin, and the browser must trust the API certificate.

## Production build and startup

Create the deployable Next.js build:

```bash
npm run build
```

The generated application is stored in `.next`.

Start the built frontend:

```bash
npm run start
```

The API is a separate process and must also be running:

```bash
npm run server
```

For a one-off production frontend port override, start Next.js directly after building:

```bash
PORT=3000 npx next start
```

For a one-off API port override:

```bash
BACKEND_PORT=3443 npm run server
```

Environment variables supplied by the shell take precedence over values loaded from `.env`.

## Detached API startup

`START.sh` changes to the application directory and launches the API through `npm run server` as a detached background process. It records the API process ID and redirects output to its configured log file.

Ensure the script is executable:

```bash
chmod +x START.sh
```

Start the API:

```bash
./START.sh
```

Check the recorded log if the API does not start. Common causes include:

- Missing certificate files
- Invalid certificate or private-key permissions
- Unavailable MySQL server
- Incorrect database credentials
- Missing database tables
- Occupied `BACKEND_PORT`
- Missing `SESSION_SECRET`

`START.sh` starts only the Express API. It does not start the Next.js frontend.

## PM2 deployment

The included `ecosystem.config.js` runs the frontend with these fixed deployment properties:

- Application name: `musicdesigner`
- Working directory: `/home/arx-app/backends/musicdesigner`
- Executable: `node_modules/.bin/next`
- Arguments: `start`
- `NODE_ENV`: `production`
- `PORT`: `5095`

Deploy the project at the required working directory:

```bash
cd /home/arx-app/backends/musicdesigner
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs musicdesigner
pm2 restart musicdesigner
pm2 stop musicdesigner
pm2 delete musicdesigner
```

The PM2 configuration manages only the Next.js frontend. Start and supervise the HTTPS API separately, such as with `START.sh` or an additional system service.

After changing frontend code or `NEXT_PUBLIC_API_URL`, rebuild and restart:

```bash
npm run build
pm2 restart musicdesigner
```

## Authentication and administrator provisioning

The first successfully registered user is assigned the `admin` role. Every subsequently registered account receives the `member` role.

Only administrators can:

- View all projects, including unpublished projects
- Create projects
- Update projects
- Publish or unpublish projects
- Delete projects

The first-user rule depends on the contents of the `users` table. If all user records are removed, the next successful signup becomes the administrator. Protect database access and complete the first signup immediately after a new installation.

Passwords are stored as bcrypt hashes. Authentication regenerates the session to reduce session-fixation risk. Session records are persisted in MySQL and survive normal API process restarts until they expire or are destroyed.

In production, session cookies are secure and therefore require HTTPS.

## API endpoints

All API request and error responses use JSON.

### Health

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Verify that the HTTPS API process is running |

The health endpoint does not depend on portfolio project availability.

### Authentication

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | Create an account and establish a session |
| `POST` | `/api/auth/login` | Public | Authenticate and establish a session |
| `POST` | `/api/auth/logout` | Authenticated | Destroy the current session |
| `GET` | `/api/auth/me` | Authenticated | Return the current safe user profile |

Signup accepts display name, email, and password values. Login accepts email and password values. Authentication responses exclude password hashes.

Browser requests must include credentials for sessions to work. The included API client does this automatically.

### Public projects

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/projects` | Public | List published projects |
| `GET` | `/api/projects/:slug` | Public | Retrieve one published project by slug |

Public listing returns only published projects and applies stable featured and display-order sorting.

### Project administration

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/projects/admin/all` | Administrator | List published and unpublished projects |
| `POST` | `/api/projects` | Administrator | Create a project |
| `PATCH` | `/api/projects/:id` | Administrator | Update a project |
| `DELETE` | `/api/projects/:id` | Administrator | Delete a project |

Project create and update payloads support:

- `title`
- `slug`
- `category`
- `summary`
- `description`
- `client`
- `year`
- `services`
- `coverUrl`
- `gallery`
- `featured`
- `published`
- `sortOrder`

`services` and `gallery` are normalized as arrays. Slugs must be unique. Invalid fields, duplicate slugs, missing authentication, insufficient privileges, and missing records produce appropriate JSON error responses.

## Runtime portfolio fallback

The public homepage does not make API requests during the Next.js build or server render.

The portfolio gallery behaves as follows:

1. It initially renders the curated projects exported by `data/portfolio.js`.
2. After the component mounts in the browser, it requests published projects from the API.
3. If the request succeeds, API-backed projects replace the fallback gallery.
4. If the API is unavailable or the request fails, the static gallery remains visible.

This allows the public portfolio to remain useful during API or database outages and prevents backend availability from blocking a frontend build.

The fallback applies only to the public portfolio gallery. Authentication and the administrator dashboard require a working API and database. Those interfaces report unavailable, unauthenticated, or unauthorized states rather than presenting static administrative data.

## Production considerations

- Use a long, randomly generated `SESSION_SECRET`.
- Serve both the frontend and API over HTTPS.
- Set `NODE_ENV` to `production`.
- Keep the certificate private key readable only by the API service account.
- Ensure the frontend origin is allowed by the API CORS policy.
- Set `NEXT_PUBLIC_API_URL` before running `npm run build`.
- Keep MySQL inaccessible from untrusted networks.
- Back up the `users`, `sessions`, and `projects` tables.
- Avoid clearing the `users` table unintentionally because doing so resets first-user administrator provisioning.
- Rebuild the frontend after changing public environment variables.
- Use the health endpoint for API process monitoring.
- Review API and PM2 logs after deployment changes.

## Project structure

```text
musicdesigner/
├── .env.example
│   └── Environment variable template
├── .gitignore
│   └── Git exclusions for dependencies, builds, environments, logs, and local files
├── README.md
│   └── Installation, operation, API, and deployment documentation
├── START.sh
│   └── Detached HTTPS API startup script
├── ecosystem.config.js
│   └── PM2 configuration for the production Next.js frontend
├── next.config.js
│   └── Production-ready Next.js configuration
├── package.json
│   └── Application scripts and frontend/backend dependencies
├── schema.sql
│   └── MySQL users, sessions, and portfolio projects schema
├── app/
│   ├── globals.css
│   │   └── Complete responsive visual system and component styling
│   ├── layout.jsx
│   │   └── Root layout, metadata, providers, header, and footer
│   ├── not-found.jsx
│   │   └── Branded accessible 404 page
│   ├── page.jsx
│   │   └── Public one-page portfolio composition
│   ├── admin/
│   │   └── page.jsx
│   │       └── Protected portfolio administration route
│   ├── login/
│   │   └── page.jsx
│   │       └── Existing-user authentication route
│   └── signup/
│       └── page.jsx
│           └── Account creation and first-administrator guidance route
├── components/
│   ├── AboutServices.jsx
│   │   └── Biography, approach, statistics, and service presentation
│   ├── AdminDashboard.jsx
│   │   └── Authenticated project administration workspace
│   ├── AuthForm.jsx
│   │   └── Login and signup form implementation
│   ├── AuthProvider.jsx
│   │   └── Browser-runtime authentication context
│   ├── ContactSection.jsx
│   │   └── Contact, social, and availability calls to action
│   ├── Hero.jsx
│   │   └── Music-art-direction landing hero
│   ├── PortfolioGallery.jsx
│   │   └── Runtime project loading, fallback data, filtering, and modal state
│   ├── ProjectCard.jsx
│   │   └── Accessible portfolio project card
│   ├── ProjectEditor.jsx
│   │   └── Controlled project create and edit form
│   ├── ProjectModal.jsx
│   │   └── Accessible portal-based project case-study dialog
│   ├── SiteFooter.jsx
│   │   └── Branded footer and portfolio links
│   └── SiteHeader.jsx
│       └── Responsive navigation and authentication controls
├── data/
│   └── portfolio.js
│       └── Designer profile, services, contacts, and fallback projects
├── lib/
│   └── api.js
│       └── Credentialed browser API client
└── server/
    ├── index.js
    │   └── HTTPS Express application and graceful process lifecycle
    ├── config/
    │   ├── db.js
    │   │   └── Shared mysql2 promise pool and connection check
    │   └── sessionStore.js
    │       └── MySQL-backed express-session store
    ├── controllers/
    │   ├── authController.js
    │   │   └── Signup, login, logout, and current-user handlers
    │   └── projectController.js
    │       └── Public and administrator project handlers
    ├── middleware/
    │   ├── auth.js
    │   │   └── Authentication and administrator authorization middleware
    │   └── errors.js
    │       └── JSON not-found and centralized error handling
    └── routes/
        ├── auth.js
        │   └── Authentication endpoint router
        ├── health.js
        │   └── Independent health-check router
        └── projects.js
            └── Public and protected portfolio project router
```