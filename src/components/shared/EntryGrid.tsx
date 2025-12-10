import { useState } from "react";
import type { AnyEntry } from "@/lib/types";
import { EntryCard } from "@/components/shared/EntryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface EntryGridProps {
  entries: AnyEntry[];
  label?: string; // Optional: helpful for logging different entry sources
}

export function EntryGrid({ entries, label }: EntryGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const entriesPerPage = 51;

  if (!entries || entries.length === 0) {
    if (label) {
      console.warn(`[EntryGrid] No entries found for: ${label}`);
    }
    return (
      <p className="text-center text-muted-foreground py-10">
        No entries match your criteria.
      </p>
    );
  }

  const totalPages = Math.ceil(entries.length / entriesPerPage);
  // Clamp current page to valid range when entries change
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = entries.slice(startIndex, endIndex);

  const goToFirstPage = () => {
    setCurrentPage(1);
    setPageInput("1");
  };

  const goToPreviousPage = () => {
    const newPage = Math.max(validCurrentPage - 1, 1);
    setCurrentPage(newPage);
    setPageInput(newPage.toString());
  };

  const goToNextPage = () => {
    const newPage = Math.min(validCurrentPage + 1, totalPages);
    setCurrentPage(newPage);
    setPageInput(newPage.toString());
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
    setPageInput(totalPages.toString());
  };

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    } else {
      setPageInput(validCurrentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputSubmit(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, entries.length)} of{" "}
          {entries.length} entries
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={validCurrentPage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={validCurrentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={(e) => handlePageInputChange(e.target.value)}
                onBlur={handlePageInputSubmit}
                onKeyDown={handlePageInputKeyDown}
                className="w-16 text-center text-sm h-8"
              />
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={validCurrentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={validCurrentPage === totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEntries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
