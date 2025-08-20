import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { LexiconEntry } from '@/lib/types';
import Link from 'next/link';
import { getEntryByIdFromDatabase } from '@/lib/api';

export default async function LexiconEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
    const { entryId } = await params;

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
                    <Link href="/lexicon">
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
                        <p className="text-gray-700 dark:text-gray-300">{lexiconEntry.description}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
