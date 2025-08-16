'use client';

import { useState, useMemo } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { Button } from '@/components/ui/button';
import { Download, Dumbbell } from 'lucide-react';
import { EntryGrid } from '@/components/shared/EntryGrid';
import type { ExiconEntry, Tag, FilterLogic, AnyEntry } from '@/lib/types';
import { exportToCSV } from '@/lib/utils';
import { TagFilter } from '@/components/exicon/TagFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';

interface ExiconClientPageContentProps {
  initialEntries: (ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[];
  allTags: Tag[];
}

export const ExiconClientPageContent = ({ initialEntries, allTags }: ExiconClientPageContentProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('OR');

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

  const handleExportLatest = async () => {
    try {
      const res = await fetch('/api/exicon', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch latest exicon entries');
      const latest: ExiconEntry[] = await res.json();

      const filtered = latest.filter(entry => {
        const matchesSearch =
          searchTerm === '' ||
          entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entry.aliases && entry.aliases.some(alias => {
            const aliasName = typeof alias === 'string' ? alias : alias.name;
            return aliasName?.toLowerCase().includes(searchTerm.toLowerCase());
          }));

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

      exportToCSV(filtered.filter((e): e is ExiconEntry => e.type === 'exicon'));
    } catch (error) {
      console.error('❌ Export CSV Error:', error);
    }
  };

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
          <Button
            onClick={handleExportLatest}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <EntryGrid entries={filteredEntries} />
      </main>
    </div>
  );
};
