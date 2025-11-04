# F3 Codex App

The F3 Codex App is the home for the F3 Exicon and Lexicon, replacing the legacy version. This web-based application provides a comprehensive resource management and community platform for discovering, reviewing, and managing these essential F3-specific exicon and lexicon resources.

### Key Features

- **Organization and Resource Listings:** Browse and search a curated list of organizations and their associated resources.

- **User Authentication:** Secure user accounts with distinct roles (e.g., standard user, admin).

- **Administrative Dashboard:** Manage organizations, resources, and user profiles through a dedicated admin interface.

- **Responsive Design:** A mobile-friendly interface ensures a seamless experience across all devices.

### URL Query Parameters

The Exicon and Lexicon pages support URL query parameters for filtering and searching. This allows you to bookmark or share specific filtered views.

#### Exicon Query Parameters

The Exicon (`/exicon`) supports the following query parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search exercises by name or alias | - |
| `letter` | string | Filter by first letter (A-Z) | `All` |
| `tags` | string | Comma-separated tag names | - |
| `tagLogic` | string | Tag combination logic: `AND` or `OR` | `OR` |

**Examples:**

```
# Search for exercises containing "burpee"
/exicon?search=burpee

# Filter exercises starting with "P"
/exicon?letter=P

# Show exercises with Core OR Legs tags
/exicon?tags=Core,Legs

# Show exercises with BOTH Core AND Legs tags
/exicon?tags=Core,Legs&tagLogic=AND

# Combined filters: search "pushup", starts with "P", has Core AND Arms tags
/exicon?search=pushup&letter=P&tags=Core,Arms&tagLogic=AND
```

#### Lexicon Query Parameters

The Lexicon (`/lexicon`) supports the following query parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search terms by name, alias, or description | - |
| `letter` | string | Filter by first letter (A-Z) | `All` |

**Examples:**

```
# Search for terms containing "fitness"
/lexicon?search=fitness

# Filter terms starting with "F"
/lexicon?letter=F

# Combined: search "leader" and filter by "L"
/lexicon?search=leader&letter=L
```

**Note:** All query parameters are automatically updated in the URL as you interact with the search and filter UI, making it easy to share or bookmark specific views.

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
