"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AnyEntry } from "@/lib/types";
import { copyToClipboard, isInIframe, showCopyPrompt } from "@/lib/clipboard";
import { generateEntryUrl } from "@/lib/route-utils";

interface CopyEntryUrlButtonProps {
  entry: AnyEntry;
}

export function CopyEntryUrlButton({ entry }: CopyEntryUrlButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = generateEntryUrl(entry.id, entry.type as "exicon" | "lexicon");

    const result = await copyToClipboard(url);

    if (result.success) {
      toast({
        title: `${entry.name} URL Copied!`,
        description: `The link has been copied to your clipboard using ${result.method}.`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // If all automatic methods fail, show manual copy prompt
      if (isInIframe()) {
        showCopyPrompt(url);
        toast({
          title: "Manual Copy Required",
          description: "Please copy the link from the popup dialog.",
        });
      } else {
        toast({
          title: "Failed to Copy URL",
          description: result.error || "Could not copy the entry URL.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button onClick={handleCopy} variant="outline" size="sm">
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" /> Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" /> Copy URL
        </>
      )}
    </Button>
  );
}
