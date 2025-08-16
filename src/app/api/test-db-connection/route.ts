// src/app/api/import-lexicon/route.ts
// API route for viewing database schema and sample data.

import { db } from '@/drizzle/db';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { codex } from '@/drizzle/schema';

/**
 * Handles GET requests to display database schema and sample data.
 * @param request The incoming Next.js request object.
 * @returns A JSON response containing database information or an error.
 */
export async function GET(request: Request) {
    try {
        const databaseInfo: {
            tables: {
                name: string;
                columns: { name: string; type: string }[];
                sample_data: any[];
            }[];
        } = {
            tables: []
        };

        // 1. Get all table names from Drizzle schema
        const schemaTables = Object.values(codex).filter(
            (table) => typeof table === 'object' && '$name' in table
        );

        for (const table of schemaTables) {
            const tableName = table.$name;
            const tableInfo: {
                name: string;
                columns: { name: string; type: string }[];
                sample_data: any[];
            } = {
                name: tableName,
                columns: [],
                sample_data: []
            };

            // 2. Get column information from Drizzle schema
            tableInfo.columns = Object.entries(table).map(([key, column]) => {
                if (column && typeof column === 'object' && '$name' in column) {
                    const drizzleColumn = column as { $name: string; $dataType: string };
                    return {
                        name: drizzleColumn.$name,
                        type: drizzleColumn.$dataType || 'unknown'
                    };
                }
                return { name: key, type: 'unknown' };
            }).filter(col => col.type !== 'unknown') as { name: string; type: string }[];

            // 3. Get sample data using Drizzle
            try {
                const result = await db.select().from(table).limit(5);
                tableInfo.sample_data = result;
            } catch (dataError: any) {
                console.warn(`API Route: Could not fetch sample data for table "${tableName}":`, dataError.message);
                tableInfo.sample_data = [{ error: `Could not fetch data: ${dataError.message}` }];
            }

            databaseInfo.tables.push(tableInfo);
        }

        console.log('API Route: Database schema and data inspection successful!');
        return NextResponse.json({ success: true, data: databaseInfo }, { status: 200 });

    } catch (error: any) { // Catch error as 'any' for broader error handling
        console.error('API Route: Database inspection failed!', error);
        return NextResponse.json(
            { success: false, message: 'Database inspection failed. Check server logs for details.', error: error.message },
            { status: 500 }
        );
    } finally {
        // No need to release client with Drizzle connection pooling
    }
}

// NOTE: All POST (import) logic has been removed as requested.
