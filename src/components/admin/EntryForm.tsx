"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type {
  Tag,
  ExiconEntry,
  AnyEntry,
  ReferencedEntry,
  LexiconEntry,
} from "@/lib/types";
import { TiptapEditor } from "@/components/shared/TiptapEditor";
import { searchEntriesByName } from "@/app/submit/actions";
import { sanitizeEditorHtml } from "@/lib/sanitizeHtml";

interface EntryFormProps {
  entryToEdit?: AnyEntry;
  onFormSubmit: (data: AnyEntry) => Promise<void>;
  allTags: Tag[];
  isSubmitting: boolean;
}

export function EntryForm({
  entryToEdit,
  onFormSubmit,
  allTags,
  isSubmitting,
}: EntryFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aliases, setAliases] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState<"exicon" | "lexicon">("exicon");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [videoLink, setVideoLink] = useState("");
  const [references, setReferences] = useState<ReferencedEntry[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (entryToEdit) {
      const isExicon = entryToEdit.type === "exicon";
      const nextSelectedTagIds = isExicon
        ? (entryToEdit as ExiconEntry).tags.map((tag) => tag.id)
        : [];

      const nextVideoLink = isExicon
        ? (entryToEdit as ExiconEntry).videoLink || ""
        : "";

      const formattedAliases = Array.isArray(entryToEdit.aliases)
        ? entryToEdit.aliases.map((alias, idx) => ({
            id:
              typeof alias === "string"
                ? `alias-${Date.now()}-${idx}`
                : alias.id || `alias-${Date.now()}-${idx}`,
            name: typeof alias === "string" ? alias : alias.name,
          }))
        : [];

      const entryReferences = entryToEdit.references || [];

      startTransition(() => {
        setName(entryToEdit.name);
        setDescription(entryToEdit.description);
        setType(entryToEdit.type);
        setSelectedTagIds(nextSelectedTagIds);
        setVideoLink(nextVideoLink);
        setAliases(formattedAliases);
        setReferences(entryReferences);
      });
    } else {
      startTransition(() => {
        setName("");
        setDescription("");
        setType("exicon");
        setSelectedTagIds([]);
        setVideoLink("");
        setAliases([]);
        setReferences([]);
      });
    }
  }, [entryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("Name is required");
      return;
    }

    if (!description.trim()) {
      setLocalError("Description is required");
      return;
    }

    try {
      const commonData = {
        id:
          entryToEdit?.id ||
          `${type}-${Date.now()}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name: name.trim(),
        description: sanitizeEditorHtml(description.trim()),
        aliases: aliases.filter((alias) => alias.name.trim() !== ""),
        references: references,
        mentionedEntries: references.map((ref) => ref.id),
      };

      const entryData: AnyEntry =
        type === "exicon"
          ? ({
              ...commonData,
              type: "exicon",
              tags: selectedTagIds
                .map((id) => allTags.find((tag) => tag.id === id))
                .filter((t): t is Tag => !!t),
              videoLink: videoLink.trim() || undefined,
            } as ExiconEntry)
          : ({
              ...commonData,
              type: "lexicon",
            } as LexiconEntry);

      await onFormSubmit(entryData);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  };

  const handleAddAlias = () => {
    setAliases((prev) => [...prev, { id: `temp-${Date.now()}`, name: "" }]);
  };

  const handleAliasNameChange = (id: string, newName: string) => {
    setAliases((prev) =>
      prev.map((alias) =>
        alias.id === id ? { ...alias, name: newName } : alias,
      ),
    );
  };

  const handleRemoveAlias = (id: string) => {
    setAliases((prev) => prev.filter((alias) => alias.id !== id));
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleMentionsChange = useCallback(
    (mentions: { id: string; name: string }[]) => {
      const validMentions = mentions.filter((m) => m.id && m.id !== "");
      const newReferences = validMentions.map((m) => ({
        id: m.id,
        name: m.name,
      })) as ReferencedEntry[];

      setReferences(newReferences);
    },
    [],
  );

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-0">
          {localError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{localError}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Format your description with rich text (bold, lists, tables, etc.). Type{" "}
              <span className="font-mono text-destructive font-semibold">
                @
              </span>{" "}
              to mention and link to other entries.
            </p>
            <TiptapEditor
              value={description}
              onChange={setDescription}
              onMentionsChange={handleMentionsChange}
              placeholder="Enter description here. Use @ to mention other entries."
              searchEntries={searchEntriesByName}
            />
          </div>

          {references.length > 0 && (
            <div className="space-y-2">
              <Label>Current References</Label>
              <div className="text-sm text-gray-600">
                {references.map((ref) => `${ref.name} (${ref.id})`).join(", ")}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Aliases</Label>
            <div className="space-y-2">
              {aliases.map((alias, idx) => (
                <div key={alias.id} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={alias.name}
                    onChange={(e) =>
                      handleAliasNameChange(alias.id, e.target.value)
                    }
                    placeholder={`Alias ${idx + 1}`}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveAlias(alias.id)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAlias}
              className="mt-2"
              disabled={isSubmitting}
            >
              + Add Alias
            </Button>
          </div>

          <div className="space-y-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={type}
              onValueChange={(val) => setType(val as "exicon" | "lexicon")}
              className="flex space-x-4"
              disabled={isSubmitting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="exicon"
                  id={`type-exicon-form-${entryToEdit?.id || "new"}`}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor={`type-exicon-form-${entryToEdit?.id || "new"}`}
                  className="font-normal"
                >
                  Exicon
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="lexicon"
                  id={`type-lexicon-form-${entryToEdit?.id || "new"}`}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor={`type-lexicon-form-${entryToEdit?.id || "new"}`}
                  className="font-normal"
                >
                  Lexicon
                </Label>
              </div>
            </RadioGroup>
          </div>

          {type === "exicon" && (
            <>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-md max-h-60 overflow-y-auto">
                  {allTags
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-form-${tag.id}-${entryToEdit?.id || "new"}`}
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={() => handleTagChange(tag.id)}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`tag-form-${tag.id}-${entryToEdit?.id || "new"}`}
                          className="font-normal"
                        >
                          {tag.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoLink">Video Link (optional)</Label>
                <Input
                  id="videoLink"
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {entryToEdit ? "Saving Changes..." : "Creating Entry..."}
              </>
            ) : entryToEdit ? (
              "Save Changes"
            ) : (
              "Create Entry"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
