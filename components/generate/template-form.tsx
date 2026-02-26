"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelSelector } from "@/components/chat/model-selector";

type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

type TemplateFormProps = {
  fields: Field[];
  isLoading: boolean;
  credits: number;
  onSubmit: (fields: Record<string, string>, model: string) => void;
};

export function TemplateForm({
  fields,
  isLoading,
  credits,
  onSubmit,
}: TemplateFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [model, setModel] = useState("gpt-4o");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values, model);
  };

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              value={values[field.name] || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          ) : field.type === "select" && field.options ? (
            <select
              id={field.name}
              value={values[field.name] || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              required={field.required}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.name}
              value={values[field.name] || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Label>AI Model</Label>
        <ModelSelector value={model} onChange={setModel} />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading || credits <= 0} className="gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {isLoading ? "Generating..." : "Generate"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Cost: 5 credits &middot; {credits} remaining
        </p>
      </div>
    </form>
  );
}
