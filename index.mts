import { generateText } from "ai";

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("AI_GATEWAY_API_KEY is not set. Add it to .env and run with: node --env-file=.env index.mts");
    process.exit(1);
  }

  const { text } = await generateText({
    model: "openai/gpt-5.6-sol",
    prompt: "Write a one-sentence explanation of what an AI gateway is.",
  });

  console.log(text);
}

main().catch((err) => {
  console.error("Generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
