import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { AI_MODELS } from "./constants";

type ModelId = keyof typeof AI_MODELS;

export function getModel(modelId: string) {
  const config = AI_MODELS[modelId as ModelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  switch (config.provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    case "google":
      return google(modelId);
    default:
      throw new Error(`Unknown provider for model: ${modelId}`);
  }
}

export function isModelAvailable(modelId: string): boolean {
  const config = AI_MODELS[modelId as ModelId];
  if (!config) return false;

  switch (config.provider) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    case "google":
      return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
    default:
      return false;
  }
}

export function getAvailableModels() {
  return Object.entries(AI_MODELS)
    .filter(([id]) => isModelAvailable(id))
    .map(([id, config]) => ({ id, ...config }));
}
