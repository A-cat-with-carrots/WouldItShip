// runInstall — 在 repo 目录里跑安装命令，捕获 stdout/stderr/exitCode。
// 硬超时（默认 5min）到点杀整个进程树（postinstall 会 spawn 子进程，只杀父进程会留僵尸）。
//
//   spawn(installCmd, {cwd, detached})
//      │
//      ├── 正常退出 → {exitCode, stdout, stderr, timedOut:false}
//      ├── 超时     → killTree() → {exitCode:null, timedOut:true, ...}
//      └── 命令不存在(ENOENT) → {spawnError:"...", ...}
"use strict";

const { spawn } = require("node:child_process");

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_CAPTURE_BYTES = 256 * 1024; // 别让超长日志撑爆内存/prompt

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    // Windows：taskkill 带 /T 杀整棵树
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    // POSIX：detached 后子进程在自己的进程组，杀负 pid = 杀整组
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        /* 已退出 */
      }
    }
  }
}

function clip(buf) {
  if (buf.length <= MAX_CAPTURE_BYTES) return buf.toString("utf8");
  return buf.subarray(0, MAX_CAPTURE_BYTES).toString("utf8") + "\n…[输出过长已截断]";
}

// installCmd = [cmd, ...args]
function runInstall(installCmd, dir, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const [cmd, ...args] = installCmd;
    // Windows: npm/pip 等是 .cmd，需走 shell。把整条命令作为单字符串传给 shell，
    // 避免 shell:true + args 数组的 DEP0190。命令来自固定映射(detectStack)，非用户拼接。
    const isWin = process.platform === "win32";
    const child = isWin
      ? spawn(installCmd.join(" "), { cwd: dir, shell: true })
      : spawn(cmd, args, { cwd: dir, detached: true });

    const outChunks = [];
    const errChunks = [];
    let timedOut = false;
    const start = Date.now();

    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    child.stdout.on("data", (d) => outChunks.push(d));
    child.stderr.on("data", (d) => errChunks.push(d));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        stdout: clip(Buffer.concat(outChunks)),
        stderr: clip(Buffer.concat(errChunks)),
        timedOut: false,
        spawnError: err.code === "ENOENT" ? `命令不存在: ${cmd}` : err.message,
        durationMs: Date.now() - start,
        cmd: installCmd.join(" "),
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: clip(Buffer.concat(outChunks)),
        stderr: clip(Buffer.concat(errChunks)),
        timedOut,
        spawnError: null,
        durationMs: Date.now() - start,
        cmd: installCmd.join(" "),
      });
    });
  });
}

module.exports = { runInstall, DEFAULT_TIMEOUT_MS };
