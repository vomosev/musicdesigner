# Integration Notes for musicdesigner

## Overview

`musicdesigner` is a full-stack music-focused graphic design portfolio. It includes:

- A responsive Next.js App Router frontend with project galleries, category filters, case-study modals, biography, services, contact details, and static fallback content.
- Client-side runtime loading of published portfolio projects from an Express API.
- An HTTPS Express server backed by MySQL.
- Session-based authentication with persistent MySQL sessions.
- An administrator dashboard for creating, updating, publishing, ordering, and deleting projects.
- Graceful public-site fallback behavior when the API or database is unavailable.

The canonical frontend URL is:

- `https://musicdesigner.geo-drops.com`

The example public API URL is:

- `https://musicdesigner-api.geo-drops.com:5095`

Public portfolio pages do not make build-time or server-side API requests. They initially render the fallback projects from `data/portfolio.js`, then request current published projects after the browser mounts.

## Prerequisites

Install or provide the following before deployment:

- Node.js 18.18 or newer; Node.js 20 LTS is recommended.
- npm.
- MySQL 8.x or a compatible MySQL server.
- A MySQL database and account with permissions on the application database.
- HTTPS certificate and private-key files readable by the API process.
- PM2 for the prescribed frontend production deployment:
  ```bash
  npm install --global pm2
  ```
- A Linux environment for `START.sh` and the prescribed deployment paths.

The API expects its TLS files at these exact paths:

```text
/home/arx-app/backends/certs/certificate.crt
/home/arx-app/backends/certs/private.key
```

Create the certificate directory if necessary:

```bash
sudo mkdir -p /home/arx-app/backends/certs
```

Place the certificate and key there, then restrict private-key access while ensuring that the account running the API can read it:

```bash
sudo chmod 644 /home/arx-app/backends/certs/certificate.crt
sudo chmod 600 /home/arx-app/backends/certs/private.key
```

The certificate must be valid for the hostname through which browsers access the API.

The required PM2 configuration assumes the application is installed at:

```text
/home/arx-app/backends/musicdesigner
```

## Installation

### 1. Place the project in the deployment directory

```bash
mkdir -p /home/arx-app/backends
cd /home/arx-app/backends
```

Clone or copy the generated project so that its root is:

```text
/home/arx-app/backends/musicdesigner
```

Then enter the project:

```bash
cd /home/arx-app/backends/musicdesigner
```

### 2. Install Node.js dependencies

Install the frontend and backend dependencies from the root `package.json`:

```bash
npm install
```

The package includes the required Next.js, React, Express, CORS, dotenv, mysql2, express-session, and bcrypt dependencies.

### 3. Configure the environment

Copy the provided template:

```bash
cp .env.example .env
```

Edit `.env` and replace all placeholder credentials and secrets:

```bash
nano .env
```

Do not commit `.env`. The repository’s `.gitignore` excludes local environment files while retaining `.env.example`.

Because `NEXT_PUBLIC_API_URL` is a public Next.js variable, set its production value before running `npm run build`. Public variables may be embedded into browser assets during the build. Rebuild the frontend after changing this value.

### 4. Create the MySQL database and account

Connect with a MySQL administrative account:

```bash
mysql -u root -p
```

Create the database and a dedicated application user. Replace the sample password:

```sql
CREATE DATABASE musicdesigner
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'musicdesigner_user'@'127.0.0.1'
  IDENTIFIED BY 'replace-with-a-secure-password';

GRANT ALL PRIVILEGES ON musicdesigner.*
  TO 'musicdesigner_user'@'127.0.0.1';

FLUSH PRIVILEGES;
EXIT;
```

If the API connects from another host, create or authorize the account for that host rather than `127.0.0.1`.

Import the supplied schema:

```bash
mysql -h 127.0.0.1 -u musicdesigner_user -p musicdesigner < schema.sql
```

The schema creates UTF-8 tables for:

- Users and administrator/member roles.
- Persistent sessions and expiration indexes.
- Portfolio projects, publication and featured flags, ordering, ownership, JSON services and galleries, and timestamps.

