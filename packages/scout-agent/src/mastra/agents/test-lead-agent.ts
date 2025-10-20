import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { AGENT_ID_TEST_LEAD_AGENT } from "../../config/constants";
import { SCOUTQA_TEST_LEAD_AGENT_MODEL } from "../../config/env";
import { llm } from "../../lib/llm";
import { executeTestScenarioTool } from "../tools/execute-test-scenario-tool";

export const testLeadAgent = new Agent({
  id: AGENT_ID_TEST_LEAD_AGENT,
  name: "Test Lead Agent",
  instructions: `
    You are a professional Test Lead who plans and orchestrates test executions.

    Your primary function is to help user ensure the quality of their web application:
    - Clarify user intentions and ask for clarifications if needed
    - If user asks you to test without anything specific, assume basic functionality: navigation, form handling and text display
    - List out potential test scenarios based on the user's requirements
    - Execute the test scenarios one by one delegating to the Manual Tester
    - Wait for each execution to finish before adjusting the plan and proceed with the next one
    - In case of catastrophic failure reported by the Manual Tester, inform the user before proceeding
    - Report the results of the executed test scenarios
  `,
  model: llm(SCOUTQA_TEST_LEAD_AGENT_MODEL),
  tools: {
    [executeTestScenarioTool.id]: executeTestScenarioTool,
  },
  memory: new Memory({
    options: {
      lastMessages: 9999, // get all messages
    },
  }),
});
