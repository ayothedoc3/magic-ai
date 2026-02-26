"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_MODELS } from "@/lib/constants";

type ModelSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  availableModels?: string[];
};

export function ModelSelector({ value, onChange, availableModels }: ModelSelectorProps) {
  const models = Object.entries(AI_MODELS).filter(
    ([id]) => !availableModels || availableModels.includes(id)
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[180px] text-xs">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map(([id, config]) => (
          <SelectItem key={id} value={id} className="text-xs">
            {config.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
