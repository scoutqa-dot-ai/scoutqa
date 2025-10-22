import { AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL } from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { createContext, Dispatch, SetStateAction } from "react";
import { LiveViewContextValue } from "./live-view-context";
import {
  knownResultSchema,
  KnownTool,
  knownToolSchema,
} from "./tool-call-schemas";

export type Listener = () => void;

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
  parentToolCallId?: string;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
}

export interface Tool extends ToolCall {
  knownTool?: KnownTool;
  result:
    | { type: "in_progress" }
    | { type: "completed"; data: unknown }
    | { type: "failed"; error: string };
  children: Tool[];
  listeners: Listener[];
}

export class ToolCallManager {
  private tools = new Map<string, Tool>();

  constructor(
    private setLiveViewUrl?: Dispatch<SetStateAction<LiveViewContextValue>>,
  ) {}

  registerToolCall(toolCall: ToolCall) {
    const { toolCallId, toolName, args, parentToolCallId } = toolCall;
    if (this.tools.has(toolCallId)) return;

    const knownTool = knownToolSchema.safeParse(toolCall);

    this.tools.set(toolCallId, {
      toolCallId,
      toolName,
      args,
      parentToolCallId,
      knownTool: knownTool.success ? knownTool.data : undefined,
      result: { type: "in_progress" },
      children: [],
      listeners: [],
    });

    if (typeof parentToolCallId === "string") {
      const parent = this.tools.get(parentToolCallId);
      if (parent) {
        parent.children.push(this.tools.get(toolCallId)!);
      }
    }

    this.notifyByToolCallId(toolCallId);
  }

  addToolCallListener(toolCallId: string, listener: Listener) {
    const tool = this.tools.get(toolCallId);
    if (tool) {
      tool.listeners.push(listener);
      return () => {
        const index = tool.listeners.indexOf(listener);
        if (index === -1) return;
        tool.listeners.splice(index, 1);
      };
    }
    return () => {};
  }

  registerToolResult(toolResult: ToolResult) {
    const { toolCallId } = toolResult;
    const tool = this.tools.get(toolCallId);
    if (!tool) return;

    tool.result = { type: "completed", data: toolResult.result };
    const knownResult = knownResultSchema.safeParse(toolResult.result);
    if (knownResult.success) {
      const r = knownResult.data;

      if (
        tool.toolName === AG_UI_TOOL_NAME_GENERATE_LIVE_VIEW_URL &&
        "liveViewUrl" in r
      ) {
        this.setLiveViewUrl?.(r);
      }

      if ("error" in r) {
        tool.result = { type: "failed", error: r.message };
      } else if ("isError" in r && r.content.length === 1) {
        tool.result = { type: "failed", error: r.content[0].text };
      }
    }

    this.notifyByToolCallId(toolCallId);
  }

  private notifyByToolCallId(toolCallId: string) {
    const tool = this.tools.get(toolCallId);
    if (!tool) return;
    tool.listeners.forEach((listener) => listener());
    this.notifyByToolCallId(tool.parentToolCallId ?? "");
  }

  getTool(toolCallId: string) {
    return this.tools.get(toolCallId);
  }
}

export const ToolCallManagerContext = createContext<ToolCallManager>(
  new ToolCallManager(),
);
