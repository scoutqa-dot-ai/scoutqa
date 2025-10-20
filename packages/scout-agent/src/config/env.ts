export const SCOUTQA_LOG_LEVEL =
  process.env["SCOUTQA_LOG_LEVEL"] ||
  (process.env["NODE_ENV"] === "production" ? "info" : "debug");
