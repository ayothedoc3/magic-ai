"use client";

import { useState } from "react";
import { useCompletion } from "@ai-sdk/react";
import { TemplateForm } from "@/components/generate/template-form";
import { GenerationOutput } from "@/components/generate/generation-output";

type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

type GenerateClientProps = {
  templateSlug: string;
  templateId: string;
  fields: Field[];
  credits: number;
};

export function GenerateClient({
  templateSlug,
  templateId,
  fields,
  credits: initialCredits,
}: GenerateClientProps) {
  const [credits, setCredits] = useState(initialCredits);

  const { completion, isLoading, complete } = useCompletion({
    api: "/api/generate",
    onFinish: () => {
      setCredits((c) => Math.max(0, c - 5));
    },
    onError: (err) => {
      console.error("Generation error:", err.message);
    },
  });

  const handleSubmit = (fieldValues: Record<string, string>, model: string) => {
    complete("", {
      body: { templateSlug, fields: fieldValues, model },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <TemplateForm
          fields={fields}
          isLoading={isLoading}
          credits={credits}
          onSubmit={handleSubmit}
        />
      </div>
      <div>
        <GenerationOutput
          output={completion}
          isLoading={isLoading}
          templateId={templateId}
        />
      </div>
    </div>
  );
}
