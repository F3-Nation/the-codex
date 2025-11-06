import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ExiconEntry } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { getEntryByIdFromDatabase } from "@/lib/api";
import CopyLinkButton from "@/components/shared/CopyLinkButton";
import { SuggestEditsButton } from "@/components/shared/SuggestEditsButton";
import { CopyEntryUrlButton } from "@/components/shared/CopyEntryUrlButton";
import { BackButton } from "@/components/shared/BackButton";

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

  if (!entry || entry.type !== "exicon") {
    return {
      title: "Entry Not Found - F3 Exicon",
      description: "The requested exicon entry could not be found.",
    };
  }

  const exiconEntry = entry as ExiconEntry;
  const title = `${exiconEntry.name} - F3 Exicon`;
  const description =
    exiconEntry.description ||
    `Learn about the ${exiconEntry.name} exercise in the F3 Exicon.`;
  const url = `https://f3nation.com/exicon-2/${entryId}`;
  const tags = exiconEntry.tags?.map((tag) => tag.name).join(", ") || "";

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
          alt: `${exiconEntry.name} - F3 Exicon Exercise`,
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

export default async function ExiconEntryPage({
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

  if (entry.type !== "exicon") {
    notFound();
  }

  const exiconEntry = entry as ExiconEntry;
  const embedUrl = exiconEntry.videoLink
    ? getYouTubeEmbedUrl(exiconEntry.videoLink)
    : null;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <BackButton
          entryType="exicon"
          className="mb-6 text-blue-500 hover:text-blue-600"
        />
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-3xl font-bold">
              {exiconEntry.name}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Exercise
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Description</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {exiconEntry.description}
            </p>

            <div className="space-y-3 mb-6">
              {embedUrl ? (
                <>
                  <div className="aspect-video">
                    <iframe
                      width="100%"
                      height="100%"
                      src={embedUrl}
                      title={`YouTube video player for ${exiconEntry.name}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="rounded-md shadow-md"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyLinkButton videoLink={exiconEntry.videoLink ?? ""} />
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={exiconEntry.videoLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Original
                        Video
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

            {exiconEntry.tags && exiconEntry.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {exiconEntry.tags.map((tag) => (
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
              <CopyEntryUrlButton entry={exiconEntry} />
              <SuggestEditsButton entry={exiconEntry} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
