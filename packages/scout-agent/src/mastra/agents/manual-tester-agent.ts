import { existsSync } from "node:fs";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { SCOUTQA_MANUAL_TESTER_AGENT_MODEL } from "../../config/env";
import { startOrGetBrowserSession } from "../../lib/browser";
import { llm } from "../../lib/llm";
import { MastraContext } from "../../lib/mastra/context";
import { connectToMcpServer } from "../../lib/mastra/mcp-client";

export async function buildManualTesterAgent(ctx: MastraContext) {
  const logger = ctx.mastra!.getLogger();
  const browserSession = await startOrGetBrowserSession(ctx);
  const ws = await browserSession.generateWsEndpointAndHeaders();

  const args: string[] = [];
  const cliPath = "/usr/local/lib/node_modules/@playwright/mcp/cli.js";
  if (existsSync(cliPath)) {
    // most likely running in our Docker image -> use the globally installed one
    args.push(cliPath);
  } else {
    args.push("npx", "@playwright/mcp@0.0.43");
  }

  // log early before credentials are added
  logger.debug("Starting Playwright MCP client...", { args });

  args.push(
    "--cdp-endpoint",
    ws.endpoint,
    ...Object.entries(ws.headers ?? {})
      .map(([k, v]) => ["--cdp-header", `${k}:${v}`])
      .flat()
  );

  const { disconnect, tools } = await connectToMcpServer("browser", args, ctx);
  delete tools["browser_browser_close"]; // each thread only has one browser session
  delete tools["browser_browser_install"]; // for obvious reason...
  delete tools["browser_browser_take_screenshot"]; // avoid exceeding token limit

  const manualTesterAgent = new Agent({
    name: "Manual Tester Agent",
    instructions: "You are a manual tester who executes test scenarios",
    model: llm(SCOUTQA_MANUAL_TESTER_AGENT_MODEL),
    tools,
  });
  manualTesterAgent.__registerMastra(ctx.mastra! as Mastra);
  manualTesterAgent.__registerPrimitives(ctx.mastra!);

  return {
    browserSession,
    manualTesterAgent,
    disconnect,
  };
}
