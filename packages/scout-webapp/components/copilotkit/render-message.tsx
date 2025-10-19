import {
  AssistantMessage as DefaultAssistantMessage,
  ImageRenderer as DefaultImageRenderer,
  RenderMessageProps,
  UserMessage as DefaultUserMessage,
} from "@copilotkit/react-ui";
import {
  AG_UI_TOOL_NAME_TOOL_CALL,
  AG_UI_TOOL_NAME_TOOL_RESULT,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { ToolCall, ToolResult } from "./tool-call";

export const RenderMessage = ({
  UserMessage = DefaultUserMessage,
  AssistantMessage = DefaultAssistantMessage,
  ImageRenderer = DefaultImageRenderer,
  ...props
}: RenderMessageProps) => {
  const {
    message,
    inProgress,
    index,
    isCurrentMessage,
    onRegenerate,
    onCopy,
    markdownTagRenderers,
  } = props;

  switch (message.role) {
    case "user":
      // https://github.com/CopilotKit/CopilotKit/blob/b698003/CopilotKit/packages/react-ui/src/components/chat/messages/RenderMessage.tsx#L27
      return (
        <UserMessage
          key={index}
          rawData={message}
          data-message-role="user"
          message={message}
          ImageRenderer={ImageRenderer}
        />
      );
    case "assistant":
      const { toolCalls } = message;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        const toolElements = toolCalls
          .filter((t) => t.function.name === AG_UI_TOOL_NAME_TOOL_CALL)
          .map((t) => <ToolCall key={t.id} json={t.function.arguments} />);
        if (toolElements.length > 0) {
          return toolElements;
        }
      }

      // https://github.com/CopilotKit/CopilotKit/blob/b698003/CopilotKit/packages/react-ui/src/components/chat/messages/RenderMessage.tsx#L37
      return (
        <AssistantMessage
          key={index}
          data-message-role="assistant"
          subComponent={message.generativeUI?.()}
          rawData={message}
          message={message}
          isLoading={inProgress && isCurrentMessage && !message.content}
          isGenerating={inProgress && isCurrentMessage && !!message.content}
          isCurrentMessage={isCurrentMessage}
          onRegenerate={() => onRegenerate?.(message.id)}
          onCopy={onCopy}
          onThumbsUp={undefined}
          onThumbsDown={undefined}
          markdownTagRenderers={markdownTagRenderers}
          ImageRenderer={ImageRenderer}
        />
      );
    case "tool":
      if (message.toolName === AG_UI_TOOL_NAME_TOOL_RESULT) {
        return <ToolResult json={message.content} />;
      } else {
        return null;
      }
    case "developer":
    case "system":
      // intentionally left empty
      break;
    default:
      throw message satisfies never;
  }

  return null;
};
