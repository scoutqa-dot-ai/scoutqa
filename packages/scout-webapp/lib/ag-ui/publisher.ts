import "server-only";

import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { EventType } from "@ag-ui/client";
import type {
  BaseEvent,
  RunFinishedEvent,
  RunStartedEvent,
  TextMessageChunkEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
} from "@ag-ui/client";
import type { ChunkType } from "@mastra/core";
import {
  AG_UI_TOOL_CALL_ARGS_KEY_ARGS,
  AG_UI_TOOL_CALL_ARGS_KEY_PARENT_TOOL_CALL_ID,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import type { Subscriber } from "rxjs";

export class Publisher {
  private messageId = randomUUID();
  private debugWriteEventsJson: boolean;
  private threadId: string;
  private runId: string;

  constructor(
    private subscriber: Subscriber<BaseEvent>,
    {
      debugWriteEventsJson,
      threadId,
      runId,
    }: { debugWriteEventsJson?: boolean; threadId: string; runId: string }
  ) {
    this.debugWriteEventsJson = debugWriteEventsJson ?? true;
    this.threadId = threadId;
    this.runId = runId;

    const runStartedEvent: RunStartedEvent = {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    };
    this.subscriber.next(runStartedEvent);
  }

  publish(event: BaseEvent) {
    this.subscriber.next(event);

    if (
      process.env["NODE_ENV"] === "development" &&
      this.debugWriteEventsJson
    ) {
      appendFileSync(`${this.runId}.json`, `${JSON.stringify(event)}\n`);
    }
  }

  publishChunk(chunk: ChunkType, parentToolCallId?: string) {
    // adapted from https://github.com/ag-ui-protocol/ag-ui/blob/59d980a/integrations/mastra/typescript/src/mastra.ts
    switch (chunk.type) {
      case "text-delta": {
        const event: TextMessageChunkEvent = {
          type: EventType.TEXT_MESSAGE_CHUNK,
          role: "assistant",
          messageId: this.messageId,
          delta: chunk.payload.text,
        };
        this.publish(event);
        break;
      }

      case "tool-call": {
        const { toolCallId, toolName, args } = chunk.payload;
        const startEvent: ToolCallStartEvent = {
          type: EventType.TOOL_CALL_START,
          parentMessageId: this.messageId,
          toolCallId,
          toolCallName: toolName,
        };
        this.publish(startEvent);
        const argsEvent: ToolCallArgsEvent = {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId,
          delta: JSON.stringify({
            [AG_UI_TOOL_CALL_ARGS_KEY_ARGS]: args,
            [AG_UI_TOOL_CALL_ARGS_KEY_PARENT_TOOL_CALL_ID]: parentToolCallId,
          }),
        };
        this.publish(argsEvent);
        const endEvent: ToolCallEndEvent = {
          type: EventType.TOOL_CALL_END,
          toolCallId,
        };
        this.publish(endEvent);
        break;
      }

      case "tool-output":
        const nestedChunk = chunk.payload.output as ChunkType;
        if (nestedChunk.type.startsWith("tool-")) {
          // only propagate nested tool calls
          // ignore everything else: reasoning, text, etc.
          this.publishChunk(nestedChunk, chunk.payload.toolCallId);
        }
        break;

      case "tool-result": {
        const { toolCallId, result } = chunk.payload;
        const toolCallResultEvent: ToolCallResultEvent = {
          type: EventType.TOOL_CALL_RESULT,
          toolCallId,
          content: JSON.stringify(result),
          messageId: randomUUID(),
          role: "tool",
        };
        this.publish(toolCallResultEvent);
        break;
      }

      case "finish":
        this.messageId = randomUUID();
        break;
    }
  }

  publishRunFinshedEvent() {
    const runFinishedEvent: RunFinishedEvent = {
      type: EventType.RUN_FINISHED,
      threadId: this.threadId,
      runId: this.runId,
    };
    this.subscriber.next(runFinishedEvent);
  }
}
