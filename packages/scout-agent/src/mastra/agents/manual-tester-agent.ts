import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { bedrock } from "../../lib/llm";
import {
  startOrGetBrowserSession,
  StartOrGetBrowserSessionInput,
} from "../../lib/browser";

export type BuildManualTesterAgentInput = StartOrGetBrowserSessionInput;

export async function buildManualTesterAgent(ctx: BuildManualTesterAgentInput) {
  const browserSession = await startOrGetBrowserSession(ctx);
  const ws = await browserSession.generateWsEndpointAndHeaders();
  const args: string[] = [
    "@playwright/mcp@0.0.43",
    "--cdp-endpoint",
    ws.endpoint,
    ...Object.entries(ws.headers)
      .map(([k, v]) => ["--cdp-header", `${k}:${v}`])
      .flat(),
  ];

  const client = new MCPClient({
    servers: {
      browser: { command: "npx", args },
    },
  });
  client.__setLogger(ctx.mastra!.getLogger());

  const tools = await client.getTools();

  delete tools["browser_browser_close"]; // each thread only has one browser session
  delete tools["browser_browser_install"]; // for obvious reason...
  delete tools["browser_browser_take_screenshot"]; // avoid exceeding token limit

  const manualTesterAgent = new Agent({
    name: "Manual Tester Agent",
    instructions: "You are a manual tester who executes test scenarios",
    model: bedrock("us.anthropic.claude-haiku-4-5-20251001-v1:0"),
    tools,
  });
  manualTesterAgent.__registerMastra(ctx.mastra! as Mastra);
  manualTesterAgent.__registerPrimitives(ctx.mastra!);

  return {
    manualTesterAgent,
    destroy: () => client.disconnect(),
  };
}
