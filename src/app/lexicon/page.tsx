// app/lexicon/page.tsx
export const dynamic = 'force-dynamic';
import { PageContainer } from '@/components/layout/PageContainer';
import { LexiconClientPageContent } from './LexiconClientPageContent';
import { fetchAllEntries, getEntryByIdFromDatabase } from '@/lib/api';
import type { AnyEntry, LexiconEntry } from '@/lib/types';

export const metadata = {
  title: 'F3 Lexicon - F3 Codex',
  description: 'Explore F3 terminology in the Lexicon.',
};


const getUniqueMentionedIds = (entries: AnyEntry[]): string[] => {
  const allMentionedIds = entries.flatMap(entry => entry.mentionedEntries || []);
  return Array.from(new Set(allMentionedIds));
};

export default async function LexiconPage() {
  const allEntries = await fetchAllEntries();
  const initialEntries = allEntries.filter((e): e is LexiconEntry => e.type === 'lexicon');

  let enrichedEntries: LexiconEntry[] = initialEntries;

  try {
    const uniqueMentionedIds = getUniqueMentionedIds(initialEntries);


    const mentionPromises = uniqueMentionedIds.map(id => getEntryByIdFromDatabase(id));
    const mentionedEntryResults = await Promise.all(mentionPromises);

    const resolvedMentionsData: Record<string, AnyEntry> = {};
    mentionedEntryResults.forEach(entry => {
      if (entry) {
        resolvedMentionsData[entry.id] = entry;
      }
    });

    enrichedEntries = initialEntries.map(entry => ({
      ...entry,
      resolvedMentionsData,
    }));
  } catch (error) {
    console.error("Failed to fetch mentioned entries on the server:", error);
  }

  return (
    <PageContainer>
      <LexiconClientPageContent initialEntries={enrichedEntries} />
    </PageContainer>
  );
}
