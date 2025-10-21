import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  AGENT_ID_MANUAL_TESTER_AGENT,
  TOOL_ID_EXECUTE_TEST_SCENARIO,
} from "../../config/constants";
import { getHouseKeeper } from "../../lib/mastra/context";

export const executeTestScenarioTool = createTool({
  id: TOOL_ID_EXECUTE_TEST_SCENARIO,
  description: "Ask Manual Tester to execute a test scenario",
  inputSchema: z.object({
    overall: z.string().describe("The overall plan"),
    scenario: z.string().describe("The test scenario to execute"),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (ctx, opts) => {
    const manualTesterAgent = ctx.mastra!.getAgentById(
      AGENT_ID_MANUAL_TESTER_AGENT
    );

    try {
      const streamOutput = await manualTesterAgent.stream(
        [
          {
            role: "user",
            content: `The overall plan is:\n${ctx.context.overall}\n\nYour job now is to execute this scenario:\n${ctx.context.scenario}`,
          },
        ],
        {
          abortSignal: opts?.abortSignal,
          maxSteps: 20,
          runId: ctx.runId,
          runtimeContext: ctx.runtimeContext,
        }
      );

      streamOutput.fullStream.pipeTo(ctx.writer!);

      const result = await streamOutput.text;
      return { result };
    } finally {
      getHouseKeeper(ctx).agentFinished();
    }
  },
});
