"use client";

import type { Tag, FilterLogic } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface TagFilterProps {
  allTags: Tag[];
  selectedTags: string[];
  onTagChange: (tagId: string) => void;
  filterLogic: FilterLogic;
  onFilterLogicChange: (logic: FilterLogic) => void;
}

export function TagFilter({
  allTags,
  selectedTags,
  onTagChange,
  filterLogic,
  onFilterLogicChange,
}: TagFilterProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-primary" />
          Filter by Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">
            Filter Logic:
          </Label>
          <RadioGroup
            value={filterLogic}
            onValueChange={(value) => onFilterLogicChange(value as FilterLogic)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AND" id="and-logic" />
              <Label htmlFor="and-logic" className="font-normal">
                AND
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OR" id="or-logic" />
              <Label htmlFor="or-logic" className="font-normal">
                OR
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allTags.map((tag) => (
            <div key={tag.id} className="flex items-center space-x-2">
              <Checkbox
                id={`tag-${tag.id}`}
                checked={selectedTags.includes(tag.id)}
                onCheckedChange={() => onTagChange(tag.id)}
              />
              <Label htmlFor={`tag-${tag.id}`} className="font-normal">
                {tag.name}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
