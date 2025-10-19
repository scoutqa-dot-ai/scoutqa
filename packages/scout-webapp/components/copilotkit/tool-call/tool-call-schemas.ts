import { TOOL_ID_EXECUTE_TEST_SCENARIO } from "@scoutqa-dot-ai/scout-agent/src/config/constants";
import { z } from "zod/mini";

export const toolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(),
  parentToolCallId: z.optional(z.string()),
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export const toolResultSchema = z.object({
  toolCallId: z.string(),
  args: z.unknown(),
  result: z.unknown(),
});

export type ToolResult = z.infer<typeof toolResultSchema>;

export const knownToolSchema = z.discriminatedUnion("toolName", [
  z.object({
    toolName: z.literal(TOOL_ID_EXECUTE_TEST_SCENARIO),
    args: z.object({
      scenario: z.string(),
    }),
  }),
  z.object({
    toolName: z.literal("browser_browser_navigate"),
    args: z.object({
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/navigate.ts#L28
      // {"toolCallId":"tooluse_8K53BUO-RL-VhAOWoRJHow","toolName":"browser_browser_navigate","args":{"url":"https://hoangson.vn"},"parentToolCallId":"tooluse_p9TNDkdDRCuncHpomMnySQ"}
      url: z.string(),
    }),
  }),
  z.object({
    toolName: z.enum([
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/snapshot.ts#L51
      // {"toolCallId":"tooluse_AjB1UJ0BTr-Jt0rCJq77wQ","toolName":"browser_browser_click","args":{"ref":"e86","element":"Social Counters link"},"parentToolCallId":"tooluse_p9TNDkdDRCuncHpomMnySQ"}
      "browser_browser_click",
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/snapshot.ts#L117
      "browser_browser_hover",
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/snapshot.ts#L143
      "browser_browser_select_option",
    ]),
    args: z.object({
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/snapshot.ts#L38
      element: z.string(),
    }),
  }),
  z.object({
    toolName: z.literal("browser_browser_press_key"),
    args: z.object({
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/keyboard.ts#L29
      // {"toolCallId":"tooluse_u7V-7jK9TKedaVoCXXRV6A","toolName":"browser_browser_press_key","args":{"key":"Alt+ArrowLeft"},"parentToolCallId":"tooluse_p9TNDkdDRCuncHpomMnySQ"}
      key: z.string(),
    }),
  }),
  z.object({
    toolName: z.literal("browser_browser_type"),
    args: z.object({
      // https://github.com/microsoft/playwright/blob/6c335d6/packages/playwright/src/mcp/browser/tools/keyboard.ts#L54
      element: z.string(),
      text: z.string(),
    }),
  }),
]);

export type KnownTool = z.infer<typeof knownToolSchema>;

export const knownResultSchema = z.union([
  z.object({
    // {"toolCallId":"tooluse_egZ-HXRnSjmPDM4VyaRISg","toolName":"browser_browser_console_messages","result":{"error":true,"message":"Tool validation failed for browser_browser_console_messages. Please fix the following errors and try again:\n- root: Invalid input: expected object, received undefined\n\nProvided arguments: undefined","validationErrors":{"_errors":["Invalid input: expected object, received undefined"]}},"parentToolCallId":"tooluse_COtjRhIASEuqvAT3H76qog"}
    error: z.literal(true),
    message: z.string(),
  }),
]);

export type KnownResult = z.infer<typeof knownResultSchema>;
