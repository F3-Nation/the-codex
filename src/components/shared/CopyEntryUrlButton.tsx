'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard, isInIframe } from '@/lib/clipboard';
import { showParentToast } from '@/lib/iframe-bridge';
import type { AnyEntry } from '@/lib/types';

interface CopyEntryUrlButtonProps {
  entry: AnyEntry;
}

export function CopyEntryUrlButton({ entry }: CopyEntryUrlButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const encodedId = encodeURIComponent(entry.id);
    const url = `https://f3nation.com/${entry.type === 'exicon' ? 'exicon' : 'lexicon'}/${encodedId}`;

    const success = await copyToClipboard(url);
    const inIframe = isInIframe();

    if (success) {
      if (inIframe) {
        // Toast notification will be handled by parent via iframe-bridge
        showParentToast({
          title: `${entry.name} URL Copied!`,
          description: "The link has been copied to your clipboard."
        });
      } else {
        // Normal toast for non-iframe context
        toast({
          title: `${entry.name} URL Copied!`,
          description: "The link has been copied to your clipboard."
        });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      if (inIframe) {
        // Error notification will be handled by parent via iframe-bridge
        showParentToast({
          title: "Failed to Copy URL",
          description: "Could not copy the entry URL.",
          variant: "destructive"
        });
      } else {
        // Normal error toast for non-iframe context
        toast({
          title: "Failed to Copy URL",
          description: "Could not copy the entry URL.",
          variant: "destructive"
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