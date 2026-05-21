// detectStack — 从清单文件认出 repo 用什么栈，给出对应安装命令。
// v1 支持 node / python / go / rust。认不出的明确返回 unsupported，不硬猜。
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function exists(dir, file) {
  return fs.existsSync(path.join(dir, file));
}

// 返回 { stack, installCmd: [cmd, ...args], runHint } 或
//      { stack: "unsupported", detected: [...] } 或
//      { stack: "ambiguous", candidates: [...] }
function detectStack(dir) {
  const hits = [];

  if (exists(dir, "package.json")) {
    let installCmd = ["npm", "install"];
    if (exists(dir, "pnpm-lock.yaml")) installCmd = ["pnpm", "install"];
    else if (exists(dir, "yarn.lock")) installCmd = ["yarn", "install"];
    else if (exists(dir, "bun.lockb")) installCmd = ["bun", "install"];
    hits.push({ stack: "node", installCmd, runHint: "npm start / npm run dev" });
  }

  if (exists(dir, "requirements.txt")) {
    hits.push({
      stack: "python",
      installCmd: ["pip", "install", "-r", "requirements.txt"],
      runHint: "python main.py / uvicorn ...",
    });
  } else if (exists(dir, "pyproject.toml")) {
    hits.push({
      stack: "python",
      installCmd: ["pip", "install", "."],
      runHint: "python -m ... / 看 pyproject scripts",
    });
  }

  if (exists(dir, "go.mod")) {
    hits.push({ stack: "go", installCmd: ["go", "mod", "download"], runHint: "go run ." });
  }

  if (exists(dir, "Cargo.toml")) {
    hits.push({ stack: "rust", installCmd: ["cargo", "build"], runHint: "cargo run" });
  }

  if (hits.length === 0) {
    return { stack: "unsupported", detected: [] };
  }
  if (hits.length > 1) {
    // 多栈共存（如 Node 前端 + Python 后端）。v1 选第一个主栈，但如实告知有歧义。
    return { stack: "ambiguous", primary: hits[0], candidates: hits.map((h) => h.stack) };
  }
  return hits[0];
}

module.exports = { detectStack };
