import "server-only";

import { AbstractAgent } from "@ag-ui/client";
import type { BaseEvent, RunAgentInput } from "@ag-ui/client";
import { convertAGUIMessagesToMastra } from "@ag-ui/mastra";
import type { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { Observable } from "rxjs";
import { Publisher } from "./publisher";

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
          const publisher = new Publisher(subscriber, { threadId, runId });

          const convertedMessages = convertAGUIMessagesToMastra([
            // only take the LAST message from incoming payload
            // avoid contaminating the orchestrator's context with sub-agent messages
            input.messages[input.messages.length - 1]!,
          ]);

          const streamOutput = await agent.stream(convertedMessages, {
            abortSignal: abortController.signal,
            maxSteps: 20,
            memory: {
              resource: resourceId,
              thread: threadId,
            },
            runId,
            runtimeContext,
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
