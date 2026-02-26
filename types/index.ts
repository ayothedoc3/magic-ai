import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "hashedPassword">;

export type Credits = {
  text: number;
  image: number;
};

export type AIProvider = "openai" | "anthropic" | "google";

export type AIModel = {
  name: string;
  provider: AIProvider;
  icon: string;
};
