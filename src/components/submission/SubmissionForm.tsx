'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { submitNewEntrySuggestion, fetchAllTags } from '@/app/submit/actions';
import type { Tag } from '@/lib/types';

export function SubmissionForm() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState('');
  const [type, setType] = useState<'exicon' | 'lexicon'>('exicon');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]); // Store tag IDs
  const [videoLink, setVideoLink] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    const loadTags = async () => {
      try {
        setIsLoadingTags(true);
        const tags = await fetchAllTags();
        setAvailableTags(tags.sort((a,b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to load tags for submission form:", error);
        toast({ title: "Error loading tags", description: "Could not load tags for the form.", variant: "destructive" });
      } finally {
        setIsLoadingTags(false);
      }
    };
    loadTags();
  }, [toast]);


  const resetForm = () => {
    setName('');
    setDescription('');
    setAliases('');
    setType('exicon');
    setSelectedTagIds([]);
    setVideoLink('');
    setSubmitterName('');
    setSubmitterEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
        toast({
            title: "Missing Information",
            description: "Please provide at least a name and description.",
            variant: "destructive",
        });
        return;
    }

    const formDataForAction = {
      name,
      description,
      aliases: aliases.split(',').map(a => a.trim()).filter(Boolean),
      type,
      // For 'new' submission, we send tag *names* or *IDs*. The backend action/API should resolve these.
      // Here, we'll send selected tag IDs, and expect the backend to use them (or names if IDs are not stable for new tags from user)
      tags: type === 'exicon' ? selectedTagIds.map(id => availableTags.find(t => t.id === id)?.name).filter(Boolean) as string[] : [],
      videoLink: type === 'exicon' ? videoLink : undefined,
      submitterName: submitterName || undefined,
      submitterEmail: submitterEmail || undefined,
    };
    
    try {
      await submitNewEntrySuggestion(formDataForAction);
      toast({
          title: "Submission Received",
          description: `Thank you, ${submitterName || 'Anonymous'}! Your submission for "${name}" has been sent for review.`,
      });
      resetForm();
    } catch (error) {
      console.error("Error submitting new entry:", error);
      toast({ title: "Submission Failed", description: "Could not submit your entry. Please try again.", variant: "destructive"});
    }
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Submit an Entry</CardTitle>
        <CardDescription>
          Have an exercise or term to add? Fill out the form below. All submissions will be reviewed by an admin.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="submitterName">Your Name (Optional)</Label>
              <Input id="submitterName" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submitterEmail">Your Email (Optional)</Label>
              <Input id="submitterEmail" type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} />
            </div>
          </div>
          
          <hr/>

          <div className="space-y-2">
            <Label htmlFor="name">Entry Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aliases">Aliases (comma-separated)</Label>
            <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Entry Type <span className="text-destructive">*</span></Label>
            <RadioGroup value={type} onValueChange={(newVal) => setType(newVal as 'exicon' | 'lexicon')} className="flex space-x-4 pt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exicon" id="type-exicon-submit" />
                <Label htmlFor="type-exicon-submit" className="font-normal">Exicon (Exercise)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lexicon" id="type-lexicon-submit" />
                <Label htmlFor="type-lexicon-submit" className="font-normal">Lexicon (Term)</Label>
              </div>
            </RadioGroup>
          </div>

          {type === 'exicon' && (
            <>
              <div className="space-y-2">
                <Label>Tags (for Exicon)</Label>
                {isLoadingTags ? <p>Loading tags...</p> : availableTags.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border rounded-md max-h-60 overflow-y-auto">
                    {availableTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-submit-${tag.id}`}
                          checked={selectedTagIds.includes(tag.id)}
                          onCheckedChange={() => handleTagChange(tag.id)}
                        />
                        <Label htmlFor={`tag-submit-${tag.id}`} className="font-normal">{tag.name}</Label>
                      </div>
                    ))}
                  </div>
                ) : <p>No tags available.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoLink">Video Link (for Exicon, optional)</Label>
                <Input id="videoLink" type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://youtube.com/watch?v=..."/>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full text-lg py-6">Submit for Review</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
