import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { TOOL_ID_TROUBLESHOOT_WEBAPP } from "../../config/constants";
import { getHouseKeeper } from "../../lib/mastra/context";
import { NovaAct } from "../../lib/nova-act";

export const troubleshootWebappTool = createTool({
  id: TOOL_ID_TROUBLESHOOT_WEBAPP,
  description:
    "Ask Senior Tester to troubleshoot an execution failure and take a corrective action to proceed with the current test scenario",
  inputSchema: z.object({
    overall: z.string().describe("The overall plan"),
    scenario: z
      .string()
      .describe(
        "The test scenario being executed with step by step progress, status (completed/failed)"
      ),
    currentPageUrl: z
      .string()
      .describe("The page URL after the latest step of the current execution"),
    action: z
      .string()
      .describe(
        [
          "The action you want to do now. ",
          "Examples: find sign in button and click it. ",
          "Or: dismiss the cookie consent banner. ",
          "Be specific and don't waste my time.",
        ].join("")
      ),
  }),
  outputSchema: z.object({
    result: z.unknown(),
  }),
  execute: async (ctx, opts) => {
    const novaAct = new NovaAct(ctx);
    const prompt = `
      The overall plan is:
      ${ctx.context.overall}
      
      Your job is to continue this scenario after the latest failure:
      ${ctx.context.scenario}

      The action to do now is:
      ${ctx.context.action}
    `;
    const startingPage = ctx.context.currentPageUrl;
    const result = await novaAct.act({ prompt, startingPage }, ctx.writer);
    return { result };
  },
});
