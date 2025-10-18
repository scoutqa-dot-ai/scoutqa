import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { buildManualTesterAgent } from "../agents/manual-tester-agent";

export const executeTestScenarioTool = createTool({
  id: "execute-test-scenario",
  description: "Ask Manual Tester to execute a test scenario",
  inputSchema: z.object({
    overall: z.string().describe("The overall plan"),
    scenario: z.string().describe("The test scenario to execute"),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (ctx, opts) => {
    const { manualTesterAgent, destroy } = await buildManualTesterAgent(ctx);

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
          memory: {
            resource: ctx.resourceId!,
            thread: `${ctx.threadId}/${opts?.toolCallId}`,
          },
        }
      );

      const result = await streamOutput.text;
      return { result };
    } finally {
      await destroy().catch((reason) =>
        console.error("Could not destroy manual tester agent", reason)
      );
    }
  },
});
