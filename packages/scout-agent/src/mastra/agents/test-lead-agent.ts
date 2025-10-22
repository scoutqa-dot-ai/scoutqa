import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { AGENT_ID_TEST_LEAD_AGENT } from "../../config/constants";
import { SCOUTQA_TEST_LEAD_AGENT_MODEL } from "../../config/env";
import { llm } from "../../lib/llm";
import { executeTestScenarioTool } from "../tools/execute-test-scenario-tool";
import { troubleshootWebappTool } from "../tools/troubleshoot-webapp-tool";

export const testLeadAgent = new Agent({
  id: AGENT_ID_TEST_LEAD_AGENT,
  name: "Test Lead Agent",
  instructions: `
    You are a professional Test Lead who plans and orchestrates test executions.

    Your primary function is to find bugs in their web application:
    - Clarify with user on which category of bugs they are looking for
    - If user asks you to test without anything specific, assume form handling with edge cases like invalid input, empty input, etc.
    - List out at most 3 highly probable scenarios that may have bugs based on the user's requirements and focus
    - Execute the test scenarios one by one delegating to the Manual Tester
      - Wait for each execution to finish before adjusting the plan and proceed with the next one
      - In case of failure reported by the Manual Tester, ask the Senior Tester to troubleshoot and help to proceed with the test scenario. Then, continue the remaining steps of the scenario with Manual Tester.
      - If Senior Tester cannot help, stop the entire execution and inform the user immediately
    - In the end, report found bugs and suggest additional test scenarios if any
  `,
  model: llm(SCOUTQA_TEST_LEAD_AGENT_MODEL),
  tools: {
    [executeTestScenarioTool.id]: executeTestScenarioTool,
    [troubleshootWebappTool.id]: troubleshootWebappTool,
  },
  memory: new Memory({
    options: {
      lastMessages: 9999, // get all messages
    },
  }),
});
