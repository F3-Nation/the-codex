# F3 Codex App

The F3 Codex App is the home for the F3 Exicon and Lexicon, replacing the legacy version. This web-based application provides a comprehensive resource management and community platform for discovering, reviewing, and managing these essential F3-specific exicon and lexicon resources.

### Key Features

- **Organization and Resource Listings:** Browse and search a curated list of organizations and their associated resources.

- **User Authentication:** Secure user accounts with distinct roles (e.g., standard user, admin).

- **Administrative Dashboard:** Manage organizations, resources, and user profiles through a dedicated admin interface.

- **Responsive Design:** A mobile-friendly interface ensures a seamless experience across all devices.

### Getting Started

To get a copy of this project up and running on your local machine for development and testing purposes, follow these steps.

#### Prerequisites

- Node.js

- npm or yarn

- **PostgreSQL**: You will need a running PostgreSQL database instance.

#### Installation

1.  Clone the repository:

    ```
    git clone [https://github.com/F3-Nation/the-codex.git](https://github.com/F3-Nation/the-codex.git)
    cd the-codex


    ```

2.  Install dependencies:

    ```
    npm install
    # or
    yarn


    ```

3.  **Database Setup:**
    Create a new PostgreSQL database for this project. Then, create a `.env` file in the root of the project and add your database connection string:

    ```
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:YOUR_DB_PORT/YOUR_DB_NAME"


    ```

    Replace the placeholders with your actual database credentials.

4.  **Run Database Migrations:**
    Apply the database schema and initial data by running the following command.

    ```
    npm run db:migrate:up


    ```

5.  Seed your database (if applicable):

    ```
    npm run seed

    ```

#### Running the App

```
npm run dev
# or
yarn dev


```

The app will be available at `http://localhost:3000`.

### Technology Stack

- **Frontend:** Next.js, React

- **Styling:** Tailwind CSS

- **Database:** PostgreSQL

- **Authentication:** NextAuth

- **Backend:** Next.js API Routes, Firebase Admin SDK

- **Database Client**: Use a tool like `psql` or DBeaver to connect to the database specified in your `DATABASE_URL`.

### Contributing

We welcome contributions! If you would like to help improve this project, please follow these steps:

1.  Fork the repository.

2.  Create a new branch (`git checkout -b feature/your-feature-name`).

3.  Commit your changes (`git commit -m 'Add some feature'`).

4.  Push to the branch (`git push origin feature/your-feature-name`).

5.  Open a Pull Request.

## Authentication (F3 Auth Provider)

This app integrates with the F3 Auth Provider using the `f3-nation-auth-sdk`.

- SDK: [f3-nation-auth-sdk](https://www.npmjs.com/package/f3-nation-auth-sdk?activeTab=readme)
- Flow:
  1. `/login` fetches public OAuth config and redirects to the Auth Provider authorize endpoint
  2. Provider redirects back to our `/api/callback` (adds CORS headers) → forwards to `/callback`
  3. `/callback` exchanges the code for a token via server action
  4. User profile is fetched through a same-origin proxy at `/api/auth/userinfo` to avoid CORS

### Local development

- Run Auth Provider on port 3000 (HTTPS): `npm run dev` in the provider repo
- Run Codex on port 3001:
  - HTTPS: `npm run dev:https`
  - HTTP: `npm run dev` (not recommended for OAuth callback)

Set `.env.local` in this repo:

```
AUTH_PROVIDER_URL=https://localhost:3000
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=https://localhost:3001/api/callback
```

The OAuth client registered in the provider must include:
- `redirect_uris`: `https://localhost:3001/api/callback`
- `allowed_origin`: `https://localhost:3001`

### Production

Set the same variables via Firebase Secret Manager (see `apphosting.yaml`).

```
AUTH_PROVIDER_URL=https://auth.f3nation.com
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
OAUTH_REDIRECT_URI=https://<your-codex-domain>/api/callback
```

### Files of interest

- `src/app/login/page.tsx` – builds state and starts the OAuth flow
- `src/app/api/callback/route.ts` – CORS + redirects to `/callback`
- `src/app/callback/page.tsx` – exchanges code for token and fetches profile
- `src/app/api/auth/userinfo/route.ts` – server proxy to provider `/userinfo`
- `src/app/auth-actions.ts` – wraps SDK calls
- `middleware.ts` – adds CORS headers for callback routes
- `next.config.ts` – static headers for callback routes
- `src/components/shared/AuthControls.tsx` – login/logout UI in header

### Troubleshooting

- CORS errors on `/api/oauth/userinfo`:
  - Use `/api/auth/userinfo` proxy (already wired in `/callback`)
  - Ensure provider `allowed_origin` matches Codex origin
- Mismatched redirect URI:
  - Ensure `OAUTH_REDIRECT_URI` exactly matches the provider’s configured redirect URIs
- Wrong ports:
  - Provider on 3000 (HTTPS), Codex on 3001 (HTTPS)
