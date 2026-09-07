import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient() {
  if (!hasOpenAIKey()) return null;
  if (!client)
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 1,
      timeout: 12_000,
    });
  return client;
}

export function assistantModel() {
  return process.env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5.6-luna";
}
