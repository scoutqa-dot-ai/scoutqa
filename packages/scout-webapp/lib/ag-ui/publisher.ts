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
  AG_UI_TOOL_NAME_TOOL_CALL,
  AG_UI_TOOL_NAME_TOOL_RESULT,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import type { Subscriber } from "rxjs";

export class Publisher {
  private messageId = randomUUID();
  private threadId: string;
  private runId: string;

  constructor(
    private subscriber: Subscriber<BaseEvent>,
    { threadId, runId }: { threadId: string; runId: string }
  ) {
    this.threadId = threadId;
    this.runId = runId;

    const runStartedEvent: RunStartedEvent = {
      type: EventType.RUN_STARTED,
      threadId,
      runId,
    };
    this.publish(runStartedEvent);
  }

  publish(event: BaseEvent) {
    this.subscriber.next(event);
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

      case "tool-call":
        this.publishToolEvents({
          toolCallId: randomUUID(),
          toolName: AG_UI_TOOL_NAME_TOOL_CALL,
          args: { ...chunk.payload, parentToolCallId },
          result: false,
        });
        break;

      case "tool-output":
        const nestedChunk = chunk.payload.output as ChunkType;
        if (nestedChunk.type.startsWith("tool-")) {
          // only propagate nested tool calls
          // ignore everything else: reasoning, text, etc.
          this.publishChunk(nestedChunk, chunk.payload.toolCallId);
        }
        break;

      case "tool-result":
        this.publishToolEvents({
          toolCallId: randomUUID(),
          toolName: AG_UI_TOOL_NAME_TOOL_RESULT,
          args: false,
          result: { ...chunk.payload, parentToolCallId },
        });
        break;

      case "finish":
        this.messageId = randomUUID();
        break;
    }
  }

  publishToolEvents({
    toolCallId,
    toolName: toolCallName,
    args,
    result,
  }: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result: unknown;
  }) {
    // AG-UI doesn't handle nested tool output yet
    // so we have to split a tool call into two separate ones
    const startEvent: ToolCallStartEvent = {
      type: EventType.TOOL_CALL_START,
      parentMessageId: this.messageId,
      toolCallId,
      toolCallName,
    };
    this.publish(startEvent);
    const argsEvent: ToolCallArgsEvent = {
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: JSON.stringify(args),
    };
    this.publish(argsEvent);
    const endEvent: ToolCallEndEvent = {
      type: EventType.TOOL_CALL_END,
      toolCallId,
    };
    this.publish(endEvent);
    const toolCallResultEvent: ToolCallResultEvent = {
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      content: JSON.stringify(result),
      messageId: randomUUID(),
      role: "tool",
    };
    this.publish(toolCallResultEvent);
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
