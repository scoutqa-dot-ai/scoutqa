import { LogLevel, MastraLogger } from "@mastra/core/logger";
import { PinoLogger } from "@mastra/loggers";
import { SCOUTQA_LOG_LEVEL } from "../../config/env";

export const logLevel = SCOUTQA_LOG_LEVEL as LogLevel;

export const logger: MastraLogger = new PinoLogger({
  level: logLevel,
  name: "scout-agent",

  // use pino-pretty for dev, otherwise pure JSON
  // https://github.com/mastra-ai/mastra/blob/6324a82/packages/loggers/src/pino.ts#L25
  overrideDefaultTransports: process.env["NODE_ENV"] === "production",
});
