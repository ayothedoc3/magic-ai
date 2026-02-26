import "server-only";

type DalleSize = "1024x1024" | "1024x1792" | "1792x1024";
type DalleQuality = "standard" | "hd";
type DalleStyle = "vivid" | "natural";

type DalleRequest = {
  prompt: string;
  size?: DalleSize;
  quality?: DalleQuality;
  style?: DalleStyle;
};

type DalleResponse = {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
};

export async function generateImage({
  prompt,
  size = "1024x1024",
  quality = "standard",
  style = "vivid",
}: DalleRequest): Promise<{ url: string; revisedPrompt?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality,
      style,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `DALL-E request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as DalleResponse;
  const image = data.data?.[0];
  if (!image?.url) {
    throw new Error("DALL-E returned no image");
  }

  return { url: image.url, revisedPrompt: image.revised_prompt };
}
