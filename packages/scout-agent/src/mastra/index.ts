import { Mastra } from "@mastra/core/mastra";
import { logger } from "../lib/mastra/logger";
import { observability } from "../lib/mastra/observability";
import { storage } from "../lib/mastra/storage";
import { manualTesterAgent } from "./agents/manual-tester-agent";
import { testLeadAgent } from "./agents/test-lead-agent";

export const mastra = new Mastra({
  agents: {
    manualTesterAgent,
    testLeadAgent,
  },
  logger,
  observability,
  storage,
});
