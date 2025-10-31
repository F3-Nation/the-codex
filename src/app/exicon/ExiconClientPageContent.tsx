'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBar } from '@/components/shared/SearchBar';
import { Button } from '@/components/ui/button';
import { Download, Dumbbell, PencilLine } from 'lucide-react';
import { EntryGrid } from '@/components/shared/EntryGrid';
import type { ExiconEntry, Tag, FilterLogic, AnyEntry } from '@/lib/types';
import { exportToCSV } from '@/lib/utils';
import { TagFilter } from '@/components/exicon/TagFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import Link from 'next/link';

interface ExiconClientPageContentProps {
  initialEntries: (ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[];
  allTags: Tag[];
}

export const ExiconClientPageContent = ({ initialEntries, allTags }: ExiconClientPageContentProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('OR');
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse URL parameters on mount
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    const tagLogicParam = searchParams.get('tagLogic');
    const searchParam = searchParams.get('search');
    const letterParam = searchParams.get('letter');

    if (tagsParam) {
      // Parse comma-separated tag names and convert to IDs
      const tagNames = tagsParam.split(',').map(t => t.trim());
      const tagIds = tagNames
        .map(name => allTags.find(tag => tag.name.toLowerCase() === name.toLowerCase())?.id)
        .filter((id): id is string => id !== undefined);
      setSelectedTags(tagIds);
    }

    if (tagLogicParam && (tagLogicParam === 'AND' || tagLogicParam === 'OR')) {
      setFilterLogic(tagLogicParam);
    }

    if (searchParam) {
      setSearchTerm(searchParam);
    }

    if (letterParam && letterParam.length === 1) {
      setFilterLetter(letterParam.toUpperCase());
    }

    setIsInitialized(true);
  }, [searchParams, allTags]);

  // Update URL when filters change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();

    if (selectedTags.length > 0) {
      const tagNames = selectedTags
        .map(id => allTags.find(tag => tag.id === id)?.name)
        .filter((name): name is string => name !== undefined);
      params.set('tags', tagNames.join(','));
    }

    if (selectedTags.length > 0 && filterLogic === 'AND') {
      params.set('tagLogic', 'AND');
    }

    if (searchTerm) {
      params.set('search', searchTerm);
    }

    if (filterLetter !== 'All') {
      params.set('letter', filterLetter);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/exicon';
    router.replace(newUrl, { scroll: false });
  }, [selectedTags, filterLogic, searchTerm, filterLetter, isInitialized, allTags, router]);

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagId)
        ? prevSelectedTags.filter((id) => id !== tagId)
        : [...prevSelectedTags, tagId]
    );
  };

  const handleFilterLetterChange = (letter: string) => {
    setFilterLetter(letter);
    setSearchTerm('');
  };

  const filteredEntries = useMemo(() => {
    return initialEntries.filter(entry => {
      const matchesSearch =
        searchTerm === '' ||
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.aliases && entry.aliases.some(alias => alias.name.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());

      const matchesTags = () => {
        if (selectedTags.length === 0) {
          return true;
        }
        const entryTagIds = entry.tags?.map(tag => tag.id) || [];
        return filterLogic === 'AND'
          ? selectedTags.every(selectedTagId => entryTagIds.includes(selectedTagId))
          : selectedTags.some(selectedTagId => entryTagIds.includes(selectedTagId));
      };

      return matchesSearch && matchesLetter && matchesTags();
    });
  }, [initialEntries, searchTerm, filterLetter, selectedTags, filterLogic]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar for Filters */}
      <aside className="w-full md:w-1/4 lg:w-1/5 space-y-4">
        {/* Letter Filter Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Filter by Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((letter) => (
                <button
                  key={letter}
                  className={`px-3 py-1 text-sm rounded-md ${filterLetter === letter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  onClick={() => handleFilterLetterChange(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onTagChange={handleTagChange}
          filterLogic={filterLogic}
          onFilterLogicChange={setFilterLogic}
        />
      </aside>

      {/* Main Content */}
      <main className="w-full md:w-3/4 lg:w-4/5">
        <div className="mb-8 text-center">
          <Dumbbell className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold">F3 Exicon</h1>
          <p className="text-lg text-muted-foreground mt-2">
            The official encyclopedia of F3 exercises.
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search exercises by name or alias..." />
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/submit?type=exicon" passHref>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
              >
                <PencilLine className="mr-2 h-4 w-4" /> Submit Entry
              </Button>
            </Link>
            <Button
              onClick={() => exportToCSV(filteredEntries.filter((entry): entry is ExiconEntry => entry.type === 'exicon'))}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <EntryGrid entries={filteredEntries} />
      </main>
    </div>
  );
};
