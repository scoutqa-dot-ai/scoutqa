import {
  BROWSER_SESSION_NAME_PREFIX,
  RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX,
} from "../../config/constants";
import { getWorkingMemory, GetWorkingMemoryInput } from "../working-memory";
import * as agentcore from "./agentcore";
import * as browserbase from "./browserbase";
import { BrowserSession } from "./browser-session";

export type StartOrGetBrowserSessionInput = GetWorkingMemoryInput;

export async function startOrGetBrowserSession(
  ctx: StartOrGetBrowserSessionInput
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
  if ((process.env["BROWSERBASE_API_KEY"] || "").length > 0) {
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

export type { BrowserSession } from "./browser-session";
