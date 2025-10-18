import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

export const bedrock = createAmazonBedrock({
  credentialProvider: fromNodeProviderChain(),
});
