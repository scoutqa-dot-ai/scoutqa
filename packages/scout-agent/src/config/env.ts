export const SCOUTQA_LOG_LEVEL =
  process.env["SCOUTQA_LOG_LEVEL"] ||
  (process.env["NODE_ENV"] === "production" ? "info" : "debug");

export const SCOUTQA_MANUAL_TESTER_AGENT_MODEL =
  process.env["SCOUTQA_MANUAL_TESTER_AGENT_MODEL"] ||
  "bedrock/global.anthropic.claude-haiku-4-5-20251001-v1:0";

export const SCOUTQA_TEST_LEAD_AGENT_MODEL =
  process.env["SCOUTQA_TEST_LEAD_AGENT_MODEL"] ||
  "bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0";
