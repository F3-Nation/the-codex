// src/app/api/lexicon/route.ts

import { NextResponse } from 'next/server';
import { fetchAllEntries } from '../../../lib/api';
import type { LexiconEntry, AnyEntry } from '../../../lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Handles GET requests to fetch lexicon entries from the database.
 */
export async function GET() {
    try {
        const allEntries: AnyEntry[] = await fetchAllEntries();
        const lexiconEntries: LexiconEntry[] = allEntries.filter(
            (entry): entry is LexiconEntry => entry.type === 'lexicon'
        );

        return NextResponse.json(lexiconEntries, {
            status: 200,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' }
        });

    } catch (error: any) {
        console.error('❌ API Error: Could not fetch lexicon entries:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch lexicon entries. Please check server logs for details.', error: error.message },
            { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
        );
    }
}
