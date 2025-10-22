import { existsSync } from "node:fs";
import { Agent } from "@mastra/core/agent";
import { AGENT_ID_MANUAL_TESTER_AGENT } from "../../config/constants";
import { SCOUTQA_MANUAL_TESTER_AGENT_MODEL } from "../../config/env";
import { startOrGetBrowserSession } from "../../lib/browser";
import { llm } from "../../lib/llm";
import { getHouseKeeper } from "../../lib/mastra/context";
import { connectToMcpServer } from "../../lib/mastra/mcp-client";

export const manualTesterAgent = new Agent({
  id: AGENT_ID_MANUAL_TESTER_AGENT,
  name: "Manual Tester Agent",
  instructions: `
    You are a manual tester who executes test scenarios.

    Your primary function is to find bugs by executing a test scenario:
    - Execute the test step one by one
    - Retry failure at most once to avoid wasting time
      - Stop immediately if you run into blocker mechanism like geo blocker, human verification, captcha, etc. User can help you with those
    - In the end, report what you did and what you observed
      - What is the current page URL, a short description of the state of the application
      - Step by step progress, including whether you were able to complete it or could not
      - When you are unable to finish the scenario, provide additional analysis for user to troubleshoot and maybe retry later
  `,
  model: llm(SCOUTQA_MANUAL_TESTER_AGENT_MODEL),
  tools: async (ctx) => {
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

    args.push("--cdp-endpoint", ws.endpoint);
    logger.debug("Starting Playwright MCP client...", { args }); // log early before credentials are added
    args.push(
      ...Object.entries(ws.headers ?? {})
        .map(([k, v]) => ["--cdp-header", `${k}:${v}`])
        .flat(),
    );

    const client = await connectToMcpServer("browser", args, ctx);
    const { disconnect, tools } = client;
    delete tools["browser_browser_close"]; // each thread only has one browser session
    delete tools["browser_browser_install"]; // for obvious reason...
    delete tools["browser_browser_take_screenshot"]; // avoid exceeding token limit
    delete tools["browser_browser_wait_for"]; // LLM is slow already

    // we don't want agent to perform these
    delete tools["browser_browser_evaluate"];
    delete tools["browser_browser_file_upload"];
    delete tools["browser_browser_snapshot"];

    getHouseKeeper(ctx).onAgentFinish(disconnect);

    return tools;
  },
});
