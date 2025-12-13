import { PageContainer } from "@/components/layout/PageContainer";
import { ExiconClientPageContent } from "./ExiconClientPageContent";
import {
  fetchAllEntries,
  getEntryByIdFromDatabase,
  fetchTagsFromDatabase,
} from "@/lib/api";
import type { ExiconEntry, AnyEntry, Tag } from "@/lib/types";

export const revalidate = 60;

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
        const url = `https://codex.f3nation.com/exicon?entryId=${entryId}`;
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
    title: "Exicon - F3 Codex",
    description: "Explore F3 exercises in the Exicon.",
  };
}

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

  if (searchParamsResolved.entryId) {
    const entryId = decodeURIComponent(String(searchParamsResolved.entryId));

    // Check if the entry exists and get its type
    try {
      const entry = await getEntryByIdFromDatabase(entryId);
      const { redirect } = await import("next/navigation");

      if (entry) {
        // Redirect to the correct section based on entry type
        if (entry.type === "exicon") {
          redirect(`/exicon/${encodeURIComponent(entryId)}`);
        } else if (entry.type === "lexicon") {
          redirect(`/lexicon/${encodeURIComponent(entryId)}`);
        }
      } else {
        // Entry not found, just redirect to the current section
        redirect(`/exicon/${encodeURIComponent(entryId)}`);
      }
    } catch (error) {
      // If there's an error fetching, fallback to current section
      const { redirect } = await import("next/navigation");
      redirect(`/exicon/${encodeURIComponent(entryId)}`);
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
    enrichedEntries = exiconEntries.map((entry) => {
      const processedTags = coerceTagsToValidTagArray(entry.tags);
      const normalizedAliases = normalizeAliases(entry.aliases, entry.id);

      return {
        ...entry,
        tags: processedTags,
        aliases: normalizedAliases,
      };
    });
  } catch (fetchError) {
    console.error("❌ ExiconPage: Failed to fetch entries:", fetchError);
    errorMessage = `Failed to load entries: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;

    // Return detailed debug info in the error fallback
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
