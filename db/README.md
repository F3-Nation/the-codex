# PostgreSQL Docker Setup

This setup provides a PostgreSQL database in a Docker container.

## Quick Start

1. Start the database:
```bash
docker-compose up -d
```

2. Stop the database:
```bash
docker-compose down
```

## Connection Details

- Host: 127.0.0.1
- Port: 5432
- Username: postgres
- Password: postgres
- Database: postgres

Example connection string:
```
postgres://postgres:postgres@127.0.0.1:5432/postgres
```

## Persistence

Data is persisted in a Docker volume named `postgres_data`. To completely remove the database and its data:

```bash
docker-compose down -v
```

## Environment Variables

Configuration can be customized by setting these environment variables:
- POSTGRES_USER (default: postgres)
- POSTGRES_PASSWORD (default: postgres) 
- POSTGRES_DB (default: postgres)

Example overriding defaults:
```bash
export POSTGRES_PASSWORD=mysecurepassword
export POSTGRES_DB=my_custom_db
docker-compose up -d
```

Note: The example connection string uses default values.
