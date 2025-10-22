import { motion } from "framer-motion";
import { useState } from "react";
import { Tool } from "./tool-call-manager";
import {
  AG_UI_TOOL_NAME_NOVA_ACT_ACT,
  TOOL_ID_EXECUTE_TEST_SCENARIO,
  TOOL_ID_TROUBLESHOOT_WEBAPP,
} from "@scoutqa-dot-ai/scout-agent/src/config/constants";

function generateToolName(tool: Tool): string {
  const { knownTool, toolName } = tool;
  if (knownTool) {
    switch (knownTool.toolName) {
      case TOOL_ID_EXECUTE_TEST_SCENARIO:
        return knownTool.args.scenario;
      case TOOL_ID_TROUBLESHOOT_WEBAPP:
        return knownTool.args.action;
      case AG_UI_TOOL_NAME_NOVA_ACT_ACT:
        return knownTool.args.action;
      case "browser_browser_click":
        return `Click on ${knownTool.args.element}`;
      case "browser_browser_hover":
        return `Hover on ${knownTool.args.element}`;
      case "browser_browser_navigate":
        return `Navigate to ${knownTool.args.url}`;
      case "browser_browser_press_key":
        return `Press ${knownTool.args.key}`;
      case "browser_browser_select_option":
        return `Select option ${knownTool.args.element}`;
      case "browser_browser_type":
        return `Type ${knownTool.args.text} into ${knownTool.args.element}`;
    }
  }

  if (toolName.startsWith("browser_browser_")) {
    // Mastra MCP client adds an extra `browser_` prefix to the tool names
    // so we remove both that and another one from Playwright MCP server
    let name = toolName.replace("browser_browser_", "");
    name = name.replace(/_/g, " ");
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return name;
  }

  return "";
}

const InProgressNestedToolCall = ({ tool }: { tool: Tool }) => {
  const toolName = generateToolName(tool);
  if (toolName.length === 0) {
    return null;
  }

  return (
    <div
      className="text-xs text-gray-800 line-clamp-1"
      data-id={tool.toolCallId}
    >
      {toolName}
    </div>
  );
};

const NestedToolCallItem = ({ tool }: { tool: Tool }) => {
  const toolName = generateToolName(tool);
  if (toolName.length === 0) {
    return null;
  }

  const { result } = tool;

  return (
    <li className="text-sm line-clamp-1" data-id={tool.toolCallId}>
      {result.type === "in_progress" ? (
        <motion.span
          className="text-gray-800"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {toolName}
        </motion.span>
      ) : (
        <span className="text-gray-800">{toolName}</span>
      )}{" "}
      {result.type === "completed" && (
        <span className="text-xs text-green-600">✓</span>
      )}
      {result.type === "failed" && (
        <span className="text-xs text-red-600">
          {process.env["NODE_ENV"] === "development" ? result.error : "✗"}
        </span>
      )}
    </li>
  );
};

export const ToolCallItem = ({ tool }: { tool: Tool | undefined }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tool) {
    return null;
  }

  const toolName = generateToolName(tool);
  if (toolName.length === 0) {
    return null;
  }

  const { result } = tool;

  return (
    <div
      className="border border-gray-300 rounded-sm p-3 mt-2 w-full"
      data-id={tool.toolCallId}
    >
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? "Collapse" : "Expand"}
      >
        <div className="flex-1 flex items-center">
          <span className="font-semibold text-gray-800 whitespace-pre line-clamp-1 text-overflow-ellipsis flex-1">
            {toolName}
          </span>
          {result.type === "in_progress" && (
            <span className="text-xs text-blue-600 flex-none">In Progress</span>
          )}
          {result.type === "completed" && (
            <span className="text-xs text-green-600 flex-none">Completed</span>
          )}
          {result.type === "failed" && (
            <span
              className="text-xs text-red-600 flex-none"
              data-error={
                process.env["NODE_ENV"] === "development"
                  ? result.error
                  : undefined
              }
            >
              Failed
            </span>
          )}
        </div>
      </div>

      {!isExpanded &&
        result.type === "in_progress" &&
        tool.children.length > 0 && (
          <motion.div
            className="mt-2"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <InProgressNestedToolCall
              tool={tool.children[tool.children.length - 1]}
            />
          </motion.div>
        )}

      {isExpanded && tool.children.length > 0 && (
        <ul className="mt-2 space-y-2">
          {tool.children.map((child) => (
            <NestedToolCallItem key={child.toolCallId} tool={child} />
          ))}
        </ul>
      )}
    </div>
  );
};
