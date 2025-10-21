import Browserbase from "@browserbasehq/sdk";
import { BROWSER_SESSION_TIMEOUT_SECONDS_DEFAULT } from "../../config/constants";
import {
  BrowserSession,
  BrowserWsEndpointAndHeaders,
  fixedViewport,
} from "./browser-session";

export const apiKey = process.env["BROWSERBASE_API_KEY"] || "";

const bb = new Browserbase({ apiKey });

class BrowserbaseSession implements BrowserSession {
  public readonly provider = "browserbase";
  public readonly viewport = fixedViewport;

  constructor(private readonly session: { connectUrl?: string; id: string }) {}

  get sessionId() {
    return this.session.id;
  }

  async generateLiveViewUrl() {
    const liveViewLinks = await bb.sessions.debug(this.session.id);
    return liveViewLinks.debuggerFullscreenUrl;
  }

  async generateWsEndpointAndHeaders(): Promise<BrowserWsEndpointAndHeaders> {
    return { endpoint: this.session.connectUrl! };
  }
}

export async function createBrowserbaseSession({
  name,
  sessionTimeoutSeconds = BROWSER_SESSION_TIMEOUT_SECONDS_DEFAULT,
}: {
  name: string;
  sessionTimeoutSeconds?: number;
}): Promise<BrowserSession> {
  const session = await bb.sessions.create({
    projectId: process.env["BROWSERBASE_PROJECT_ID"]!,
    browserSettings: {
      viewport: fixedViewport,
    },
    keepAlive: true,
    region: process.env["BROWSERBASE_REGION"] as "us-east-1",
    timeout: sessionTimeoutSeconds,
    userMetadata: { name },
  });

  return new BrowserbaseSession(session);
}

export async function retrieveSession(sessionId: string) {
  const session = await bb.sessions.retrieve(sessionId);
  return new BrowserbaseSession(session);
}
