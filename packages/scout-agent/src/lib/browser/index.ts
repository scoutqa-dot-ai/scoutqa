import {
  AWS_AGENT_CORE_BROWSER_NAME_PREFIX,
  RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX,
} from "../../config/constants";
import {
  BrowserSession,
  getBrowserSession,
  startBrowserSession,
} from "./agentcore";
import { getWorkingMemory, GetWorkingMemoryInput } from "../working-memory";

export type StartOrGetBrowserSessionInput = GetWorkingMemoryInput;

export async function startOrGetBrowserSession(
  ctx: StartOrGetBrowserSessionInput
): Promise<BrowserSession> {
  const { mastra, runtimeContext } = ctx;
  const logger = mastra!.getLogger();
  const wm = await getWorkingMemory(ctx);

  const { browserSessionId: sessionId } = wm.get();
  if (typeof sessionId === "string") {
    const existingKey = `${RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX}${sessionId}`;
    const cached = runtimeContext.get<string, BrowserSession>(existingKey);
    if (cached) {
      logger.debug("Reusing cached browser session", { sessionId });
      return cached;
    }

    const existingSession = await getBrowserSession({ sessionId });
    runtimeContext.set(existingKey, existingSession);
    logger.debug("Restored existing browser session", { sessionId });
    return existingSession;
  }

  const name = `${AWS_AGENT_CORE_BROWSER_NAME_PREFIX}${ctx.threadId}`;
  const newSession = await startBrowserSession({ name });
  await wm.set({ browserSessionId: newSession.sessionId });
  const newKey = `${RUNTIME_CONTEXT_KEY_BROWSER_SESSION_PREFIX}${newSession.sessionId}`;
  runtimeContext.set(newKey, newSession);
  logger.debug("Started new browser session", {
    sessionId: newSession.sessionId,
  });
  return newSession;
}

export type { BrowserSession } from "./agentcore";
