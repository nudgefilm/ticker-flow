/**
 * scripts/lib/pid-lock.ts
 *
 * 1회성 --apply 스크립트(삭제·재수집 등 되돌리기 어려운 작업)가 중복 실행되는
 * 것을 막는 PID 락파일 유틸. 2026-07-16 insider_trades 재수집 작업에서, 백그
 * 라운드 작업을 "중단"시켰는데도 Windows에서 실제 node/tsx 프로세스가 안 죽고
 * 계속 돌고 있었고, 그 상태를 모른 채 같은 스크립트를 다시 실행해 두 프로세스가
 * 동시에 같은 체크포인트 파일·DB 행을 다루는 사고가 있었다(다행히 UNIQUE 제약과
 * 즉시 발견으로 실제 데이터 손상은 없었음). 이 유틸은 그 사고의 재발을
 * 방지한다 — 스크립트 시작 시 락을 걸어, 이전 실행이 실제로는 살아있는데
 * "중단됨"으로 오인한 채 재실행하면 즉시 에러로 막는다.
 *
 * 사용법:
 *   import { acquireLock } from "./lib/pid-lock";
 *   const lock = acquireLock("insider-trades-refetch");
 *   try {
 *     // ... 본 작업 ...
 *   } finally {
 *     lock.release();
 *   }
 */

import * as fs from "fs";
import * as path from "path";

const LOCK_DIR = path.resolve(process.cwd(), "work/tmp/locks");

export interface PidLock {
  release(): void;
}

function isProcessAlive(pid: number): boolean {
  try {
    // signal 0은 실제로 신호를 보내지 않고 프로세스 존재 여부만 확인한다
    // (Node.js는 이 동작을 Windows에서도 동일하게 지원).
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    // EPERM: 프로세스는 존재하지만 신호를 보낼 권한이 없음 → 살아있는 것으로 간주.
    return e?.code === "EPERM";
  }
}

/**
 * name으로 락을 건다. 동일한 name으로 이미 살아있는 프로세스가 락을 쥐고 있으면
 * 에러 메시지를 출력하고 process.exit(1)로 즉시 종료한다. 락파일만 남고 그
 * 프로세스가 실제로는 죽어있는 경우(stale lock)는 자동으로 정리하고 진행한다.
 */
export function acquireLock(name: string): PidLock {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const lockPath = path.join(LOCK_DIR, `${name}.lock`);

  if (fs.existsSync(lockPath)) {
    const raw = fs.readFileSync(lockPath, "utf-8").trim();
    const pid = parseInt(raw, 10);
    if (pid && isProcessAlive(pid)) {
      console.error(
        `\n[pid-lock] "${name}" 작업이 이미 실행 중입니다 (PID ${pid}).\n` +
        `중복 실행 방지를 위해 종료합니다. "중단시켰는데 왜 아직 실행 중이지?" 싶다면,\n` +
        `Windows에서 백그라운드 종료가 자식 프로세스까지 못 죽이는 경우가 있으니\n` +
        `실제로 그 PID가 살아있는지 먼저 확인하세요(예: Get-CimInstance Win32_Process).\n` +
        `이전 실행이 확실히 죽었는데 이 메시지가 뜬다면 ${lockPath} 파일을 직접 삭제하세요.\n`
      );
      process.exit(1);
    }
    console.warn(
      `[pid-lock] "${name}"의 오래된 락파일 발견(PID ${pid}는 이미 종료됨) — 정리 후 진행합니다.`
    );
    fs.unlinkSync(lockPath);
  }

  fs.writeFileSync(lockPath, String(process.pid));

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      if (
        fs.existsSync(lockPath) &&
        fs.readFileSync(lockPath, "utf-8").trim() === String(process.pid)
      ) {
        fs.unlinkSync(lockPath);
      }
    } catch {
      // best-effort — 프로세스 종료 중 정리 실패는 무시(다음 실행이 stale lock으로 처리).
    }
  };

  process.once("exit", release);
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    release();
    process.exit(143);
  });

  return { release };
}
