// app/lexicon-2/page.tsx
export const dynamic = "force-dynamic";
import { PageContainer } from "@/components/layout/PageContainer";
import { LexiconClientPageContent } from "../lexicon/LexiconClientPageContent";
import {
  fetchAllEntries,
  getEntryByIdFromDatabase,
  fetchTagsFromDatabase,
} from "@/lib/api";
import type { AnyEntry, LexiconEntry, Tag } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SuggestEditsButton } from "@/components/shared/SuggestEditsButton";
import { CopyEntryUrlButton } from "@/components/shared/CopyEntryUrlButton";
import { BackButton } from "@/components/shared/BackButton";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParamsResolved = await searchParams;

  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));

    try {
      const entry = await getEntryByIdFromDatabase(entryId);

      if (entry && entry.type === "lexicon") {
        const title = `${entry.name} - F3 Lexicon`;
        const description =
          entry.description || `Learn about ${entry.name} in the F3 Lexicon.`;
        const url = `https://f3nation.com/lexicon-2?entryId=${entryId}`;

        return {
          title,
          description,
          openGraph: {
            title,
            description,
            url,
            siteName: "F3 Nation Codex",
            type: "article",
            images: [
              {
                url: "/og-lexicon.png",
                width: 1200,
                height: 630,
                alt: `${entry.name} - F3 Lexicon Term`,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ["/og-lexicon.png"],
          },
        };
      }
    } catch (error) {
      console.error("Failed to generate metadata for entry:", error);
    }
  }

  return {
    title: "F3 Lexicon - F3 Codex",
    description: "Explore F3 terminology in the Lexicon.",
  };
}

const getUniqueMentionedIds = (entries: AnyEntry[]): string[] => {
  const allMentionedIds = entries.flatMap(
    (entry) => entry.mentionedEntries || [],
  );
  return Array.from(new Set(allMentionedIds));
};

function normalizeAliases(
  aliases: unknown,
  entryId: string,
): { id: string; name: string }[] {
  return Array.isArray(aliases)
    ? aliases
        .map((alias, i) => {
          if (typeof alias === "string") {
            return { id: `alias-${entryId}-${i}`, name: alias };
          }
          if (alias && typeof alias.name === "string") {
            return {
              id: alias.id ?? `alias-${entryId}-${i}`,
              name: alias.name,
            };
          }
          return null;
        })
        .filter((a): a is { id: string; name: string } => a !== null)
    : [];
}

export default async function LexiconPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParamsResolved = await searchParams;
  let selectedEntry: LexiconEntry | null = null;

  // If entryId is provided, fetch that specific entry
  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));
    try {
      const entry = await getEntryByIdFromDatabase(entryId);
      if (entry && entry.type === "lexicon") {
        selectedEntry = entry as LexiconEntry;
      }
    } catch (error) {
      console.error("Failed to fetch specific entry:", error);
    }
  }
  let allEntries: AnyEntry[] = [];
  let enrichedEntries: LexiconEntry[] = [];
  let allAvailableTags: Tag[] = [];
  let errorMessage = "";

  try {
    allEntries = await fetchAllEntries();
    allAvailableTags = await fetchTagsFromDatabase();
    const lexiconEntries = allEntries.filter(
      (entry): entry is LexiconEntry => entry.type === "lexicon",
    );

    try {
      const uniqueMentionedIds = getUniqueMentionedIds(lexiconEntries);

      const mentionPromises = uniqueMentionedIds.map((id) =>
        getEntryByIdFromDatabase(id),
      );
      const mentionedEntryResults = await Promise.all(mentionPromises);

      const resolvedMentionsData: Record<string, AnyEntry> = {};
      mentionedEntryResults.forEach((entry) => {
        if (entry) {
          resolvedMentionsData[entry.id] = entry;
        }
      });

      enrichedEntries = lexiconEntries.map((entry) => {
        const normalizedAliases = normalizeAliases(entry.aliases, entry.id);

        return {
          ...entry,
          aliases: normalizedAliases,
          resolvedMentionsData,
        };
      });
    } catch (enrichmentError) {
      console.error(
        "❌ LexiconPage: Failed to enrich entries:",
        enrichmentError,
      );
      enrichedEntries = lexiconEntries.map((entry) => ({
        ...entry,
        aliases: normalizeAliases(entry.aliases, entry.id),
      }));
      errorMessage =
        "Some data enrichment failed, but basic entries are available.";
    }
  } catch (fetchError) {
    console.error("❌ LexiconPage: Failed to fetch entries:", fetchError);
    errorMessage = `Failed to load entries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;

    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">F3 Lexicon</h1>
          <p className="text-red-500 mb-4">
            Error loading data: {errorMessage}
          </p>
        </div>
      </PageContainer>
    );
  }

  // If we have a selected entry, show it instead of the list
  if (selectedEntry) {
    return (
      <PageContainer>
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <BackButton
              entryType="lexicon"
              className="mb-6 text-blue-500 hover:text-blue-600"
            />
            <Card className="shadow-lg rounded-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-3xl font-bold">
                  {selectedEntry.name}
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground mt-2">
                  Term
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {selectedEntry.description}
                </p>

                <div className="flex justify-end gap-2">
                  <CopyEntryUrlButton entry={selectedEntry} />
                  <SuggestEditsButton entry={selectedEntry} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {errorMessage && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Warning</p>
          <p>{errorMessage}</p>
        </div>
      )}
      <LexiconClientPageContent initialEntries={enrichedEntries} />
    </PageContainer>
  );
}
