// src/app/api/import-lexicon/route.ts
// API route for viewing database schema and sample data.

import { getClient } from "../../../lib/db"; // Adjust path if your db.ts is elsewhere
import { PoolClient } from "pg";
import { NextResponse } from "next/server";

/**
 * Handles GET requests to display database schema and sample data.
 * @param request The incoming Next.js request object.
 * @returns A JSON response containing database information or an error.
 */
export async function GET(request: Request) {
  let client: PoolClient | undefined;
  try {
    client = await getClient();

    const databaseInfo: {
      tables: {
        name: string;
        columns: { name: string; type: string }[];
        sample_data: any[];
      }[];
    } = {
      tables: [],
    };

    // 1. Get all table names in the 'public' schema
    const tablesResult = await client.query(`
            SELECT tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = 'public';
        `);

    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      const tableInfo: {
        name: string;
        columns: { name: string; type: string }[];
        sample_data: any[];
      } = {
        name: tableName,
        columns: [],
        sample_data: [],
      };

      // 2. Get column information for each table
      const columnsResult = await client.query(
        `
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `,
        [tableName],
      );

      tableInfo.columns = columnsResult.rows.map((col) => ({
        name: col.column_name,
        type: col.data_type,
      }));

      // 3. Get sample data for each table (up to 5 rows)
      try {
        const sampleDataResult = await client.query(
          `SELECT * FROM "${tableName}" LIMIT 5;`,
        );
        tableInfo.sample_data = sampleDataResult.rows;
      } catch (dataError: any) {
        // This catch handles cases where SELECT * might fail on certain table types
        // or if table is being modified, e.g., view or system table not directly selectable.
        console.warn(
          `API Route: Could not fetch sample data for table "${tableName}":`,
          dataError.message,
        );
        tableInfo.sample_data = [
          { error: `Could not fetch data: ${dataError.message}` },
        ];
      }

      databaseInfo.tables.push(tableInfo);
    }

    return NextResponse.json(
      { success: true, data: databaseInfo },
      { status: 200 },
    );
  } catch (error: any) {
    // Catch error as 'any' for broader error handling
    console.error("API Route: Database inspection failed!", error);
    return NextResponse.json(
      {
        success: false,
        message: "Database inspection failed. Check server logs for details.",
        error: error.message,
      },
      { status: 500 },
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

// NOTE: All POST (import) logic has been removed as requested.
