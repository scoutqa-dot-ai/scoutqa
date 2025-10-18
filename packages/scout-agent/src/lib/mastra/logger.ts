import { LogLevel, MastraLogger } from "@mastra/core/logger";
import { PinoLogger } from "@mastra/loggers";

export const logLevel =
  (process.env["LOG_LEVEL"] as LogLevel) ||
  (process.env["NODE_ENV"] === "production" ? "info" : "debug");

export const logger: MastraLogger = new PinoLogger({
  level: logLevel,
  name: "scout-agent",

  // use pino-pretty for dev, otherwise pure JSON
  // https://github.com/mastra-ai/mastra/blob/6324a82/packages/loggers/src/pino.ts#L25
  overrideDefaultTransports: process.env["NODE_ENV"] === "production",
});
