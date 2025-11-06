"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getBackUrl, isInIframe } from "@/lib/route-utils";

interface BackButtonProps {
  entryType: "exicon" | "lexicon";
  className?: string;
}

export function BackButton({ entryType, className }: BackButtonProps) {
  const inIframe = isInIframe();
  const backUrl = getBackUrl(entryType);

  const displayText =
    entryType === "lexicon" ? "Back to Lexicon" : "Back to Exicon";

  const handleClick = () => {
    if (inIframe) {
      // Navigate the parent window, not the iframe
      if (window.parent && window.parent.location) {
        window.parent.location.replace(backUrl);
      } else if (window.top && window.top.location) {
        window.top.location.replace(backUrl);
      }
    }
  };

  return (
    <Button
      asChild={!inIframe}
      variant="ghost"
      className={className}
      onClick={inIframe ? handleClick : undefined}
    >
      {inIframe ? (
        <>
          <ArrowLeft className="mr-2 h-4 w-4" /> {displayText}
        </>
      ) : (
        <Link href={backUrl}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {displayText}
        </Link>
      )}
    </Button>
  );
}
