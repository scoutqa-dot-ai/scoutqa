"use client";
import "@copilotkit/react-ui/styles.css";

import { CopilotChat } from "@copilotkit/react-ui";
import { CopilotKit } from "@copilotkit/react-core";
import { AGENT_ID_TEST_LEAD_AGENT } from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { RenderMessage } from "./render-message";

export function Chat() {
  return (
    <CopilotKit
      agent={AGENT_ID_TEST_LEAD_AGENT}
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
    >
      <CopilotChat
        className="h-full"
        RenderMessage={RenderMessage}
        labels={{
          title: "Scout QA",
          initial: "Hi there 👋, let's test some website today!",
        }}
      />
    </CopilotKit>
  );
}
