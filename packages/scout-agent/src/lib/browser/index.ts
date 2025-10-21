import { randomUUID } from "node:crypto";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { ChunkFrom, ChunkType } from "@mastra/core/stream";
import { ToolStream } from "@mastra/core/tools";
import {
  AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL,
  BROWSER_SESSION_NAME_PREFIX,
  RUNTIME_CONTEXT_KEY_BROWSER_LIVE_VIEW_URL_PREFIX,
  RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX,
} from "../../config/constants";
import { MastraContext } from "../mastra/context";
import { getWorkingMemory } from "../working-memory";
import * as agentcore from "./agentcore";
import * as browserbase from "./browserbase";
import { BrowserSession } from "./browser-session";

export async function startOrGetBrowserSession(
  ctx: MastraContext
): Promise<BrowserSession> {
  const { mastra, runtimeContext } = ctx;
  const logger = mastra!.getLogger();
  const wm = await getWorkingMemory(ctx);

  const { browser } = wm.get();
  if (typeof browser !== "undefined") {
    const { provider, sessionId } = browser;
    const existingKey = `${RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX}${provider}${sessionId}`;
    const cached = runtimeContext.get<string, BrowserSession>(existingKey);
    if (cached) {
      logger.debug("Reusing cached browser session", browser);
      return cached;
    }

    switch (browser.provider) {
      case "aws": {
        const existingSession = await agentcore.getBrowserSession(browser);
        runtimeContext.set(existingKey, existingSession);
        logger.debug("Restored existing browser session", browser);
        return existingSession;
      }
      case "browserbase": {
        const existingSession = await browserbase.retrieveSession(sessionId);
        runtimeContext.set(existingKey, existingSession);
        logger.debug("Restored existing browser session", browser);
        return existingSession;
      }
    }
  }

  const name = `${BROWSER_SESSION_NAME_PREFIX}${ctx.threadId}`;
  let newSession: BrowserSession;
  if (browserbase.apiKey.length > 0) {
    newSession = await browserbase.createBrowserbaseSession({ name });
  } else {
    newSession = await agentcore.startBrowserSession({ name });
  }

  const newBrowser = {
    provider: newSession.provider,
    sessionId: newSession.sessionId,
  } as const;
  await wm.set({ browser: newBrowser });
  const newKey = `${RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX}${newSession.provider}${newSession.sessionId}`;
  runtimeContext.set(newKey, newSession);
  logger.debug("Started new browser session", newBrowser);
  return newSession;
}

interface GenerateLiveViewUrlIfHaveNotInput {
  browserSession: BrowserSession;
  runId?: string;
  runtimeContext: RuntimeContext;
  writer?: ToolStream<unknown>;
}

export async function generateLiveViewUrlIfHaveNot({
  browserSession,
  runId,
  runtimeContext,
  writer,
}: GenerateLiveViewUrlIfHaveNotInput) {
  const { provider, sessionId } = browserSession;
  const key = `${RUNTIME_CONTEXT_KEY_BROWSER_LIVE_VIEW_URL_PREFIX}${sessionId}`;
  if (
    runtimeContext.has(key) ||
    typeof runId === "undefined" ||
    typeof writer === "undefined"
  ) {
    return;
  }

  const liveViewUrl = await browserSession.generateLiveViewUrl();
  runtimeContext.set(key, liveViewUrl);

  const toolCallId = randomUUID();
  const toolName = AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL;
  await writer.write({
    type: "tool-call",
    from: ChunkFrom.AGENT,
    runId,
    payload: { toolCallId, toolName, args: {} },
  } satisfies ChunkType);
  await writer.write({
    type: "tool-result",
    from: ChunkFrom.AGENT,
    runId,
    payload: {
      toolCallId,
      toolName,
      result: { liveViewUrl, provider, sessionId },
    },
  } satisfies ChunkType);
}

export type { BrowserSession } from "./browser-session";