There is no separate migration runner, so apply `schema.sql` before starting the API.

### 5. Install HTTPS certificates

Confirm that both required files exist:

```bash
ls -l \
  /home/arx-app/backends/certs/certificate.crt \
  /home/arx-app/backends/certs/private.key
```

The Express API starts as an HTTPS server and will not start successfully if these files are absent, invalid, or unreadable.

### 6. Build the Next.js frontend

From the project root:

```bash
npm run build
```

This creates the production `.next` directory using the configuration in `next.config.js`.

## Environment Variables

All variables are represented in `.env.example`. Store real values in `.env` and keep that file out of version control.

### `NEXT_PUBLIC_API_URL`

Public HTTPS base URL used by browser code to call the Express API at runtime.

Example:

```dotenv
NEXT_PUBLIC_API_URL=https://musicdesigner-api.geo-drops.com:5095
```

Do not add a trailing `/api` unless the client implementation is changed; `lib/api.js` appends the endpoint paths itself. Set this before `npm run build`.

If omitted, `lib/api.js` uses its configured production API fallback.

### `BACKEND_PORT`

Port on which the standalone HTTPS Express API listens.

Example:

```dotenv
BACKEND_PORT=5095
```

This port must be available to the API process. If a reverse proxy exposes the API publicly, `BACKEND_PORT` may be an internal port while `NEXT_PUBLIC_API_URL` points to the external HTTPS address.

### `DB_HOST`

Hostname or IP address of the directly accessible MySQL server.

Example:

```dotenv
DB_HOST=127.0.0.1
```

The API uses a direct `mysql2/promise` connection pool and does not use an HTTP database gateway.

### `DB_USER`

MySQL account username used by the Express API.

Example:

```dotenv
DB_USER=musicdesigner_user
```

The account needs access to the users, sessions, and projects tables in `DB_NAME`.

### `DB_PASSWORD`

Password for the MySQL account.

Example:

```dotenv
DB_PASSWORD=replace-with-a-secure-password
```

Use a strong unique password and do not place it in `.env.example`, source control, logs, or client-side variables.

### `DB_NAME`

Name of the MySQL database containing portfolio, user, and session records.

Example:

```dotenv
DB_NAME=musicdesigner
```

Import `schema.sql` into this database.

### `SESSION_SECRET`

Long random secret used to sign Express session cookies.

Example:

```dotenv
SESSION_SECRET=replace-with-a-long-random-secret
```

Generate a strong value, for example:

```bash
openssl rand -base64 48
```

Changing this secret invalidates existing signed sessions.

### `NODE_ENV`

Runtime environment controlling production cookie security and development-only CORS behavior.

Production example:

```dotenv
NODE_ENV=production
```

Use `development` only for local development. Production mode enables the production-oriented session and error-handling behavior.

### `PORT`

Next.js listening port supplied by the required PM2 configuration.

Example:

```dotenv
PORT=5095
```

The provided `ecosystem.config.js` explicitly sets `NODE_ENV` to `production` and `PORT` to `5095` for the PM2-managed frontend process.

### Example `.env`

```dotenv
NEXT_PUBLIC_API_URL=https://musicdesigner-api.geo-drops.com:5095
BACKEND_PORT=5095
DB_HOST=127.0.0.1
DB_USER=musicdesigner_user
DB_PASSWORD=replace-with-a-secure-password
DB_NAME=musicdesigner
SESSION_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
PORT=5095
```

Do not run the frontend and API on the same host/interface and the same port. Although both example port values are `5095`, two processes cannot bind the same address and port simultaneously. Use one of these production arrangements:

- Run the frontend and API on separate hosts.
- Assign the API a different internal `BACKEND_PORT` and route its public API hostname through a reverse proxy.
- Assign the frontend a different local port when not using the prescribed PM2 configuration.

## Running the Application

### Development

The frontend and API are separate processes. Open two terminals in the project root.

Start the HTTPS API:

```bash
npm run server
```

Start the Next.js development server:

```bash
npm run dev
```

If a local port must be overridden independently of a pinned package script, Next.js can be launched directly:

