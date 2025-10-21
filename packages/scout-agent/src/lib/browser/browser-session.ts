type BrowserProvider = "aws" | "browserbase";

export interface BrowserViewport {
  width: number;
  height: number;
}

// must use a fixed viewport for computer use tool
// https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool#follow-implementation-best-practices
export const fixedViewport: BrowserViewport = { width: 1366, height: 768 };

export interface BrowserWsEndpointAndHeaders {
  endpoint: string;
  headers?: Record<string, string>;
}

export interface BrowserSession {
  readonly provider: BrowserProvider;
  readonly sessionId: string;
  readonly viewport: BrowserViewport;
  generateLiveViewUrl(): Promise<string>;
  generateWsEndpointAndHeaders(): Promise<BrowserWsEndpointAndHeaders>;
}
