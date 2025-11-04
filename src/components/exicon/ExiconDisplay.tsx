// src/components/exicon/ExiconDisplay.tsx

"use client";

import { useState, useMemo } from "react";
import type { ExiconEntry, Tag, FilterLogic } from "@/lib/types";
import { SearchBar } from "@/components/shared/SearchBar";
import { TagFilter } from "@/components/exicon/TagFilter";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EntryGrid } from "@/components/shared/EntryGrid";

interface ExiconDisplayProps {
  initialEntries: ExiconEntry[];
  allTags: Tag[];
}

function exportToCSV(entries: ExiconEntry[], filename = "exicon-export.csv") {
  if (!entries.length) {
    alert("No entries to export.");
    return;
  }

  const replacer = (_: string, value: any) =>
    value === null || value === undefined ? "" : value;

  const header = ["ID", "Name", "Description", "Aliases", "Tags", "Video Link"];
  const csvRows = [
    header.join(","),
    ...entries.map((entry) => {
      const aliasNames =
        entry.aliases?.map((alias) => alias.name).join("; ") || "";
      const tagNames = entry.tags?.map((tag) => tag.name).join("; ") || "";
      return [
        JSON.stringify(entry.id, replacer),
        JSON.stringify(entry.name, replacer),
        JSON.stringify(entry.description, replacer),
        JSON.stringify(aliasNames, replacer),
        JSON.stringify(tagNames, replacer),
        JSON.stringify(entry.videoLink || "", replacer),
      ].join(",");
    }),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExiconDisplay({ initialEntries, allTags }: ExiconDisplayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>("OR");

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const filteredEntries = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();

    return initialEntries.filter((entry) => {
      const nameMatch = entry.name.toLowerCase().includes(searchTermLower);
      const descMatch = entry.description
        .toLowerCase()
        .includes(searchTermLower);
      const aliasMatch =
        entry.aliases?.some((alias) =>
          alias.name.toLowerCase().includes(searchTermLower),
        ) || false;

      if (!(nameMatch || descMatch || aliasMatch)) return false;

      if (!selectedTags.length) return true;
      const entryTagIds = entry.tags?.map((tag) => tag.id) || [];
      return filterLogic === "AND"
        ? selectedTags.every((tagId) => entryTagIds.includes(tagId))
        : selectedTags.some((tagId) => entryTagIds.includes(tagId));
    });
  }, [initialEntries, searchTerm, selectedTags, filterLogic]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-1/4 lg:w-1/5">
        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onTagChange={handleTagChange}
          filterLogic={filterLogic}
          onFilterLogicChange={setFilterLogic}
        />
      </aside>
      <main className="w-full md:w-3/4 lg:w-4/5">
        <div className="mb-6 flex flex-col  sm:flex-row gap-4 items-center">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search Exicon..."
          />
          <Button
            onClick={() => exportToCSV(filteredEntries)}
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
}