```bash
npx next dev -p 3000
```

Configure `NEXT_PUBLIC_API_URL` to use the local HTTPS API URL, then rebuild or restart the development server after changing it.

Development CORS permits supported localhost origins only when `NODE_ENV=development`. The API still uses HTTPS and still requires the certificate files at the prescribed paths. Browsers must trust the development certificate before credentialed API calls will work reliably.

### Production frontend

Build the frontend:

```bash
npm run build
```

Start it with the package script:

```bash
npm run start
```

The production build must exist before `npm run start` is run.

### Production API

Run the API in the foreground:

```bash
NODE_ENV=production npm run server
```

Alternatively, make the supplied launcher executable and use it to start the API as a detached background task:

```bash
chmod +x START.sh
./START.sh
```

`START.sh` changes to the application directory, starts `npm run server` in the background, and records the API process log and PID. Use the PID file produced by the script when stopping or supervising that detached process.

Before startup, the API:

1. Loads `.env` through dotenv.
2. Initializes the MySQL pool.
3. Checks the database connection.
4. Configures the MySQL-backed session store.
5. Loads the HTTPS certificate and private key.
6. Starts listening on `BACKEND_PORT`.

A failed database connection or missing certificate prevents normal API startup.

### PM2 frontend deployment

The supplied `ecosystem.config.js` is a CommonJS PM2 configuration that:

- Names the process `musicdesigner`.
- Uses `/home/arx-app/backends/musicdesigner` as its working directory.
- Runs `node_modules/.bin/next`.
- Passes the `start` argument.
- Sets `NODE_ENV=production`.
- Sets `PORT=5095`.

Build first, then launch PM2:

```bash
cd /home/arx-app/backends/musicdesigner
npm install
npm run build
pm2 start ecosystem.config.js
```

Inspect the process:

```bash
pm2 status
pm2 logs musicdesigner
```

Restart after a deployment:

```bash
npm install
npm run build
pm2 restart musicdesigner
```

Persist the PM2 process list and configure startup:

```bash
pm2 save
pm2 startup
```

Run the additional command printed by `pm2 startup` with the requested privileges.

The PM2 file manages the Next.js frontend only. Start or supervise the Express API separately with `START.sh`, a second process manager entry, or a system service.

### Health check

Once the API is running, verify it independently of portfolio data:

```bash
curl --insecure https://localhost:${BACKEND_PORT}/health
```

For a valid publicly trusted certificate, omit `--insecure` and use the certificate’s hostname:

```bash
curl https://musicdesigner-api.geo-drops.com:5095/health
```

Expected response:

```json
{"status":"ok"}
```

The health endpoint does not depend on portfolio records being available.

### Administrator initialization

The first successfully registered user is assigned the `administrator` role. All later signups receive the `member` role.

Initialize the first account in a controlled deployment window:

1. Start the database and API.
2. Open `/signup`.
3. Register the intended administrator before exposing signup publicly.
4. Sign in at `/login`.
5. Open `/admin`.

Administrator authorization is enforced by the API, not only by frontend route controls. Members can authenticate but cannot use administrator-only project management endpoints.

### API endpoints

#### Health

- `GET /health` — return API health status.

#### Authentication

- `POST /api/auth/signup` — create an account; the first user becomes administrator.
- `POST /api/auth/login` — authenticate and create a persistent session.
- `POST /api/auth/logout` — destroy the authenticated session.
- `GET /api/auth/me` — return safe fields for the authenticated user.

#### Public projects

- `GET /api/projects` — list published projects.
- `GET /api/projects/:slug` — retrieve one published project by slug.

#### Administrator projects

- `GET /api/projects/admin/all` — list all projects, including unpublished projects.
- `POST /api/projects` — create a project.
- `PATCH /api/projects/:id` — update a project.
- `DELETE /api/projects/:id` — delete a project.

The admin listing route is declared before the slug route so that `admin/all` is not interpreted as a project slug.

Browser requests include session credentials. Production frontend and API URLs must therefore use HTTPS, and the API’s credentialed CORS policy must allow the frontend origin. Production CORS accepts supported HTTPS origins under `*.geo-drops.com`; localhost support is development-only.

