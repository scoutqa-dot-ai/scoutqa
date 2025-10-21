import {
  AG_UI_TOOL_CALL_ARGS_KEY_ARGS,
  AG_UI_TOOL_CALL_ARGS_KEY_PARENT_TOOL_CALL_ID,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { LiveViewContext, LiveViewContextValue } from "./live-view-context";
import {
  Listener,
  ToolCall as ToolCallType,
  ToolCallManager,
  ToolCallManagerContext,
  ToolResult as ToolResultType,
} from "./tool-call-manager";
import { ToolCallItem } from "./tool-call-item";

export const ToolCallManagerProvider = ({ children }: PropsWithChildren) => {
  const [liveViewUrl, setLiveViewUrl] = useState<LiveViewContextValue>({});
  const [tcm] = useState(() => new ToolCallManager(setLiveViewUrl));
  return (
    <ToolCallManagerContext.Provider value={tcm}>
      <LiveViewContext.Provider value={liveViewUrl}>
        {children}
      </LiveViewContext.Provider>
    </ToolCallManagerContext.Provider>
  );
};

function useToolCallManager() {
  return useContext(ToolCallManagerContext);
}

export const ToolCall = ({
  id: toolCallId,
  functionName,
  functionArguments,
}: {
  id: string;
  functionName: string;
  functionArguments: string;
}) => {
  const toolCall = useMemo<ToolCallType>(() => {
    let args = {};
    let parentToolCallId: string | undefined;
    try {
      const parsed = JSON.parse(functionArguments);
      if (parsed[AG_UI_TOOL_CALL_ARGS_KEY_ARGS]) {
        args = parsed[AG_UI_TOOL_CALL_ARGS_KEY_ARGS];
      }
      if (parsed[AG_UI_TOOL_CALL_ARGS_KEY_PARENT_TOOL_CALL_ID]) {
        parentToolCallId = parsed[AG_UI_TOOL_CALL_ARGS_KEY_PARENT_TOOL_CALL_ID];
      }
    } catch {
      // ignore
    }

    return {
      toolCallId,
      toolName: functionName,
      args,
      parentToolCallId,
    };
  }, [toolCallId, functionName, functionArguments]);
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

export const ToolResult = ({
  toolCallId,
  content,
}: {
  toolCallId: string;
  content: string;
}) => {
  const toolResult = useMemo<ToolResultType>(() => {
    let result = {};
    try {
      result = JSON.parse(content);
    } catch {
      // ignore
    }

    return { toolCallId, result };
  }, [toolCallId, content]);
  const manager = useToolCallManager();
  useEffect(() => {
    if (typeof toolResult !== "undefined") {
      manager.registerToolResult(toolResult);
    }
  }, [manager, toolResult]);
  return null;
};

export { LiveViewIframe } from "./live-view-iframe";
