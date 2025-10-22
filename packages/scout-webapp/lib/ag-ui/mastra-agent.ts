import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { AbstractAgent } from "@ag-ui/client";
import type { BaseEvent, RunAgentInput } from "@ag-ui/client";
import { convertAGUIMessagesToMastra } from "@ag-ui/mastra";
import type { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { ChunkFrom } from "@mastra/core/stream";
import {
  AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL,
  RUNTIME_CONTEXT_KEY_RUN_ID,
  RUNTIME_CONTEXT_KEY_THREAD_ID,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { startOrGetBrowserSession } from "@scoutqa-dot-ai/scout-agent/src/lib/browser";
import { Observable } from "rxjs";
import { Publisher } from "./publisher";

async function debugStreamFromEventsJson(
  filePath: string,
  publisher: Publisher
) {
  const lines = readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;

    const event: BaseEvent = JSON.parse(line);
    publisher.publish(event);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  publisher.publishRunFinshedEvent();
}

export class MastraAgent extends AbstractAgent {
  constructor(private agent: Agent) {
    super({ agentId: agent.id });
  }

  run(input: RunAgentInput) {
    const { agent } = this;
    return new Observable<BaseEvent>((subscriber) => {
      const abortController = new AbortController();

      (async function runMastraAgent() {
        try {
          const resourceId = agent.id;
          const threadId = input.threadId;
          const runId = input.runId;
          const runtimeContext = new RuntimeContext();
          runtimeContext.set(RUNTIME_CONTEXT_KEY_RUN_ID, runId);
          runtimeContext.set(RUNTIME_CONTEXT_KEY_THREAD_ID, threadId);

          const convertedMessages = convertAGUIMessagesToMastra([
            // only take the LAST message from incoming payload
            // avoid contaminating the orchestrator's context with sub-agent messages
            input.messages[input.messages.length - 1]!,
          ]);

          const message = convertedMessages[0];
          if (process.env["NODE_ENV"] === "development") {
            const { content } = message;
            if (
              typeof content === "string" &&
              content.match(/^[a-z0-9-]{36}\.json$/) &&
              existsSync(content)
            ) {
              await debugStreamFromEventsJson(
                content,
                new Publisher(subscriber, {
                  debugWriteEventsJson: false,
                  threadId,
                  runId,
                })
              );
              return;
            }
          }

          // optimization: setup browser as soon as possible
          const ctx = {
            mastra: agent.getMastraInstance(),
            runtimeContext,
          };
          const publisher = new Publisher(subscriber, { threadId, runId });
          startOrGetBrowserSession(ctx)
            .then(async (session) => {
              const liveViewUrl = await session.generateLiveViewUrl();
              return {
                liveViewUrl,
                provider: session.provider,
                sessionId: session.sessionId,
              };
            })
            .then((result) => {
              const toolCallId = randomUUID();
              const toolName = AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL;
              publisher.enqueueToolChunk({
                type: "tool-call",
                from: ChunkFrom.AGENT,
                runId,
                payload: { toolCallId, toolName },
              });
              publisher.enqueueToolChunk({
                type: "tool-result",
                from: ChunkFrom.AGENT,
                runId,
                payload: { toolCallId, toolName, result },
              });
            })
            .catch(() => {});

          const streamOutput = await agent.stream([message], {
            abortSignal: abortController.signal,
            maxSteps: 20,
            memory: {
              resource: resourceId,
              thread: threadId,
            },
            runId,
            runtimeContext,
            savePerStep: true,
          });

          for await (const chunk of streamOutput.fullStream) {
            switch (chunk.type) {
              case "error": {
                const { error } = chunk.payload;
                subscriber.error(error);
                return;
              }

              default:
                publisher.publishChunk(chunk);
                break;
            }
          }

          publisher.publishRunFinshedEvent();
        } catch (error) {
          subscriber.error(error);
        } finally {
          // will be ignored if an error is already sent
          subscriber.complete();
        }
      })();

      return () => {
        abortController.abort();
      };
    });
  }
}
