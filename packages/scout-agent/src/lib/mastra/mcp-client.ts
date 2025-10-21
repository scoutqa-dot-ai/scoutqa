import { Tool } from "@mastra/core";
import { MCPClient } from "@mastra/mcp";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { JSONSchema } from "zod/v4/core";
import { MastraContext } from "./context";

export async function connectToMcpServer(
  serverName: string,
  args: string[],
  ctx: MastraContext
) {
  const logger = ctx.mastra!.getLogger();

  const command = args.shift()!;
  const client = new MCPClient({
    servers: {
      [serverName]: { command, args },
    },
  });
  client.__setLogger(logger);

  const tools = await client.getTools();

  for (const toolName of Object.keys(tools)) {
    const tool = tools[toolName] as Tool<z.ZodType>;
    const { inputSchema } = tool;
    if (!inputSchema) {
      logger.warn("Tool has no input schema", { toolName });
      continue;
    }

    let jsonSchema: JSONSchema.BaseSchema;
    try {
      jsonSchema = z.toJSONSchema(inputSchema);
    } catch (error) {
      logger.warn("Could not generate JSON schema for tool", {
        toolName,
        inputSchema,
        error: serializeError(error),
      });
      continue;
    }

    if (
      jsonSchema.type === "object" &&
      Object.keys(jsonSchema.properties ?? {}).length === 0
    ) {
      // some tools don't require any input -> introduce a property to avoid validation error
      // {"toolCallId":"tooluse_N24kHcnGSaiVQW2CuE43wQ","toolName":"browser_browser_snapshot","result":{"error":true,"message":"Tool validation failed for browser_browser_snapshot. Please fix the following errors and try again:\n- root: Invalid input: expected object, received undefined\n\nProvided arguments: undefined","validationErrors":{"_errors":["Invalid input: expected object, received undefined"]}},"parentToolCallId":"tooluse_EVd_JEQ4R8q-3drlzOiyYA"}
      tool.inputSchema = z.object({ purpose: z.string().optional() });
      logger.debug('Added "purpose" property to input schema', { toolName });
    }
  }

  return {
    tools,
    disconnect: () => client.disconnect(),
  };
}
