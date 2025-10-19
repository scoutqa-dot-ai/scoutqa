import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Listener,
  ToolCallManager,
  ToolCallManagerContext,
} from "./tool-call-manager";
import { ToolCallItem } from "./tool-call-item";
import { toolCallSchema, toolResultSchema } from "./tool-call-schemas";

export const ToolCallManagerProvider = ({ children }: PropsWithChildren) => {
  const [tcm] = useState(() => new ToolCallManager());
  return (
    <ToolCallManagerContext.Provider value={tcm}>
      {children}
    </ToolCallManagerContext.Provider>
  );
};

export function useToolCallManager() {
  return useContext(ToolCallManagerContext);
}

export const ToolCall = ({ json }: { json: string }) => {
  const toolCall = useMemo(() => {
    try {
      return toolCallSchema.parse(JSON.parse(json));
    } catch {
      return null;
    }
  }, [json]);
  const manager = useToolCallManager();
  useEffect(() => {
    if (toolCall) {
      manager.registerToolCall(toolCall);
    }
  }, [manager, toolCall]);

  const id = toolCall?.parentToolCallId
    ? "" // skip subscription if this is a nested tool call
    : (toolCall?.toolCallId ?? "");
  const subscribe = useCallback(
    (cb: Listener) => manager.addToolCallListener(id, cb),
    [id, manager]
  );
  const getSnapshot = () => manager.getTool(id);
  const tool = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return <ToolCallItem tool={tool} />;
};

export const ToolResult = ({ json }: { json: string }) => {
  const toolResult = useMemo(() => {
    try {
      return toolResultSchema.parse(JSON.parse(json));
    } catch {
      return undefined;
    }
  }, [json]);
  const manager = useToolCallManager();
  useEffect(() => {
    if (typeof toolResult !== "undefined") {
      manager.registerToolResult(toolResult);
    }
  }, [manager, toolResult]);
  return null;
};
