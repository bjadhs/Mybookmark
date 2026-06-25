import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** SSH target, overridable via env so this isn't pinned to one box. */
export const SSH_HOST = process.env.SERVER_SSH_HOST || "root@100.78.187.64";

export interface SshResult {
  /** Remote exit code (0 = success). */
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a command on the host over SSH and always resolve (never throw) so the
 * caller can surface stdout/stderr even when the remote command fails. The
 * remote command is passed as a single argv to `ssh`; callers MUST build it
 * only from validated tokens (see lib/server-bridge.ts) — never raw user text.
 *
 * BatchMode + a tight ConnectTimeout keep a missing key or unreachable host
 * from hanging the request.
 */
export async function sshExec(
  remoteCommand: string,
  timeoutMs = 25000
): Promise<SshResult> {
  try {
    const { stdout, stderr } = await run(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=8",
        "-o",
        "StrictHostKeyChecking=accept-new",
        SSH_HOST,
        remoteCommand,
      ],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 4 }
    );
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };
    const stderr =
      e.stderr ||
      (e.killed ? `Timed out after ${timeoutMs}ms` : e.message ?? "SSH failed");
    return {
      code: typeof e.code === "number" ? e.code : 1,
      stdout: e.stdout ?? "",
      stderr,
    };
  }
}
