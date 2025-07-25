// src/components/submission/SuggestionEditForm.tsx
'use client';

import { useState, useEffect } from 'react';
import type { AnyEntry, ExiconEntry, Tag, EditEntrySuggestionData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { submitEditEntrySuggestion, fetchAllTags } from '@/app/submit/actions'; 

interface SuggestionEditFormProps {
  entryToSuggestEditFor: AnyEntry;
  onFormSubmit: (suggestionData: EditEntrySuggestionData) => void; 
  onClose: () => void;
}

export function SuggestionEditForm({ entryToSuggestEditFor, onFormSubmit, onClose }: SuggestionEditFormProps) {
  const { toast } = useToast();
  const isExicon = entryToSuggestEditFor.type === 'exicon';
  const exiconEntry = isExicon ? (entryToSuggestEditFor as ExiconEntry) : null;

  const [suggestedDescription, setSuggestedDescription] = useState(entryToSuggestEditFor.description);
  const [suggestedAliases, setSuggestedAliases] = useState(''); // Initialize as empty string
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>(exiconEntry?.tags?.map((t: Tag) => t.id) || []);
  const [suggestedVideoLink, setSuggestedVideoLink] = useState(exiconEntry?.videoLink || '');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [comments, setComments] = useState('');

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    const loadTags = async () => {
      try {
        setIsLoadingTags(true);
        const tags = await fetchAllTags(); 
        setAvailableTags(tags.sort((a,b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to load tags for suggestion form:", error);
        toast({ title: "Error loading tags", description: "Could not load tags for the form.", variant: "destructive" });
      } finally {
        setIsLoadingTags(false);
      }
    };
    loadTags();
  }, [toast]);

  // Initialize suggestedAliases based on the entry's aliases
  useEffect(() => {
    if (Array.isArray(entryToSuggestEditFor.aliases)) {
      const formattedAliases = entryToSuggestEditFor.aliases
        .map(alias => {
          if (typeof alias === 'string') return alias;
          if (alias && typeof alias === 'object' && 'name' in alias && typeof alias.name === 'string') return alias.name;
          return ''; // Or handle invalid alias objects as needed
        })
        .filter(Boolean) // Remove any empty strings from invalid aliases
        .join(', ');
      setSuggestedAliases(formattedAliases);
    } else {
      setSuggestedAliases('');
    }
  }, [entryToSuggestEditFor.aliases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comments.trim()) {
      toast({ title: "Comments Required", description: "Please provide comments explaining your suggested changes.", variant: "destructive" });
      return;
    }

    const editDataPayload: EditEntrySuggestionData = {
      entryId: entryToSuggestEditFor.id,
      entryName: entryToSuggestEditFor.name,
      entryType: entryToSuggestEditFor.type,
      changes: {
        description: suggestedDescription !== entryToSuggestEditFor.description ? suggestedDescription : undefined,
        aliases: suggestedAliases.split(',').map(a => a.trim()).filter(Boolean),
        tags: isExicon ? suggestedTagIds.map(id => availableTags.find(t => t.id === id)?.name).filter(Boolean) as string[] : undefined,
        videoLink: isExicon && suggestedVideoLink !== exiconEntry?.videoLink ? suggestedVideoLink : undefined,
      },
      comments,
    };

    // Filter out undefined change fields to only send actual changes
    Object.keys(editDataPayload.changes).forEach(keyStr => {
      const key = keyStr as keyof EditEntrySuggestionData['changes'];
      if (editDataPayload.changes[key] === undefined) {
        delete editDataPayload.changes[key];
      }
      if (Array.isArray(editDataPayload.changes[key]) && (editDataPayload.changes[key] as string[]).length === 0) {
        const originalArray = entryToSuggestEditFor.type === 'exicon' && key === 'tags' ? (entryToSuggestEditFor as ExiconEntry).tags.map(t=>t.name) : (entryToSuggestEditFor[key as keyof AnyEntry] as string[]);
        if (originalArray === undefined || originalArray.length === 0) {
           delete editDataPayload.changes[key];
        }
      }
    });
    
    const submissionPayload = {
      ...editDataPayload,
      submitterName: submitterName || undefined,
      submitterEmail: submitterEmail || undefined,
    };

    try {
      await submitEditEntrySuggestion(submissionPayload);
      toast({
        title: "Suggestion Submitted",
        description: `Your edit suggestions for "${entryToSuggestEditFor.name}" have been sent for review.`,
      });
      onFormSubmit(editDataPayload); 
      onClose(); 
    } catch (error) {
      console.error("Error submitting edit suggestion:", error);
      toast({ title: "Submission Failed", description: "Could not submit your edit suggestion. Please try again.", variant: "destructive" });
    }
  };

  const handleTagChange = (tagId: string) => {
    setSuggestedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="aliases">Aliases</TabsTrigger>
            {isExicon && <TabsTrigger value="video">Video</TabsTrigger>}
            {isExicon && <TabsTrigger value="tags">Tags</TabsTrigger>}
            <TabsTrigger value="info">Info/Comments</TabsTrigger>
          </TabsList>

          <CardContent className="space-y-6 px-1 max-h-[65vh] overflow-y-auto">
            <TabsContent value="description">
              <div className="space-y-2">
                <Label htmlFor="suggestedDescription">Suggested Description</Label>
                <Textarea 
                  id="suggestedDescription" 
                  value={suggestedDescription} 
                  onChange={(e) => setSuggestedDescription(e.target.value)} 
                  rows={8} 
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="aliases">
              <div className="space-y-2">
                <Label htmlFor="suggestedAliases">Suggested Aliases (comma-separated)</Label>
                <Input 
                  id="suggestedAliases" 
                  value={suggestedAliases} 
                  onChange={(e) => setSuggestedAliases(e.target.value)} 
                />
              </div>
            </TabsContent>

            {isExicon && (
              <>
                <TabsContent value="video">
                  <div className="space-y-2">
                    <Label htmlFor="suggestedVideoLink">Suggested Video Link</Label>
                    <Input 
                      id="suggestedVideoLink" 
                      type="url" 
                      value={suggestedVideoLink} 
                      onChange={(e) => setSuggestedVideoLink(e.target.value)} 
                      placeholder={exiconEntry?.videoLink ? "Update existing link" : "https://youtube.com/watch?v=..."}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="tags">
                  <div className="space-y-2">
                    <Label>Suggested Tags</Label>
                    {isLoadingTags ? <p>Loading tags...</p> : availableTags.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-md max-h-48 overflow-y-auto">
                        {availableTags.map(tag => (
                          <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`suggest-tag-${tag.id}`}
                              checked={suggestedTagIds.includes(tag.id)}
                              onCheckedChange={() => handleTagChange(tag.id)}
                            />
                            <Label htmlFor={`suggest-tag-${tag.id}`} className="font-normal">{tag.name}</Label>
                          </div>
                        ))}
                      </div>
                    ): <p>No tags available.</p>}
                  </div>
                </TabsContent>
              </>
            )}
            
            <TabsContent value="info">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="comments">Reason for Changes / Comments <span className="text-destructive">*</span></Label>
                        <Textarea 
                        id="comments" 
                        value={comments} 
                        onChange={(e) => setComments(e.target.value)} 
                        rows={3}
                        required 
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="submitterName-suggest">Your Name (Optional)</Label>
                        <Input id="submitterName-suggest" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="submitterEmail-suggest">Your Email (Optional)</Label>
                        <Input id="submitterEmail-suggest" type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} />
                        </div>
                    </div>
                </div>
            </TabsContent>
          </CardContent>
        </Tabs>
        <CardFooter className="px-1 pt-6 pb-0 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Submit Suggestion</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
