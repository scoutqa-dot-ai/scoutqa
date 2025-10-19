import { createContext } from "react";
import {
  KnownResult,
  knownResultSchema,
  KnownTool,
  knownToolSchema,
  ToolCall,
  ToolResult,
} from "./tool-call-schemas";

export type Listener = () => void;

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

    if (toolResult.args) {
      tool.args = toolResult.args;
      const knownTool = knownToolSchema.safeParse(tool);
      if (knownTool.success) {
        tool.knownTool = knownTool.data;
      }
    }

    tool.result = { type: "completed", data: toolResult.result };
    const knownResult = knownResultSchema.safeParse(toolResult.result);
    if (knownResult.success) {
      tool.result = { type: "failed", error: knownResult.data.message };
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
  new ToolCallManager()
);
