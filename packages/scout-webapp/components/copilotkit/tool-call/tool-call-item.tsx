import { useState } from "react";
import { Tool } from "./tool-call-manager";

function generateToolName(tool: Tool): string {
  const { knownTool, toolName } = tool;
  if (knownTool) {
    switch (knownTool.toolName) {
      case "execute-test-scenario":
        return knownTool.args.scenario;
      case "browser_browser_click":
        return `Click: ${knownTool.args.element}`;
      case "browser_browser_hover":
        return `Hover: ${knownTool.args.element}`;
      case "browser_browser_navigate":
        return `Navigate: ${knownTool.args.url}`;
      case "browser_browser_press_key":
        return `Press key: ${knownTool.args.key}`;
      case "browser_browser_select_option":
        return `Select option: ${knownTool.args.element}`;
      case "browser_browser_type":
        return `Type: ${knownTool.args.text} into ${knownTool.args.element}`;
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

export const ToolCallItem = ({
  depth = 0,
  tool,
}: {
  depth?: number;
  tool: Tool | undefined;
}) => {
  const isRoot = depth === 0;
  const [isExpanded, setIsExpanded] = useState(isRoot ? false : true);

  if (!tool) {
    return null;
  }

  const toolName = generateToolName(tool);
  if (toolName.length === 0) {
    return null;
  }

  const isInProgress = tool.result.type === "in_progress";
  const isCompleted = tool.result.type === "completed";
  const isFailed = tool.result.type === "failed";

  return (
    <div
      className="border border-gray-300 rounded-lg p-3 mb-2 bg-white"
      data-id={tool.toolCallId}
    >
      <div className="flex items-center gap-2">
        {isRoot && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-5 h-5 hover:bg-gray-100 rounded"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
          </button>
        )}
        <span className="font-semibold text-gray-800">{toolName}</span>
        {isInProgress && (
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            In Progress
          </span>
        )}
        {isCompleted && (
          <span className="text-xs text-green-600">✓ Completed</span>
        )}
        {isFailed && <span className="text-xs text-red-600">✗ Failed</span>}
      </div>

      {isExpanded && (
        <div className="mt-3 ml-7 space-y-2">
          {tool.children.length > 0 && (
            <div>
              {tool.children.map((child) => (
                <ToolCallItem
                  key={child.toolCallId}
                  depth={depth + 1}
                  tool={child}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
