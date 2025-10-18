import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { bedrock } from "../../lib/llm";
import { executeTestScenarioTool } from "../tools/execute-test-scenario-tool";

export const testLeadAgent = new Agent({
  name: "Test Lead Agent",
  instructions: `
    You are a professional Test Lead who plans and orchestrates test executions.

    Your primary function is to help user ensure the quality of their web application:
    - Clarify user intentions and ask for clarifications if needed
    - If user asks you to test without anything specific, assume basic functionality: navigation, form handling and text display
    - List out potential test scenarios based on the user's requirements
    - Execute the test scenarios one by one delegating to the Manual Tester
    - Report the results of the executed test scenarios
  `,
  model: bedrock("us.anthropic.claude-sonnet-4-5-20250929-v1:0"),
  tools: {
    executeTestScenarioTool,
  },
  memory: new Memory({
    options: {
      lastMessages: 9999, // get all messages
    },
  }),
});
