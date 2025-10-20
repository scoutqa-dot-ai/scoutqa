"use client";
import "@copilotkit/react-ui/styles.css";

import { CopilotChat } from "@copilotkit/react-ui";
import { CopilotKit } from "@copilotkit/react-core";
import { AGENT_ID_TEST_LEAD_AGENT } from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { RenderMessage } from "./render-message";
import { ToolCallManagerProvider } from "./tool-call";

export function Chat() {
  return (
    <CopilotKit
      agent={AGENT_ID_TEST_LEAD_AGENT}
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
    >
      <ToolCallManagerProvider>
        <CopilotChat
          className="h-full"
          RenderMessage={RenderMessage}
          labels={{
            title: "Scout QA",
            initial: "Hi! 👋 How can I assist you today?",
          }}
        />
      </ToolCallManagerProvider>
    </CopilotKit>
  );
}
