// app/exicon-2/page.tsx
export const dynamic = "force-dynamic";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExiconClientPageContent } from "../exicon/ExiconClientPageContent";
import {
  fetchAllEntries,
  getEntryByIdFromDatabase,
  fetchTagsFromDatabase,
} from "@/lib/api";
import type { AnyEntry, ExiconEntry, Tag } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SuggestEditsButton } from "@/components/shared/SuggestEditsButton";
import { CopyEntryUrlButton } from "@/components/shared/CopyEntryUrlButton";
import { BackButton } from "@/components/shared/BackButton";
import CopyLinkButton from "@/components/shared/CopyLinkButton";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

      if (entry && entry.type === "exicon") {
        const title = `${entry.name} - F3 Exicon`;
        const description =
          entry.description ||
          `Learn about the ${entry.name} exercise in the F3 Exicon.`;
        const url = `https://f3nation.com/exicon-2?entryId=${entryId}`;
        const tags = entry.tags?.map((tag) => tag.name).join(", ") || "";

        return {
          title,
          description,
          openGraph: {
            title,
            description: tags ? `${description} Tags: ${tags}` : description,
            url,
            siteName: "F3 Nation Codex",
            type: "article",
            images: [
              {
                url: "/og-exicon.png",
                width: 1200,
                height: 630,
                alt: `${entry.name} - F3 Exicon Exercise`,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description: tags ? `${description} Tags: ${tags}` : description,
            images: ["/og-exicon.png"],
          },
        };
      }
    } catch (error) {
      console.error("Failed to generate metadata for entry:", error);
    }
  }

  return {
    title: "F3 Exicon - F3 Codex",
    description: "Explore F3 exercises in the Exicon.",
  };
}

const getUniqueMentionedIds = (entries: AnyEntry[]): string[] => {
  const allMentionedIds = entries.flatMap(
    (entry) => entry.mentionedEntries || [],
  );
  return Array.from(new Set(allMentionedIds));
};

function coerceTagsToValidTagArray(tags: unknown): Tag[] {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => {
        if (typeof tag === "string") {
          return {
            id: tag.toLowerCase().replace(/\s+/g, "-"),
            name: tag.trim(),
          };
        }
        if (
          typeof tag === "object" &&
          tag !== null &&
          typeof tag.name === "string"
        ) {
          return {
            id: String(
              tag.id ?? `tag-${tag.name.toLowerCase().replace(/\s+/g, "-")}`,
            ),
            name: tag.name.trim(),
          };
        }
        return null;
      })
      .filter((tag): tag is Tag => tag !== null);
  }
  return [];
}

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

export default async function ExiconPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParamsResolved = await searchParams;
  let selectedEntry: ExiconEntry | null = null;

  // If entryId is provided, fetch that specific entry
  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));
    try {
      const entry = await getEntryByIdFromDatabase(entryId);
      if (entry && entry.type === "exicon") {
        selectedEntry = entry as ExiconEntry;
      }
    } catch (error) {
      console.error("Failed to fetch specific entry:", error);
    }
  }

  let allEntries: AnyEntry[] = [];
  let enrichedEntries: ExiconEntry[] = [];
  let allAvailableTags: Tag[] = [];
  let errorMessage = "";

  try {
    allEntries = await fetchAllEntries();
    allAvailableTags = await fetchTagsFromDatabase();
    const exiconEntries = allEntries.filter(
      (entry): entry is ExiconEntry => entry.type === "exicon",
    );

    try {
      const uniqueMentionedIds = getUniqueMentionedIds(exiconEntries);

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

      enrichedEntries = exiconEntries.map((entry) => {
        const processedTags = coerceTagsToValidTagArray(entry.tags);
        const normalizedAliases = normalizeAliases(entry.aliases, entry.id);

        return {
          ...entry,
          tags: processedTags,
          aliases: normalizedAliases,
          resolvedMentionsData,
        };
      });
    } catch (enrichmentError) {
      console.error(
        "❌ ExiconPage: Failed to enrich entries:",
        enrichmentError,
      );
      enrichedEntries = exiconEntries.map((entry) => ({
        ...entry,
        tags: coerceTagsToValidTagArray(entry.tags),
        aliases: normalizeAliases(entry.aliases, entry.id),
      }));
      errorMessage =
        "Some data enrichment failed, but basic entries are available.";
    }
  } catch (fetchError) {
    console.error("❌ ExiconPage: Failed to fetch entries:", fetchError);
    errorMessage = `Failed to load entries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;

    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">F3 Exicon</h1>
          <p className="text-red-500 mb-4">
            Error loading data: {errorMessage}
          </p>
          <div className="text-left max-w-md mx-auto bg-gray-100 p-4 rounded text-sm">
            <p>
              <strong>Runtime Debug Info:</strong>
            </p>
            <p>
              DATABASE_URL available: {process.env.DATABASE_URL ? "Yes" : "No"}
            </p>
            <p>NODE_ENV: {process.env.NODE_ENV}</p>
            <p>URL length: {process.env.DATABASE_URL?.length || 0}</p>
            <p>
              Starts with postgresql:{" "}
              {process.env.DATABASE_URL?.startsWith("postgresql://")
                ? "Yes"
                : "No"}
            </p>
            <p>
              DB env vars:{" "}
              {Object.keys(process.env)
                .filter((k) => k.includes("DATABASE"))
                .join(", ")}
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // If we have a selected entry, show it instead of the list
  if (selectedEntry) {
    const embedUrl = selectedEntry.videoLink
      ? getYouTubeEmbedUrl(selectedEntry.videoLink)
      : null;

    return (
      <PageContainer>
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <BackButton
              entryType="exicon"
              className="mb-6 text-blue-500 hover:text-blue-600"
            />
            <Card className="shadow-lg rounded-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-3xl font-bold">
                  {selectedEntry.name}
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground mt-2">
                  Exercise
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {selectedEntry.description}
                </p>

                <div className="space-y-3 mb-6">
                  {embedUrl ? (
                    <>
                      <div className="aspect-video">
                        <iframe
                          width="100%"
                          height="100%"
                          src={embedUrl}
                          title={`YouTube video player for ${selectedEntry.name}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="rounded-md shadow-md"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CopyLinkButton
                          videoLink={selectedEntry.videoLink ?? ""}
                        />
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={selectedEntry.videoLink || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                            Original Video
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No video available for this exercise.
                    </p>
                  )}
                </div>

                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="font-normal"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

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
      <ExiconClientPageContent
        initialEntries={enrichedEntries}
        allTags={allAvailableTags}
      />
    </PageContainer>
  );
}
