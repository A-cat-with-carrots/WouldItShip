// collectFacts — 把安装结果 + repo 元信息整理成「事实」，喂给毒舌 prompt。
// 关键边界：采集不到有用信息时，明确标 sparse，让 roast 层说「我没采到料」而不是让 LLM 瞎编。
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readIfExists(dir, file, maxBytes = 8 * 1024) {
  try {
    const p = path.join(dir, file);
    const buf = fs.readFileSync(p);
    return buf.subarray(0, maxBytes).toString("utf8");
  } catch {
    return null;
  }
}

// 从 stderr/stdout 抠出最可能是「报错」的行（粗启发式，v1 够用）。
function extractErrorLines(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const re = /(error|err!|fail|failed|cannot|not found|missing|undefined|ENOENT|EACCES|traceback|exception|panic|fatal)/i;
  return lines.filter((l) => re.test(l)).slice(0, 40);
}

// installResult 来自 runInstall；返回结构化 facts
function collectFacts(installResult, dir) {
  const readme =
    readIfExists(dir, "README.md") || readIfExists(dir, "readme.md") || readIfExists(dir, "README");
  const pkg = readIfExists(dir, "package.json");

  const installed = installResult.exitCode === 0 && !installResult.timedOut && !installResult.spawnError;
  const errorLines = extractErrorLines(
    `${installResult.stderr || ""}\n${installResult.stdout || ""}`
  );

  const isStatic = Boolean(installResult.static);
  // sparse = 既没装成功、又没采到任何能骂的具体报错（怪异退出）。静态模式不算 sparse（本就没跑）。
  const sparse = !isStatic && !installed && errorLines.length === 0 && !installResult.timedOut && !installResult.spawnError;

  return {
    installed,
    static: isStatic,
    timedOut: installResult.timedOut,
    spawnError: installResult.spawnError,
    exitCode: installResult.exitCode,
    durationMs: installResult.durationMs,
    cmd: installResult.cmd,
    errorLines,
    readmeExcerpt: readme ? readme.slice(0, 2000) : null,
    hasReadme: Boolean(readme),
    pkgExcerpt: pkg ? pkg.slice(0, 1500) : null,
    sparse,
  };
}

module.exports = { collectFacts, extractErrorLines };
