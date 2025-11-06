"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { Download, Dumbbell, PencilLine } from "lucide-react";
import { EntryGrid } from "@/components/shared/EntryGrid";
import type { ExiconEntry, Tag, FilterLogic, AnyEntry } from "@/lib/types";
import { exportToCSV } from "@/lib/utils";
import { TagFilter } from "@/components/exicon/TagFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Star } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ExiconClientPageContentProps {
  initialEntries: (ExiconEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  })[];
  allTags: Tag[];
}

const arraysShallowEqual = (first: string[], second: string[]) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((value, index) => value === second[index]);
};

export const ExiconClientPageContent = ({
  initialEntries,
  allTags,
}: ExiconClientPageContentProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize state from URL params
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLetter, setFilterLetter] = useState("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>("OR");
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse URL parameters on mount
  useEffect(() => {
    const tagsParam = searchParams.get("tags");
    const tagLogicParam = searchParams.get("tagLogic");
    const searchParam = searchParams.get("search");
    const letterParam = searchParams.get("letter");

    const tagNames = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : [];
    const nextSelectedTags = tagNames
      .map(
        (name) =>
          allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
            ?.id,
      )
      .filter((id): id is string => id !== undefined);

    const nextFilterLogic: FilterLogic =
      tagLogicParam === "AND" || tagLogicParam === "OR" ? tagLogicParam : "OR";

    const nextSearchTerm = searchParam ?? "";
    const nextFilterLetter =
      letterParam && letterParam.length === 1
        ? letterParam.toUpperCase()
        : "All";

    startTransition(() => {
      setSelectedTags((prev) =>
        arraysShallowEqual(prev, nextSelectedTags) ? prev : nextSelectedTags,
      );
      setFilterLogic((prev) =>
        prev === nextFilterLogic ? prev : nextFilterLogic,
      );
      setSearchTerm((prev) =>
        prev === nextSearchTerm ? prev : nextSearchTerm,
      );
      setFilterLetter((prev) =>
        prev === nextFilterLetter ? prev : nextFilterLetter,
      );
      setIsInitialized((prev) => (prev ? prev : true));
    });
  }, [searchParams, allTags]);

  // Update URL when filters change
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();

    if (selectedTags.length > 0) {
      const tagNames = selectedTags
        .map((id) => allTags.find((tag) => tag.id === id)?.name)
        .filter((name): name is string => name !== undefined);
      params.set("tags", tagNames.join(","));
    }

    if (selectedTags.length > 0 && filterLogic === "AND") {
      params.set("tagLogic", "AND");
    }

    if (searchTerm) {
      params.set("search", searchTerm);
    }

    if (filterLetter !== "All") {
      params.set("letter", filterLetter);
    }

    const nextSearch = params.toString();

    if (nextSearch === searchParamsString) {
      return;
    }

    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    selectedTags,
    filterLogic,
    searchTerm,
    filterLetter,
    isInitialized,
    allTags,
    router,
    pathname,
    searchParamsString,
  ]);

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagId)
        ? prevSelectedTags.filter((id) => id !== tagId)
        : [...prevSelectedTags, tagId],
    );
  };

  const handleFilterLetterChange = (letter: string) => {
    setFilterLetter(letter);
    setSearchTerm("");
  };

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      const matchesSearch =
        searchTerm === "" ||
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.aliases &&
          entry.aliases.some((alias) =>
            alias.name.toLowerCase().includes(searchTerm.toLowerCase()),
          ));

      const matchesLetter =
        filterLetter === "All" ||
        entry.name.toLowerCase().startsWith(filterLetter.toLowerCase());

      const matchesTags = () => {
        if (selectedTags.length === 0) {
          return true;
        }
        const entryTagIds = entry.tags?.map((tag) => tag.id) || [];
        return filterLogic === "AND"
          ? selectedTags.every((selectedTagId) =>
              entryTagIds.includes(selectedTagId),
            )
          : selectedTags.some((selectedTagId) =>
              entryTagIds.includes(selectedTagId),
            );
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

        {/* Common Exercises Section */}
        <Card className="shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Common Exercises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="common-exercises">
                <AccordionTrigger>View Essential F3 Exercises</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click any exercise name to view details or search for it:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <button
                      onClick={() => setSearchTerm("merkin")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Merkin</span> - Push-up
                      variant
                    </button>
                    <button
                      onClick={() => setSearchTerm("burpee")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Burpee</span> - Full body
                      exercise
                    </button>
                    <button
                      onClick={() => setSearchTerm("squat")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Squat</span> - Leg
                      strengthening
                    </button>
                    <button
                      onClick={() => setSearchTerm("plank")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Plank</span> - Core
                      stability
                    </button>
                    <button
                      onClick={() => setSearchTerm("lunge")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Lunge</span> - Leg
                      exercise
                    </button>
                    <button
                      onClick={() => setSearchTerm("mountain climber")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Mountain Climber</span> -
                      Cardio core
                    </button>
                    <button
                      onClick={() => setSearchTerm("imperial walker")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">Imperial Walker</span> -
                      Ab exercise
                    </button>
                    <button
                      onClick={() => setSearchTerm("american hammer")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">American Hammer</span> -
                      Core twist
                    </button>
                    <button
                      onClick={() => setSearchTerm("ssh")}
                      className="text-left px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <span className="font-semibold">SSH</span> - Jumping jack
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
            placeholder="Search exercises by name or alias..."
          />
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/submit?type=exicon" passHref>
              <Button variant="outline" className="w-full sm:w-auto">
                <PencilLine className="mr-2 h-4 w-4" /> Submit Entry
              </Button>
            </Link>
            <Button
              onClick={() =>
                exportToCSV(
                  filteredEntries.filter(
                    (entry): entry is ExiconEntry => entry.type === "exicon",
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
