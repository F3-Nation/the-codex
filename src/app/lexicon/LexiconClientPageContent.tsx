"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { AnyEntry, LexiconEntry } from "@/lib/types";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { Download, BookText, PencilLine } from "lucide-react";
import { EntryGrid } from "@/components/shared/EntryGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Star } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// A helper function to export to CSV
// This function is robust and handles the potential for different alias types
function exportToCSV(
  entries: LexiconEntry[],
  filename: string = "lexicon-export.csv",
) {
  if (!entries || entries.length === 0) {
    return;
  }

  const replacer = (_key: string, value: any) =>
    value === null || value === undefined ? "" : value;

  // Define the CSV header
  const header = ["ID", "Name", "Description", "Aliases"];

  // Map each entry to a CSV row, handling potential missing data
  const csvRows = [
    header.join(","),
    ...entries.map((entry) =>
      [
        JSON.stringify(entry.id, replacer),
        JSON.stringify(entry.name, replacer),
        JSON.stringify(entry.description, replacer),
        // Safely map over aliases, handling both string and object types
        JSON.stringify(
          entry.aliases
            ?.map((alias) => (typeof alias === "string" ? alias : alias.name))
            .join("; ") || "",
          replacer,
        ),
      ].join(","),
    ),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

interface LexiconClientPageContentProps {
  initialEntries: AnyEntry[];
}

export const LexiconClientPageContent = ({
  initialEntries,
}: LexiconClientPageContentProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterLetter, setFilterLetter] = useState("All");
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse URL parameters on mount
  useEffect(() => {
    const searchParam = searchParams.get("search");
    const letterParam = searchParams.get("letter");

    const nextSearchTerm = searchParam ?? "";
    const nextFilterLetter =
      letterParam && letterParam.length === 1
        ? letterParam.toUpperCase()
        : "All";

    startTransition(() => {
      setSearchTerm((prev) =>
        prev === nextSearchTerm ? prev : nextSearchTerm,
      );
      setFilterLetter((prev) =>
        prev === nextFilterLetter ? prev : nextFilterLetter,
      );
      setIsInitialized((prev) => (prev ? prev : true));
    });
  }, [searchParams]);

  // Update URL when filters change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();

    if (searchTerm) {
      params.set("search", searchTerm);
    }

    if (filterLetter !== "All") {
      params.set("letter", filterLetter);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "/lexicon";
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, filterLetter, isInitialized, router]);

  // Function to handle the letter filter button clicks
  const handleFilterLetterChange = (letter: string) => {
    setFilterLetter(letter);
    setSearchTerm(""); // Clear the search term when a letter is selected
  };

  const filteredEntries = useMemo(() => {
    // Helper function to normalize strings for fuzzy matching
    const normalize = (str: string) =>
      str.toLowerCase().replace(/[\s\-_.,!?;:'"]/g, "");

    return initialEntries
      .map((entry) => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const normalizedSearchTerm = normalize(searchTerm);
        const lowerName = entry.name.toLowerCase();
        const normalizedName = normalize(entry.name);
        const lowerDescription = entry.description?.toLowerCase() || "";
        const normalizedDescription = normalize(entry.description || "");

        // Calculate search priority (lower is better)
        let searchPriority = Infinity;
        let matchesSearch = searchTerm === "";

        if (searchTerm !== "") {
          // Check name matches
          if (lowerName === lowerSearchTerm) {
            searchPriority = 1; // Exact name match
            matchesSearch = true;
          } else if (lowerName.startsWith(lowerSearchTerm)) {
            searchPriority = 2; // Name starts with search
            matchesSearch = true;
          } else if (lowerName.includes(lowerSearchTerm)) {
            searchPriority = 3; // Name contains search
            matchesSearch = true;
          }

          // Check alias matches
          if (entry.aliases) {
            for (const alias of entry.aliases) {
              const aliasName =
                typeof alias === "string"
                  ? alias
                  : (alias as { name?: string }).name;
              if (typeof aliasName === "string") {
                const lowerAlias = aliasName.toLowerCase();
                if (lowerAlias === lowerSearchTerm) {
                  searchPriority = Math.min(searchPriority, 4); // Exact alias match
                  matchesSearch = true;
                } else if (lowerAlias.startsWith(lowerSearchTerm)) {
                  searchPriority = Math.min(searchPriority, 5); // Alias starts with search
                  matchesSearch = true;
                } else if (lowerAlias.includes(lowerSearchTerm)) {
                  searchPriority = Math.min(searchPriority, 6); // Alias contains search
                  matchesSearch = true;
                }
              }
            }
          }

          // Fuzzy match on name (normalized)
          if (normalizedName.includes(normalizedSearchTerm)) {
            searchPriority = Math.min(searchPriority, 7); // Fuzzy name match
            matchesSearch = true;
          }

          // Fuzzy match on aliases (normalized)
          if (entry.aliases) {
            for (const alias of entry.aliases) {
              const aliasName =
                typeof alias === "string"
                  ? alias
                  : (alias as { name?: string }).name;
              if (typeof aliasName === "string") {
                const normalizedAlias = normalize(aliasName);
                if (normalizedAlias.includes(normalizedSearchTerm)) {
                  searchPriority = Math.min(searchPriority, 8); // Fuzzy alias match
                  matchesSearch = true;
                }
              }
            }
          }

          // Check description match
          if (lowerDescription.includes(lowerSearchTerm)) {
            searchPriority = Math.min(searchPriority, 9); // Description contains search
            matchesSearch = true;
          }

          // Fuzzy match on description (normalized) - lowest priority
          if (normalizedDescription.includes(normalizedSearchTerm)) {
            searchPriority = Math.min(searchPriority, 10); // Fuzzy description match
            matchesSearch = true;
          }
        }

        const matchesLetter =
          filterLetter === "All" ||
          entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());

        return {
          entry,
          searchPriority,
          matches: matchesLetter && matchesSearch,
        };
      })
      .filter((item) => item.matches)
      .sort((a, b) => {
        // Sort by search priority first
        if (a.searchPriority !== b.searchPriority) {
          return a.searchPriority - b.searchPriority;
        }
        // Then alphabetically by name
        return a.entry.name.localeCompare(b.entry.name);
      })
      .map((item) => item.entry);
  }, [initialEntries, searchTerm, filterLetter]);

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
              {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map(
                (letter) => (
                  <button
                    key={letter}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filterLetter === letter
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    onClick={() => handleFilterLetterChange(letter)}
                  >
                    {letter}
                  </button>
                ),
              )}
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

        {/* Common Terms Section */}
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Essential F3 Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="common-terms">
                <AccordionTrigger>View Common F3 Terminology</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click any term to search for its full definition:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <button
                      onClick={() => setSearchTerm("pax")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">PAX</span> - Workout
                      participants
                    </button>
                    <button
                      onClick={() => setSearchTerm("q")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Q</span> - Workout leader
                    </button>
                    <button
                      onClick={() => setSearchTerm("fng")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">FNG</span> - Friendly New
                      Guy
                    </button>
                    <button
                      onClick={() => setSearchTerm("ao")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">AO</span> - Area of
                      Operation
                    </button>
                    <button
                      onClick={() => setSearchTerm("beatdown")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Beatdown</span> - The
                      workout
                    </button>
                    <button
                      onClick={() => setSearchTerm("cot")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">COT</span> - Circle of
                      Trust
                    </button>
                    <button
                      onClick={() => setSearchTerm("hc")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">HC</span> - Hard Commit
                    </button>
                    <button
                      onClick={() => setSearchTerm("mumblechatter")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Mumblechatter</span> -
                      Talking during workout
                    </button>
                    <button
                      onClick={() => setSearchTerm("weinke")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Weinke</span> - Workout
                      plan
                    </button>
                    <button
                      onClick={() => setSearchTerm("coupon")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Coupon</span> - Workout
                      equipment
                    </button>
                    <button
                      onClick={() => setSearchTerm("six")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Six</span> - Your rear end
                    </button>
                    <button
                      onClick={() => setSearchTerm("ruck")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Ruck</span> - Weighted
                      backpack
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search terms by name, alias, or description..."
          />
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/submit?type=lexicon" passHref>
              <Button variant="outline" className="w-full sm:w-auto">
                <PencilLine className="mr-2 h-4 w-4" /> Submit Entry
              </Button>
            </Link>
            <Button
              onClick={() =>
                exportToCSV(
                  filteredEntries.filter(
                    (entry): entry is LexiconEntry => entry.type === "lexicon",
                  ),
                )
              }
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
