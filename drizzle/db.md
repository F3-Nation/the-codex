# Database Refactoring Report

## Files Requiring Updates to Use Drizzle ORM

### API Routes
1. **src/app/api/import-exicon-csv/route.ts**
   - Contains raw SQL DELETE statements for clearing tables
   - Needs conversion to Drizzle delete operations

2. **src/app/api/import-lexicon-csv/route.ts**  
   - Contains raw SQL DELETE statements for clearing tables
   - Needs conversion to Drizzle delete operations

3. **src/app/api/test-db-connection/route.ts**
   - Contains raw SQL queries for inspecting database schema
   - Needs conversion to Drizzle schema introspection

4. **src/app/api/test-db-connection/import-lexicon.ts**
   - Contains raw SQL DELETE statements
   - Needs conversion to Drizzle delete operations

### Core Database Operations
5. **src/lib/api.ts**
   - Extensive raw SQL usage throughout file
   - Contains:
     - SELECT queries with complex joins
     - INSERT/UPDATE/DELETE operations
     - JSON aggregation
     - Needs complete rewrite using Drizzle query builder

### Server Actions
6. **src/app/submit/actions.ts**
   - Uses raw SQL fragments with `sql` template tags
   - Contains complex conditional queries
   - Needs conversion to Drizzle query builder

7. **src/app/admin/actions.ts** (from import trace)
   - Likely contains database operations
   - Needs inspection and potential conversion

### Additional Files Found
8. **src/app/actions.ts** (from open tabs)
   - May contain database operations
   - Needs inspection

## Recommended Refactoring Approach

1. First update imports in all files to use `drizzle/db.ts` instead of old db client
2. For each file:
   - Convert simple queries first (basic SELECT/INSERT/UPDATE/DELETE)
   - Then tackle complex queries with joins and JSON operations
   - Test each conversion thoroughly
3. Pay special attention to:
   - Transaction handling
   - Parameterized queries
   - Type safety with Drizzle schema

## Estimated Complexity

| File | Complexity | Notes |
|------|------------|-------|
| src/lib/api.ts | High | Many complex queries |
| src/app/submit/actions.ts | Medium | Complex conditional logic |
| API route files | Low-Medium | Mostly simple operations |
| Action files | Medium | Need inspection |

Would you like me to proceed with any specific file conversions first?
