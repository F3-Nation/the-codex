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
    Create a new PostgreSQL database for this project. Then, create a `.env.local` file in the root of the project and add your database connection string:

    ```
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:YOUR_DB_PORT/YOUR_DB_NAME"


    ```

    Replace the placeholders with your actual database credentials.

4.  **Run Database Migrations:**
    Apply the database schema and initial data by running the following command.

    ```
    npm run db:migrate


    ```

5.  Seed your database (if applicable):

    ```
    npm run db:seed

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
