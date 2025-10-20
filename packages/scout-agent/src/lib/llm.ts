import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const bedrock = createAmazonBedrock({
  credentialProvider: fromNodeProviderChain(),
});

const openrouter = createOpenRouter({
  headers: {
    "HTTP-Referer": "https://github.com/scoutqa-dot-ai/scoutqa",
    "X-Title": "Scout QA",
  },
});

export function llm(modelId: string) {
  const [provider, rest] = modelId.split("/", 2);
  switch (provider) {
    case "bedrock":
      return bedrock(rest);
    default:
      return openrouter(modelId);
  }
}