### Runtime fallback behavior

The public homepage remains usable if the API is down:

1. `app/page.jsx` renders without a build-time API request.
2. `components/PortfolioGallery.jsx` initially uses projects from `data/portfolio.js`.
3. After browser mount, it requests published projects from the API.
4. Successful API data replaces the fallback list.
5. API failures are tolerated silently and the fallback portfolio remains visible.

Authentication and the administrator dashboard require a working API and database. Their unavailable or unauthorized states are presented separately from the public fallback experience.

## Project Structure

```text
musicdesigner/
├── app/
│   ├── admin/page.jsx
│   ├── login/page.jsx
│   ├── signup/page.jsx
│   ├── globals.css
│   ├── layout.jsx
│   ├── not-found.jsx
│   └── page.jsx
├── components/
├── data/
│   └── portfolio.js
├── lib/
│   └── api.js
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── index.js
├── .env.example
├── .gitignore
├── ecosystem.config.js
├── next.config.js
├── package.json
├── README.md
├── schema.sql
└── START.sh
```

### Frontend application

- `app/layout.jsx` — root App Router layout, canonical metadata, global styles, authentication provider, header, main content, and footer.
- `app/page.jsx` — public one-page composition of the hero, portfolio, biography/services, and contact sections.
- `app/globals.css` — responsive visual system for public pages, modals, forms, dashboard tables, focus states, loading states, mobile layouts, and reduced motion.
- `app/login/page.jsx` — existing-user login route.
- `app/signup/page.jsx` — account creation route with first-account administrator guidance.
- `app/admin/page.jsx` — protected administration route that delegates runtime behavior to `AdminDashboard`.
- `app/not-found.jsx` — branded accessible 404 page.

### Components

- `components/AuthProvider.jsx` — browser-only session resolution and shared login, signup, logout, and refresh actions.
- `components/AuthForm.jsx` — validated login/signup form with navigation and API error handling.
- `components/SiteHeader.jsx` — sticky responsive navigation and context-aware authentication controls.
- `components/SiteFooter.jsx` — canonical URL, navigation, social links, and contact details.
- `components/Hero.jsx` — primary music-art-direction presentation and calls to action.
- `components/PortfolioGallery.jsx` — fallback-first runtime project loading, filtering, and modal selection.
- `components/ProjectCard.jsx` — accessible portfolio project summary card.
- `components/ProjectModal.jsx` — accessible portal-based case-study dialog with focus and scroll management.
- `components/AboutServices.jsx` — biography, experience, approach, and service listing.
- `components/ContactSection.jsx` — email, availability, and social calls to action.
- `components/AdminDashboard.jsx` — authentication checks and project administration.
- `components/ProjectEditor.jsx` — controlled create/edit form and project-payload normalization.

### Static data and API client

- `data/portfolio.js` — designer profile, services, contact information, social links, and fallback project data matching the API shape.
- `lib/api.js` — credentialed API request helper and authentication/project client methods.

### Express backend

- `server/index.js` — HTTPS Express bootstrap, CORS, sessions, routing, database verification, errors, and graceful shutdown.
- `server/config/db.js` — shared `mysql2/promise` pool configured from the database environment variables.
- `server/config/sessionStore.js` — persistent MySQL implementation of the Express session store.
- `server/controllers/authController.js` — signup, login, logout, session regeneration, password hashing, and current-user behavior.
- `server/controllers/projectController.js` — public and administrative project queries and mutations.
- `server/middleware/auth.js` — authenticated-user and administrator authorization middleware.
- `server/middleware/errors.js` — JSON 404 and centralized error handlers.
- `server/routes/health.js` — independent `GET /health` route.
- `server/routes/auth.js` — authentication route definitions.
- `server/routes/projects.js` — public and administrator project route definitions.

### Deployment and configuration

