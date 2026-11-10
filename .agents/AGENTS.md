# Thabit Project Guidelines

## Database Backward Compatibility
- **CRITICAL**: The application is distributed to an end customer. Always assume the customer has an existing, older SQLite database (`thabit_database.sqlite`). 
- Whenever introducing new database tables, columns, or logic, **MUST** use `CREATE TABLE IF NOT EXISTS` and `addColumnIfNotExists` (or similar non-destructive migration functions) in the startup script (e.g., `database.js`).
- Never write SQL queries that assume new columns exist without first migrating the schema or wrapping the query in a robust `try/catch` block to prevent crashes.

## Deployment / Build
- After making significant changes, remind the user to rebuild the application (`npm run build`) to generate the `.exe` for the customer.
