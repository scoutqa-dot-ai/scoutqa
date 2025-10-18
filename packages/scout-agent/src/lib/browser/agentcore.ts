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
import { AWS_AGENT_CORE_BROWSER_IDENTIFIER } from "../../config/constants";

const client = new BedrockAgentCoreClient();

// must use a fixed viewport for computer use tool
// https://docs.claude.com/en/docs/agents-and-tools/tool-use/computer-use-tool#follow-implementation-best-practices
const viewPort = { width: 1366, height: 768 } as const;

function getAwsCredentialIdentity() {
  const credentialProvider = fromNodeProviderChain();
  return credentialProvider();
}

export class BrowserSession {
  constructor(
    public readonly sessionId: string,
    private readonly streams: BrowserSessionStream | undefined
  ) {}

  get viewPort() {
    return viewPort;
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
  sessionTimeoutSeconds = 900,
}: {
  browserIdentifier?: string;
  name: string;
  sessionTimeoutSeconds?: number;
}): Promise<BrowserSession> {
  const startCmd = new StartBrowserSessionCommand({
    browserIdentifier,
    name,
    sessionTimeoutSeconds,
    viewPort,
  });
  const startOutput = await client.send(startCmd);
  return new BrowserSession(startOutput.sessionId!, startOutput.streams);
}

export interface GetBrowserSessionInput {
  browserIdentifier?: string;
  sessionId: string;
}

export async function getBrowserSession({
  browserIdentifier = AWS_AGENT_CORE_BROWSER_IDENTIFIER,
  sessionId,
}: GetBrowserSessionInput): Promise<BrowserSession> {
  const getCmd = new GetBrowserSessionCommand({
    browserIdentifier,
    sessionId,
  });
  const getOutput = await client.send(getCmd);
  return new BrowserSession(getOutput.sessionId!, getOutput.streams);
}
