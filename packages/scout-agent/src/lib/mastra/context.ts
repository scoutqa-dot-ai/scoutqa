import { MastraUnion } from "@mastra/core/action";
import { RuntimeContext } from "@mastra/core/runtime-context";

export interface MastraContext {
  mastra?: MastraUnion;
  runtimeContext: RuntimeContext;
  threadId?: string;
}
