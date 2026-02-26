type OpenAIChatRole = "system" | "user" | "assistant";

export type OpenAIChatMessage = {
  role: OpenAIChatRole;
  content: string;
};

export type OpenAIChatResult = {
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

type ChatCompletionChoice = {
  message?: {
    content?:
      | string
      | Array<{
          type?: string;
          text?: string;
        }>;
  };
};

type ChatCompletionResponse = {
  model?: string;
  choices?: ChatCompletionChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

function getResponseText(choice: ChatCompletionChoice | undefined) {
  const content = choice?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function callOpenAIChatCompletion(params: {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens,
    }),
    cache: "no-store",
  });

  let data: ChatCompletionResponse | null = null;
  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    // If JSON parsing fails, we'll throw a generic error below.
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = getResponseText(data?.choices?.[0]);
  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  return {
    text,
    model: data?.model ?? params.model,
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
    },
  } satisfies OpenAIChatResult;
}
