"use client";

import { format, subDays, subYears } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) {
  const today = new Date();

  const applyPreset = (from: Date, to?: Date) => {
    onDateFromChange(format(from, "yyyy-MM-dd"));
    onDateToChange(to ? format(to, "yyyy-MM-dd") : "");
  };

  const clearFilter = () => {
    onDateFromChange("");
    onDateToChange("");
  };

  const isActive = dateFrom !== "" || dateTo !== "";

  const parsedFrom = dateFrom ? new Date(dateFrom + "T00:00:00") : undefined;
  const parsedTo = dateTo ? new Date(dateTo + "T00:00:00") : undefined;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Filter by Date Added
          </span>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => applyPreset(subDays(today, 30))}
            className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyPreset(subDays(today, 90))}
            className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => applyPreset(subYears(today, 1))}
            className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Last Year
          </button>
          <button
            onClick={() =>
              applyPreset(
                new Date("2000-01-01"),
                new Date("2023-12-31"),
              )
            }
            className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Before 2024
          </button>
        </div>

        {/* Custom Date Pickers */}
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 text-xs",
                    !dateFrom && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dateFrom ? format(parsedFrom!, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedFrom}
                  onSelect={(day) =>
                    onDateFromChange(day ? format(day, "yyyy-MM-dd") : "")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8 text-xs",
                    !dateTo && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dateTo ? format(parsedTo!, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedTo}
                  onSelect={(day) =>
                    onDateToChange(day ? format(day, "yyyy-MM-dd") : "")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
