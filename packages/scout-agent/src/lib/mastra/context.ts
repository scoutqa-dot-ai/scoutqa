import { MastraUnion } from "@mastra/core/action";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { serializeError } from "serialize-error";
import {
  RUNTIME_CONTEXT_KEY_HOUSE_KEEPER,
  RUNTIME_CONTEXT_KEY_RUN_ID,
  RUNTIME_CONTEXT_KEY_THREAD_ID,
} from "../../config/constants";

export interface MastraContext {
  mastra?: MastraUnion;
  runtimeContext: RuntimeContext;
}

export function getRunId({ runtimeContext }: MastraContext): string {
  const runId =
    runtimeContext.get<string, string | undefined>(
      RUNTIME_CONTEXT_KEY_RUN_ID,
    ) ?? "";
  if (runId.length === 0) {
    throw new Error("Run ID is not set");
  }
  return runId;
}

export function getThreadId({ runtimeContext }: MastraContext): string {
  const threadId =
    runtimeContext.get<string, string | undefined>(
      RUNTIME_CONTEXT_KEY_THREAD_ID,
    ) ?? "";
  if (threadId.length === 0) {
    throw new Error("Thread ID is not set");
  }
  return threadId;
}

class HouseKeeper {
  private onAgentFinishCallbacks: Array<() => void> = [];

  constructor(private ctx: MastraContext) {}

  onAgentFinish(cb: () => void) {
    this.onAgentFinishCallbacks.push(cb);
  }

  agentFinished() {
    const callbacks = [...this.onAgentFinishCallbacks];
    this.onAgentFinishCallbacks.length = 0;
    for (const cb of callbacks) {
      try {
        cb();
      } catch (error) {
        this.ctx.mastra?.logger?.error("Could not clean up on agent finish", {
          error: serializeError(error),
        });
      }
    }
  }
}

export function getHouseKeeper(ctx: MastraContext): HouseKeeper {
  const { runtimeContext } = ctx;
  const cached = runtimeContext.get<string, HouseKeeper>(
    RUNTIME_CONTEXT_KEY_HOUSE_KEEPER,
  );
  if (cached) {
    return cached;
  }

  const newHouseKeeper = new HouseKeeper(ctx);
  runtimeContext.set(RUNTIME_CONTEXT_KEY_HOUSE_KEEPER, newHouseKeeper);
  return newHouseKeeper;
}
