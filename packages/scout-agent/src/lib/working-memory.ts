import { MastraUnion } from "@mastra/core/action";
import { RuntimeContext } from "@mastra/core/runtime-context";
import {
  RESOURCE_ID_THREAD_PREFIX,
  RUNTIME_CONTEXT_KEY_WORKING_MEMORY_PREFIX,
  THREAD_ID_WORKING_MEMORY_SUFFIX,
} from "../config/constants";

interface WorkingMemoryValue {
  browser?: {
    provider: "aws" | "browserbase";
    sessionId: string;
  };
}

export interface WorkingMemory {
  get: () => WorkingMemoryValue;
  set: (value: WorkingMemoryValue) => Promise<void>;
}

export interface GetWorkingMemoryInput {
  mastra?: MastraUnion;
  runtimeContext: RuntimeContext;
  threadId?: string;
}

export async function getWorkingMemory({
  mastra,
  runtimeContext,
  threadId,
}: GetWorkingMemoryInput): Promise<WorkingMemory> {
  const workingMemoryThreadId = `${threadId}${THREAD_ID_WORKING_MEMORY_SUFFIX}`;
  const runtimeContextKey = `${RUNTIME_CONTEXT_KEY_WORKING_MEMORY_PREFIX}${threadId}`;
  const cached = runtimeContext.get<string, WorkingMemory>(runtimeContextKey);
  if (cached) {
    return cached;
  }

  const defaultTitle = `Working Memory for thread ${threadId}`;
  const storage = mastra!.storage!;
  let thread = await storage.getThreadById({
    threadId: workingMemoryThreadId,
  });

  const output: WorkingMemory = {
    get: () => thread?.metadata?.workingMemory ?? {},
    set: async (workingMemory) => {
      if (thread) {
        thread = { ...thread, metadata: { workingMemory } };
        await storage.updateThread({
          id: thread.id,
          metadata: thread.metadata ?? {},
          title: thread.title ?? defaultTitle,
        });
      } else {
        const now = new Date();
        thread = {
          id: workingMemoryThreadId,
          createdAt: now,
          metadata: { workingMemory },
          resourceId: `${RESOURCE_ID_THREAD_PREFIX}${threadId}`,
          title: defaultTitle,
          updatedAt: now,
        };
        await storage.saveThread({ thread });
      }
    },
  };

  runtimeContext.set(runtimeContextKey, output);

  return output;
}
