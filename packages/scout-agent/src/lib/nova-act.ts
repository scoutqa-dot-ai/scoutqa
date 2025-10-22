import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { ChunkFrom, ChunkType } from "@mastra/core/stream";
import { ToolStream } from "@mastra/core/tools";
import { Mutex } from "async-mutex";
import { Observable } from "rxjs";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { AG_UI_TOOL_NAME_NOVA_ACT_ACT } from "../config/constants";
import { startOrGetBrowserSession } from "./browser";
import { getRunId, MastraContext } from "./mastra/context";

const novaActCliOutputSchema = z.object({
  is_success: z.boolean(),
  result: z
    .object({
      response: z.string().nullable().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

type NovaActCliOutput = z.infer<typeof novaActCliOutputSchema>;

type NovaActOutput = NovaActCliOutput | string;

type SpawnChunkType =
  | { type: "action"; action: string }
  | { type: "output"; output: NovaActOutput };

export class NovaAct {
  private projectRoot = process.env["NOVA_ACT_CLI_PATH"] || "";

  constructor(private ctx: MastraContext) {}

  async act(
    input: {
      prompt: string;
      startingPage: string;
    },
    writer: ToolStream<any> | undefined,
  ): Promise<NovaActOutput> {
    const logger = this.ctx.mastra!.getLogger();
    const runId = getRunId(this.ctx);
    const browserSession = await startOrGetBrowserSession(this.ctx);
    const ws = await browserSession.generateWsEndpointAndHeaders();

    let args: string[] = [];
    if (this.projectRoot === "/nova-act-cli") {
      // most likely in our container: use the system binary
      // this is needed because `uv` requires rw to a temp dir
      args.push("python3");
    } else {
      args.push("uv", "run");
    }

    args.push(
      "main.py",
      "--cdp-endpoint-url",
      ws.endpoint,
      "--prompt",
      input.prompt,
      "--starting-page",
      input.startingPage,
    );

    // log early before credentials are added
    logger.debug("Starting Nova Act CLI...", { args });
    args.push("--cdp-headers", JSON.stringify(ws.headers ?? {}));

    return new Promise((resolve, reject) => {
      let output: NovaActOutput = "No output";

      // mutex is needed to avoid concurrent access to writer instance
      const mutex = new Mutex();

      const observable = this.spawn(args);
      observable.subscribe({
        next: async (chunk) => {
          switch (chunk.type) {
            case "action":
              await mutex.runExclusive(async () => {
                const toolCallId = randomUUID();
                const toolName = AG_UI_TOOL_NAME_NOVA_ACT_ACT;
                const args: any = { action: chunk.action };
                await writer?.write({
                  type: "tool-call",
                  runId,
                  from: ChunkFrom.AGENT,
                  payload: { toolCallId, toolName, args },
                } satisfies ChunkType);
                await writer?.write({
                  type: "tool-result",
                  runId,
                  from: ChunkFrom.AGENT,
                  payload: { toolCallId, toolName, result: true },
                } satisfies ChunkType);
              });
              break;
            case "output":
              output = chunk.output;
              break;
          }
        },
        complete: () => resolve(output),
        error: reject,
      });
    });
  }

  private spawn(args: string[]) {
    return new Observable<SpawnChunkType>((subscriber) => {
      const logger = this.ctx.mastra!.getLogger();
      const command = args.shift()!;
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      child.stdout?.on("data", (data) => {
        const str = data.toString();
        stdout += str;
      });

      let sessionId = "0000";
      child.stderr?.on("data", async (data) => {
        const delta = data.toString() as string;

        for (const text of delta.split("\n")) {
          if (text.length === 0) continue;

          const startSessionMatches = text.match(/^start session (.{36}) on /);
          const thinkMatches = text.match(new RegExp(`^.{4}> think`));
          const actionMatches = text.match(/^>> (.*);$/);
          if (startSessionMatches !== null) {
            sessionId = startSessionMatches[1]!;
            logger.info("Started Nova Act session", { sessionId });
          } else if (thinkMatches !== null) {
            logger.debug("Nova Act is thinking", { text });
          } else if (actionMatches !== null) {
            const action = actionMatches[1] ?? "";
            if (action.length === 0) {
              continue;
            }

            subscriber.next({ type: "action", action });
            logger.debug("Nova Act action", { text });
          } else {
            if (
              text.includes("Using a custom actuator: ScoutActuator") ||
              text.startsWith("Deviations from ") ||
              text === "..." ||
              text.startsWith(`end session: ${sessionId}`)
            ) {
              // known noise, ignore
            } else {
              logger.warn("Nova Act stderr", { text: text.substring(0, 40) });
            }
            continue;
          }
        }
      });

      child.on("close", (code) => {
        try {
          const parsed = novaActCliOutputSchema.parse(JSON.parse(stdout));
          logger.debug("Command completed", { code, stdout, parsed });
          subscriber.next({ type: "output", output: parsed });
        } catch (error) {
          logger.warn("Could not parse JSON", {
            code,
            stdout,
            error: serializeError(error),
          });
          subscriber.next({ type: "output", output: stdout });
        } finally {
          subscriber.complete();
        }
      });

      child.on("error", (error) =>
        subscriber.error(new Error("Nova Act failure", { cause: error })),
      );
    });
  }
}
