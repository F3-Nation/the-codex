'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard, isInIframe } from '@/lib/clipboard';
import { showParentToast } from '@/lib/iframe-bridge';
import { Copy } from 'lucide-react';

interface CopyLinkButtonProps {
    videoLink: string;
}

export default function CopyLinkButton({ videoLink }: CopyLinkButtonProps) {
    const { toast } = useToast();

    const handleCopyVideoLink = async () => {
        if (videoLink) {
            const success = await copyToClipboard(videoLink);
            const inIframe = isInIframe();

            if (success) {
                if (inIframe) {
                    // Toast notification will be handled by parent via iframe-bridge
                    showParentToast({
                        title: "Video Link Copied!",
                        description: "The video link has been copied to your clipboard."
                    });
                } else {
                    // Normal toast for non-iframe context
                    toast({ title: "Video Link Copied!", description: "The video link has been copied to your clipboard." });
                }
            } else {
                if (inIframe) {
                    // Error notification will be handled by parent via iframe-bridge
                    showParentToast({
                        title: "Failed to Copy",
                        description: "Could not copy the video link.",
                        variant: "destructive"
                    });
                } else {
                    // Normal error toast for non-iframe context
                    toast({
                        title: "Failed to Copy",
                        description: "Could not copy the video link.",
                        variant: "destructive"
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
