'use client';

import { useState, useMemo } from 'react';
import type { AnyEntry, LexiconEntry } from '@/lib/types';
import { SearchBar } from '@/components/shared/SearchBar';
import { Button } from '@/components/ui/button';
import { Download, BookText } from 'lucide-react';
import { EntryGrid } from '@/components/shared/EntryGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';

// A helper function to export to CSV
// This function is robust and handles the potential for different alias types
function exportToCSV(entries: LexiconEntry[], filename: string = 'lexicon-export.csv') {
  if (!entries || entries.length === 0) {
    return;
  }

  const replacer = (_key: string, value: any) => (value === null || value === undefined ? '' : value);

  // Define the CSV header
  const header = ['ID', 'Name', 'Description', 'Aliases'];

  // Map each entry to a CSV row, handling potential missing data
  const csvRows = [
    header.join(','),
    ...entries.map(entry => [
      JSON.stringify(entry.id, replacer),
      JSON.stringify(entry.name, replacer),
      JSON.stringify(entry.description, replacer),
      // Safely map over aliases, handling both string and object types
      JSON.stringify(entry.aliases?.map(alias => (typeof alias === 'string' ? alias : alias.name)).join('; ') || '', replacer),
    ].join(','))
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

interface LexiconClientPageContentProps {
  initialEntries: AnyEntry[];
}

export const LexiconClientPageContent = ({ initialEntries }: LexiconClientPageContentProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLetter, setFilterLetter] = useState('All');

  // Function to handle the letter filter button clicks
  const handleFilterLetterChange = (letter: string) => {
    setFilterLetter(letter);
    setSearchTerm(''); // Clear the search term when a letter is selected
  };

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      // Logic to check if the entry's name starts with the selected letter
      const matchesLetter = filterLetter === 'All' || entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());

      const matchesSearch =
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.aliases && entry.aliases.some(alias => {
          const aliasName = typeof alias === 'string' ? alias : (alias as { name?: string }).name;
          return typeof aliasName === 'string' && aliasName.toLowerCase().includes(searchTerm.toLowerCase());
        }));

      return matchesLetter && matchesSearch;
    });
  }, [initialEntries, searchTerm, filterLetter]);

  const handleExportLatest = () => {
    try {
      const params = new URLSearchParams({
        searchTerm,
        filterLetter,
      });
      const url = `/api/lexicon/export?${params.toString()}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lexicon-export.csv';
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      </aside>

      {/* Main Content */}
      <main className="w-full md:w-3/4 lg:w-4/5">
        <div className="mb-8 text-center">
          <BookText className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold">F3 Lexicon</h1>
          <p className="text-lg text-muted-foreground mt-2">
            The official glossary of F3 terms.
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search Lexicon..." />
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
