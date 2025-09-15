'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { Copy } from 'lucide-react';

interface CopyLinkButtonProps {
    videoLink: string;
}

export default function CopyLinkButton({ videoLink }: CopyLinkButtonProps) {
    const { toast } = useToast();

    const handleCopyVideoLink = async () => {
        if (videoLink) {
            const success = await copyToClipboard(videoLink);

            if (success) {
                toast({ title: "Video Link Copied!", description: "The video link has been copied to your clipboard." });
            } else {
                toast({
                    title: "Failed to Copy",
                    description: "Could not copy the video link.",
                    variant: "destructive"
                });
            }
        }
    };

    return (
        <Button onClick={handleCopyVideoLink} variant="outline" size="sm">
            <Copy className="mr-2 h-4 w-4" /> Copy Video Link
        </Button>
    );
}
