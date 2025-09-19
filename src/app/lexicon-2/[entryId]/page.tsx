import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { LexiconEntry } from '@/lib/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getEntryByIdFromDatabase } from '@/lib/api';
import { SuggestEditsButton } from '@/components/shared/SuggestEditsButton';
import { CopyEntryUrlButton } from '@/components/shared/CopyEntryUrlButton';

export async function generateMetadata({ params, searchParams }: { params: Promise<{ entryId: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const { entryId: rawEntryId } = await params;
  const searchParamsResolved = await searchParams;
  const entryId = searchParamsResolved.entryId ? decodeURIComponent(String(searchParamsResolved.entryId)) : decodeURIComponent(rawEntryId);
  const entry = await getEntryByIdFromDatabase(entryId);

  if (!entry || entry.type !== 'lexicon') {
    return {
      title: 'Entry Not Found - F3 Lexicon',
      description: 'The requested lexicon entry could not be found.',
    };
  }

  const lexiconEntry = entry as LexiconEntry;
  const title = `${lexiconEntry.name} - F3 Lexicon`;
  const description = lexiconEntry.description || `Learn about ${lexiconEntry.name} in the F3 Lexicon.`;
  const url = `https://f3nation.com/lexicon-2/${entryId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'F3 Nation Codex',
      type: 'article',
      images: [
        {
          url: '/og-lexicon.png',
          width: 1200,
          height: 630,
          alt: `${lexiconEntry.name} - F3 Lexicon Term`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-lexicon.png'],
    },
  };
}

export default async function LexiconEntryPage({ params, searchParams }: { params: Promise<{ entryId: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { entryId: rawEntryId } = await params;
  const searchParamsResolved = await searchParams;
  const entryId = searchParamsResolved.entryId ? decodeURIComponent(String(searchParamsResolved.entryId)) : decodeURIComponent(rawEntryId);

  const entry = await getEntryByIdFromDatabase(entryId);

  if (!entry) {
    notFound();
  }

  if (entry.type !== 'lexicon') {
    notFound();
  }

  const lexiconEntry = entry as LexiconEntry;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Button asChild variant="ghost" className="mb-6 text-blue-500 hover:text-blue-600">
          <Link href="https://f3nation.com/lexicon-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lexicon
          </Link>
        </Button>
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-3xl font-bold">{lexiconEntry.name}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Term
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Description</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{lexiconEntry.description}</p>

            <div className="flex justify-end gap-2">
              <CopyEntryUrlButton entry={lexiconEntry} />
              <SuggestEditsButton entry={lexiconEntry} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
