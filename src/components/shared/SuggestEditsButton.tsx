"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { SuggestionEditForm } from "@/components/submission/SuggestionEditForm";
import { useToast } from "@/hooks/use-toast";
import type { AnyEntry } from "@/lib/types";

interface SuggestEditsButtonProps {
  entry: AnyEntry;
}

export function SuggestEditsButton({ entry }: SuggestEditsButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuggestionSubmit = (suggestionData: any) => {
    toast({
      title: "Suggestion Submitted",
      description: `Your suggestions for "${entry.name}" have been recorded. Thank you!`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" /> Suggest Edits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest Edits for: {entry.name}</DialogTitle>
        </DialogHeader>
        <SuggestionEditForm
          entryToSuggestEditFor={entry}
          onFormSubmit={handleSuggestionSubmit}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