- `schema.sql` — initial MySQL database schema.
- `.env.example` — non-secret environment variable template.
- `next.config.js` — production Next.js configuration with strict mode and standard `.next` output.
- `package.json` — root scripts and full-stack dependencies.
- `ecosystem.config.js` — prescribed PM2 configuration for the production frontend.
- `START.sh` — detached HTTPS API launcher with PID and log recording.
- `README.md` — project-level setup, deployment, endpoint, and operational documentation.

## Next Steps / Production Considerations

1. **Resolve frontend/API port allocation.**  
   The provided PM2 frontend configuration uses port `5095`, and the example API port is also `5095`. If both run on one server, assign the API a different internal `BACKEND_PORT` and use a reverse proxy, or host the two processes on separate machines.

2. **Use a reverse proxy where appropriate.**  
   Place Nginx, Caddy, HAProxy, or a managed load balancer in front of the application to provide standard port `443`, hostname routing, certificate renewal, request limits, and centralized access logs.

3. **Protect the first-user registration window.**  
   Register the intended administrator immediately after deployment. Consider disabling public signup after initialization or adding invitation-based account creation if additional users are not needed.

4. **Secure all secrets and certificates.**  
   Store `DB_PASSWORD` and `SESSION_SECRET` in a managed secret store where possible. Restrict `.env` and private-key permissions:
   ```bash
   chmod 600 .env
   ```

5. **Back up the database.**  
   Schedule backups for project, user, and session data. Test restoration procedures and retain backups outside the application host.

6. **Plan schema migrations.**  
   `schema.sql` initializes a new database but is not a versioned migration system. Introduce a migration tool or controlled SQL migration process before evolving production tables.

7. **Supervise the API process.**  
   `START.sh` starts a detached process, but a systemd service or dedicated PM2 entry provides stronger restart, health, and log-management behavior.

8. **Configure log rotation.**  
   Rotate PM2, API, reverse-proxy, and system logs to prevent disk exhaustion. Avoid logging passwords, session cookies, password hashes, or complete request bodies containing credentials.

9. **Validate proxy and cookie behavior.**  
   `server/index.js` enables proxy trust and production cookie security. Ensure the reverse proxy forwards the original protocol correctly and that browser requests are sent over HTTPS with credentials.

10. **Restrict CORS precisely.**  
    Confirm that only intended `geo-drops.com` HTTPS origins can make credentialed requests. Do not enable unrestricted origins together with session credentials.

11. **Add rate limiting and abuse controls.**  
    Apply stricter rate limits to signup and login endpoints. Consider account lockout, monitoring, bot protection, and alerting for repeated authentication failures.

12. **Monitor health and dependencies.**  
    Monitor `/health`, frontend availability, MySQL connectivity, TLS expiration, API error rates, process memory, disk usage, and session-table growth.

13. **Clean expired sessions.**  
    The custom session store enforces expiration and removes expired records during its operations. For high-volume deployments, also schedule periodic database cleanup and monitor the session expiration index.

14. **Rebuild after public configuration changes.**  
    Run `npm run build` again whenever `NEXT_PUBLIC_API_URL` or other browser-exposed build configuration changes, then restart the frontend.

15. **Verify fallback content before launch.**  
    Review `data/portfolio.js` so the public site remains accurate and polished during API outages. API-managed content should use the same project shape as the fallback records.

16. **Test accessibility and responsive behavior.**  
    Verify keyboard navigation, modal focus trapping, Escape dismissal, mobile navigation, form errors, reduced-motion behavior, color contrast, and screen-reader labels in the final deployment.

17. **Perform a production smoke test.**  
    Confirm:
    - The canonical homepage loads over HTTPS.
    - `/health` returns `{"status":"ok"}`.
    - Published projects replace fallback projects after mount.
    - The site retains fallback projects when the API is unavailable.
    - Signup, login, logout, and `/api/auth/me` preserve sessions.
    - Members receive `403` responses from administrator endpoints.
    - Administrators can create, edit, publish, order, and delete projects.
    - Unpublished projects do not appear through public endpoints.
    - Slug uniqueness and required-field validation are enforced.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_musicdesigner
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** musicdesigner
- **Credentials stored in Vault at:** `secret/data/mysql/musicdesigner`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
