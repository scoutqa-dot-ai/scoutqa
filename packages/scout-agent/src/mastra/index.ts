import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { logger } from "../lib/mastra/logger";
import { observability } from "../lib/mastra/observability";
import { testLeadAgent } from "./agents/test-lead-agent";

export const mastra = new Mastra({
  agents: { testLeadAgent },
  logger,
  observability,
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
});
