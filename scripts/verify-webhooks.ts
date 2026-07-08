/**
 * scripts/verify-webhooks.ts
 *
 * 2026-07-08 Resend 웹훅이 트레일링 슬래시 때문에 www 도메인에서도 308을
 * 반환해 실패했던 사고(next.config.ts의 skipTrailingSlashRedirect +
 * /api/webhooks/:path* rewrite로 수정) 재발 방지용 자동 검증.
 *
 * src/app/api/webhooks/*\/route.ts를 자동으로 스캔해, 각 경로를 트레일링
 * 슬래시 유무 두 버전으로 요청해 3xx(리다이렉트)가 아닌지 확인한다.
 * Resend/Polar/Paddle 같은 웹훅 발신자는 대부분 리다이렉트를 따라가지
 * 않으므로, 실제 응답 코드(200/400/401 등)는 상관없이 "리다이렉트가
 * 아니어야 한다"만 검증한다.
 *
 * 실행:
 *   pnpm run verify:webhooks                              (로컬에 next build 산출물이 있어야 함 — 자체 서버 기동 후 검사)
 *   pnpm run verify:webhooks -- --url=https://www.tickerflow.net  (이미 떠 있는 서버/프로덕션을 직접 검사)
 *
 * pnpm build 이후 postbuild로 자동 실행되어, 트레일링 슬래시 308이
 * 재발하면 빌드(및 Vercel 배포)를 실패시킨다.
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

const WEBHOOKS_DIR = path.join(process.cwd(), "src/app/api/webhooks");
const READY_TIMEOUT_MS = 30_000;

function discoverWebhookPaths(): string[] {
  if (!existsSync(WEBHOOKS_DIR)) return [];
  return readdirSync(WEBHOOKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(path.join(WEBHOOKS_DIR, entry.name, "route.ts")))
    .map((entry) => `/api/webhooks/${entry.name}`)
    .sort();
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("빈 포트를 확인하지 못했습니다.")));
      }
    });
  });
}

async function waitUntilReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(baseUrl, { method: "GET" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`서버가 ${timeoutMs}ms 내에 기동되지 않았습니다: ${baseUrl}`);
}

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

async function startLocalServer(): Promise<{ baseUrl: string; child: ChildProcess }> {
  // node_modules/.bin/next(.cmd)는 Windows에서 셸 스크립트라 shell:true 없이
  // 직접 spawn할 수 없다. 대신 next의 JS 진입점을 process.execPath(node)로
  // 직접 실행해 플랫폼 무관하게 shell 없이 기동한다.
  const nextEntry = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextEntry)) {
    throw new Error("node_modules/next/dist/bin/next을 찾을 수 없습니다. pnpm install 후 다시 시도하세요.");
  }
  if (!existsSync(path.join(process.cwd(), ".next"))) {
    throw new Error("next build 산출물(.next)이 없습니다. 먼저 pnpm build를 실행하세요.");
  }

  const port = await getFreePort();
  const baseUrl = `http://localhost:${port}`;

  const child = spawn(process.execPath, [nextEntry, "start", "-p", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  let stderrBuf = "";
  child.stderr?.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });
  child.on("exit", (code) => {
    if (code !== null && code !== 0 && stderrBuf) {
      console.error(`[verify-webhooks] 로컬 서버 종료 (code ${code}):\n${stderrBuf}`);
    }
  });

  await waitUntilReady(baseUrl, READY_TIMEOUT_MS);
  return { baseUrl, child };
}

async function checkPath(baseUrl: string, webhookPath: string): Promise<string[]> {
  const failures: string[] = [];

  for (const variant of [webhookPath, `${webhookPath}/`]) {
    const target = `${baseUrl}${variant}`;
    let res: Response;
    try {
      res = await fetch(target, {
        method: "POST",
        redirect: "manual",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
    } catch (err) {
      failures.push(`${target} → 요청 실패 (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "(no location)";
      failures.push(`${target} → ${res.status} 리다이렉트 감지 (Location: ${location})`);
    }
  }

  return failures;
}

async function main() {
  const urlArg = process.argv.find((a) => a.startsWith("--url="));
  const explicitBaseUrl = urlArg ? urlArg.slice("--url=".length).replace(/\/$/, "") : null;

  const webhookPaths = discoverWebhookPaths();
  if (webhookPaths.length === 0) {
    console.log("[verify-webhooks] src/app/api/webhooks/*/route.ts를 찾지 못했습니다 — 검증할 대상이 없습니다.");
    return;
  }

  let child: ChildProcess | null = null;
  let baseUrl = explicitBaseUrl;

  try {
    if (!baseUrl) {
      console.log("[verify-webhooks] 로컬 프로덕션 서버 기동 중 (next build 산출물 기준)...");
      const started = await startLocalServer();
      baseUrl = started.baseUrl;
      child = started.child;
    }

    console.log(`[verify-webhooks] 대상 서버: ${baseUrl}`);
    console.log(`[verify-webhooks] 검증 경로 (${webhookPaths.length}개): ${webhookPaths.join(", ")}`);

    const allFailures: string[] = [];
    for (const webhookPath of webhookPaths) {
      allFailures.push(...(await checkPath(baseUrl, webhookPath)));
    }

    if (allFailures.length > 0) {
      console.error("\n[verify-webhooks] 실패 — 웹훅 경로에서 리다이렉트(3xx)가 감지됐습니다:");
      for (const f of allFailures) console.error(`  - ${f}`);
      console.error(
        "\nResend/Polar/Paddle 같은 웹훅 발신자는 대부분 3xx 리다이렉트를 따라가지 않아, " +
        "위 경로들은 실제 운영에서 웹훅 수신이 실패합니다. next.config.ts의 " +
        "skipTrailingSlashRedirect 설정과 /api/webhooks/:path*/ rewrite 규칙이 " +
        "그대로 유지되고 있는지 확인하세요."
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `\n[verify-webhooks] 통과 — 웹훅 경로 ${webhookPaths.length}개 모두 트레일링 슬래시 유무와 무관하게 리다이렉트 없이 응답했습니다.`
    );
  } catch (err) {
    console.error("[verify-webhooks] 실행 중 오류:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    if (child) killProcessTree(child);
  }
}

main();
