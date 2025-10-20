import { DynamoDBStore } from "@mastra/dynamodb";
import { LibSQLStore } from "@mastra/libsql";

const region = process.env["AWS_REGION"] || "us-east-1";
const tableName = process.env["MASTRA_DYNAMODB_TABLE_NAME"] || "";

export const storage =
  tableName.length > 0
    ? new DynamoDBStore({
        name: "dynamodb",
        config: { region, tableName },
      })
    : new LibSQLStore({ url: ":memory:" });
