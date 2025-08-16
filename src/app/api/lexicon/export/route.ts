// src/app/api/lexicon/export/route.ts
import { fetchAllEntries } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function toAliasNames(aliases: unknown): string {
  if (!Array.isArray(aliases)) return '';
  return aliases
    .map((alias: any) => (typeof alias === 'string' ? alias : alias?.name ?? ''))
    .filter((s: string) => typeof s === 'string' && s.trim() !== '')
    .join('; ');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = (searchParams.get('searchTerm') || '').toLowerCase();
    const filterLetter = searchParams.get('filterLetter') || 'All';

    const all = await fetchAllEntries();
    // only lexicon entries
    const lexicon = all.filter((e) => e.type === 'lexicon');

    // apply UI filters sent from client
    const filtered = lexicon.filter((entry) => {
      const matchesLetter =
        filterLetter === 'All' ||
        entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());

      const matchesSearch =
        searchTerm === '' ||
        entry.name.toLowerCase().includes(searchTerm) ||
        (entry.description && entry.description.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(entry.aliases) &&
          entry.aliases.some((alias: any) => {
            const aliasName = typeof alias === 'string' ? alias : alias?.name;
            return typeof aliasName === 'string' && aliasName.toLowerCase().includes(searchTerm);
          }));

      return matchesLetter && matchesSearch;
    });

    // build CSV
    const replacer = (_key: string, value: any) =>
      value === null || value === undefined ? '' : value;

    const header = ['ID', 'Name', 'Description', 'Aliases'];
    const rows = [
      header.join(','),
      ...filtered.map((entry) =>
        [
          JSON.stringify(entry.id, replacer),
          JSON.stringify(entry.name, replacer),
          JSON.stringify(entry.description, replacer),
          JSON.stringify(toAliasNames(entry.aliases), replacer),
        ].join(',')
      ),
    ];

    const csv = rows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=lexicon-export.csv',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    console.error('❌ API Error: CSV export failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to export lexicon CSV.',
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
