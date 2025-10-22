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
          initial: "Hi there 👋, let's test your webapp today!",
        }}
        suggestions={[
          {
            title: "AirBnb",
            message: "Verify booking flow on airbnb.com",
          },
          {
            title: "Google",
            message: "Make sure user can see latest weather on google.com",
          },
          {
            title: "Medium",
            message:
              "Make sure user can follow links on https://medium.com/blog/32-of-our-favorite-medium-stories-of-2023-1fb10ca34cd8",
          },
          {
            title: "Temu",
            message: "Testing buying a hoodie on temu.com",
          },
        ]}
      />
    </CopilotKit>
  );
}
