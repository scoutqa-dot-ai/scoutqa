import { randomBytes } from "node:crypto";
import { Sha256 } from "@aws-crypto/sha256-js";
import {
  BedrockAgentCoreClient,
  BrowserSessionStream,
  GetBrowserSessionCommand,
  StartBrowserSessionCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import {
  AWS_AGENT_CORE_BROWSER_IDENTIFIER,
  BROWSER_SESSION_TIMEOUT_SECONDS_DEFAULT,
} from "../../config/constants";
import { BrowserSession, fixedViewport } from "./browser-session";

const client = new BedrockAgentCoreClient();

function getAwsCredentialIdentity() {
  const credentialProvider = fromNodeProviderChain();
  return credentialProvider();
}

class AgentCoreBrowserSession implements BrowserSession {
  public readonly provider = "aws";
  public readonly viewport = fixedViewport;

  constructor(
    public readonly sessionId: string,
    private readonly streams: BrowserSessionStream | undefined
  ) {}

  async generateLiveViewUrl({
    expiresInSeconds = 300,
  }: {
    expiresInSeconds?: number;
  } = {}) {
    const { liveViewStream } = this.streams ?? {};
    if (typeof liveViewStream === "undefined") {
      throw new Error("AgentCore Browser live view stream is not enabled");
    }

    const presignedUrl = new URL(liveViewStream.streamEndpoint!);
    const request = new HttpRequest({
      method: "GET",
      protocol: presignedUrl.protocol,
      hostname: presignedUrl.hostname,
      path: presignedUrl.pathname,
      headers: {
        host: presignedUrl.hostname,
      },
    });

    const credentials = await getAwsCredentialIdentity();
    const signer = new SignatureV4({
      credentials,
      region: client.config.region,
      service: "bedrock-agentcore",
      sha256: Sha256,
      applyChecksum: false,
    });
    const signedRequest = await signer.presign(request, {
      expiresIn: expiresInSeconds,
    });

    for (const [key, value] of Object.entries(signedRequest.query || {})) {
      if (typeof value === "string") {
        presignedUrl.searchParams.append(key, value);
      }
    }

    // https://github.com/scoutqa-dot-ai/dcv-viewer/blob/7234313/src/index.html#L44
    const viewerPayload = {
      presignedUrl: presignedUrl.toString(),
      width: this.viewport.width,
      height: this.viewport.height,
    };

    const base64EncodedPayload = Buffer.from(
      JSON.stringify(viewerPayload)
    ).toString("base64");

    return `https://scoutqa-dot-ai.github.io/dcv-viewer/#${base64EncodedPayload}`;
  }

  async generateWsEndpointAndHeaders() {
    const { automationStream } = this.streams ?? {};
    if (
      typeof automationStream === "undefined" ||
      automationStream.streamStatus !== "ENABLED"
    ) {
      throw new Error("Automation stream is not enabled");
    }

    const endpoint = automationStream.streamEndpoint!;
    const { host, pathname } = new URL(endpoint);

    // adapted from Python SDK
    // https://github.com/aws/bedrock-agentcore-sdk-python/blob/a9ad13a/src/bedrock_agentcore/tools/browser_client.py#L165
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const request = new HttpRequest({
      method: "GET",
      protocol: "https:",
      hostname: host,
      path: pathname,
      headers: {
        host: host,
        "x-amz-date": amzDate,
      },
    });

    const credentials = await getAwsCredentialIdentity();
    const signer = new SignatureV4({
      credentials,
      region: client.config.region,
      service: "bedrock-agentcore",
      sha256: Sha256,
      applyChecksum: false,
    });
    const signedRequest = await signer.sign(request);
    const headers: Record<string, string> = {
      Host: host,
      "X-Amz-Date": amzDate,
      Authorization: signedRequest.headers["authorization"] as string,
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": Buffer.from(randomBytes(16)).toString("base64"),
      "User-Agent": `BrowserSandbox-Client/1.0 (Session: ${this.sessionId})`,
    };

    const securityToken = signedRequest.headers["x-amz-security-token"];
    if (typeof securityToken === "string") {
      headers["X-Amz-Security-Token"] = securityToken;
    }

    return { endpoint, headers };
  }
}

export async function startBrowserSession({
  browserIdentifier = AWS_AGENT_CORE_BROWSER_IDENTIFIER,
  name,
  sessionTimeoutSeconds = BROWSER_SESSION_TIMEOUT_SECONDS_DEFAULT,
}: {
  browserIdentifier?: string;
  name: string;
  sessionTimeoutSeconds?: number;
}): Promise<BrowserSession> {
  const startCmd = new StartBrowserSessionCommand({
    browserIdentifier,
    name,
    sessionTimeoutSeconds,
    viewPort: fixedViewport,
  });
  const startOutput = await client.send(startCmd);
  return new AgentCoreBrowserSession(
    startOutput.sessionId!,
    startOutput.streams
  );
}

export async function getBrowserSession({
  browserIdentifier = AWS_AGENT_CORE_BROWSER_IDENTIFIER,
  sessionId,
}: {
  browserIdentifier?: string;
  sessionId: string;
}): Promise<BrowserSession> {
  const getCmd = new GetBrowserSessionCommand({
    browserIdentifier,
    sessionId,
  });
  const getOutput = await client.send(getCmd);
  return new AgentCoreBrowserSession(getOutput.sessionId!, getOutput.streams);
}
