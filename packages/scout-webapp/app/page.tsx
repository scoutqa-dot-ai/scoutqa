"use client";

import { Chat } from "@/components/copilotkit/chat";
import {
  LiveViewIframe,
  ToolCallManagerProvider,
} from "@/components/copilotkit/tool-call";

export default function Home() {
  return (
    <ToolCallManagerProvider>
      <div className="font-sans h-full">
        <main className="flex h-full">
          <div className="h-full w-1/3">
            <Chat />
          </div>
          <div className="flex-1">
            <LiveViewIframe />
          </div>
        </main>
      </div>
    </ToolCallManagerProvider>
  );
}
