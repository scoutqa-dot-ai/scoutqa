import { mastra } from "@scoutqa-dot-ai/scout-agent/src/mastra";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { AGENT_ID_TEST_LEAD_AGENT } from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { NextRequest } from "next/server";
import { MastraAgent } from "@/lib/ag-ui/mastra-agent";

export const POST = async (req: NextRequest) => {
  const testLeadAgent = new MastraAgent(mastra.getAgent("testLeadAgent"));

  const runtime = new CopilotRuntime({
    agents: { [AGENT_ID_TEST_LEAD_AGENT]: testLeadAgent },
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
