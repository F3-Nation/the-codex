import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { LexiconEntry } from "@/lib/types";
import type { Metadata } from "next";
import { getEntryByIdFromDatabase } from "@/lib/api";
import { SuggestEditsButton } from "@/components/shared/SuggestEditsButton";
import { CopyEntryButton } from "@/components/shared/CopyEntryButton";
import { BackButton } from "@/components/shared/BackButton";
import { RichTextDisplay } from "@/components/shared/RichTextDisplay";
import { isHtmlContent } from "@/lib/sanitizeHtml";
import { convertPlainTextToHtml } from "@/lib/textToHtml";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { entryId: rawEntryId } = await params;
  const searchParamsResolved = await searchParams;
  const entryId = searchParamsResolved.entryId
    ? decodeURIComponent(String(searchParamsResolved.entryId))
    : decodeURIComponent(rawEntryId);
  const entry = await getEntryByIdFromDatabase(entryId);

  if (!entry || entry.type !== "lexicon") {
    return {
      title: "Entry Not Found - F3 Lexicon",
      description: "The requested lexicon entry could not be found.",
    };
  }

  const lexiconEntry = entry as LexiconEntry;
  const title = `${lexiconEntry.name} - F3 Lexicon`;
  const description =
    lexiconEntry.description ||
    `Learn about ${lexiconEntry.name} in the F3 Lexicon.`;
  const url = `https://f3nation.com/lexicon/${entryId}`;

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
          alt: `${lexiconEntry.name} - F3 Lexicon Term`,
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

export default async function LexiconEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { entryId: rawEntryId } = await params;
  const searchParamsResolved = await searchParams;
  const entryId = searchParamsResolved.entryId
    ? decodeURIComponent(String(searchParamsResolved.entryId))
    : decodeURIComponent(rawEntryId);

  const entry = await getEntryByIdFromDatabase(entryId);

  if (!entry) {
    notFound();
  }

  if (entry.type !== "lexicon") {
    notFound();
  }

  const lexiconEntry = entry as LexiconEntry;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton
          entryType="lexicon"
          className="mb-6 text-blue-500 hover:text-blue-600"
        />
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-3xl font-bold">
              {lexiconEntry.name}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Term
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Description</h3>
            <div className="mb-6">
              <RichTextDisplay
                htmlContent={
                  isHtmlContent(lexiconEntry.description)
                    ? lexiconEntry.description
                    : convertPlainTextToHtml(
                      lexiconEntry.description,
                      lexiconEntry.references
                    )
                }
                mentionedEntries={
                  lexiconEntry.references?.reduce(
                    (acc, ref) => {
                      acc[ref.id] = ref;
                      return acc;
                    },
                    {} as Record<string, typeof lexiconEntry.references[0]>
                  )
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <CopyEntryButton
                entry={lexiconEntry}
                variant="outline"
                size="sm"
                showLabel={true}
              />
              <SuggestEditsButton entry={lexiconEntry} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
