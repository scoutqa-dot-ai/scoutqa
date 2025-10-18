import { ObservabilityRegistryConfig } from "@mastra/core/ai-tracing";
import { LangfuseExporter } from "@mastra/langfuse";
import { logger, logLevel } from "./logger";

const langfuseBaseUrl =
  process.env["LANGFUSE_BASE_URL"] || "https://us.cloud.langfuse.com";
const langfusePublicKey = process.env["LANGFUSE_PUBLIC_KEY"] || "";
const langfuseSecretKey = process.env["LANGFUSE_SECRET_KEY"] || "";
const hasLangfuseKeys =
  langfusePublicKey.length > 0 && langfuseSecretKey.length > 0;

export const observability: ObservabilityRegistryConfig = hasLangfuseKeys
  ? {
      configs: {
        langfuse: {
          serviceName: "scout-agent",
          exporters: [
            new LangfuseExporter({
              baseUrl: langfuseBaseUrl,
              logLevel: logLevel === "silent" ? "error" : logLevel,
              publicKey: langfusePublicKey,
              secretKey: langfuseSecretKey,
            }),
          ],
        },
      },
    }
  : {};
