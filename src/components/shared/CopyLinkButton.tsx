"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { copyToClipboard, isInIframe, showCopyPrompt } from "@/lib/clipboard";

interface CopyLinkButtonProps {
  videoLink: string;
}

export default function CopyLinkButton({ videoLink }: CopyLinkButtonProps) {
  const { toast } = useToast();

  const handleCopyVideoLink = async () => {
    if (videoLink) {
      const result = await copyToClipboard(videoLink);

      if (result.success) {
        toast({
          title: "Video Link Copied!",
          description: `The video link has been copied to your clipboard using ${result.method}.`,
        });
      } else {
        // If all automatic methods fail, show manual copy prompt
        if (isInIframe()) {
          showCopyPrompt(videoLink);
          toast({
            title: "Manual Copy Required",
            description: "Please copy the video link from the popup dialog.",
          });
        } else {
          toast({
            title: "Failed to Copy",
            description: result.error || "Could not copy the video link.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <Button onClick={handleCopyVideoLink} variant="outline" size="sm">
      <Copy className="mr-2 h-4 w-4" /> Copy Video Link
    </Button>
  );
}
