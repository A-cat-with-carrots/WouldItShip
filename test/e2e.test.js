// E2E：子进程真跑 bin/woulditship.js 全链路，断言输出。
// 确定性 + 离线：不给 DEEPSEEK_API_KEY → 走 mockRoast；不需要 pip/go 工具链
// （多栈只走 --no-run 静态，只读清单文件）；install 失败用 preinstall exit 1（快、离线）。
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BIN = path.join(__dirname, "..", "bin", "woulditship.js");

function tmpRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wis-e2e-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

// 跑 bin，强制无 LLM key → mock 模式，确定性。
function run(args) {
  const env = { ...process.env };
  delete env.DEEPSEEK_API_KEY; // 保证走 mock，不烧钱、不依赖网络
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8", env, timeout: 120000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

test("E2E: node static (--no-run) produces a static roast, no install", () => {
  const dir = tmpRepo({ "package.json": '{"name":"x"}', "README.md": "# X\n一个产品" });
  const { code, out } = run(["--no-run", dir]);
  assert.equal(code, 0);
  assert.match(out, /静态模式/);
  assert.match(out, /没真跑/); // mockRoast static headline
});

test("E2E: python / go / rust detected (static), not 'unsupported'", () => {
  for (const f of [{ "requirements.txt": "" }, { "go.mod": "module x" }, { "Cargo.toml": "[package]" }]) {
    const dir = tmpRepo(f);
    const { code, out } = run(["--no-run", dir]);
    assert.equal(code, 0);
    assert.doesNotMatch(out, /没认出支持的栈/);
    assert.match(out, /没真跑/);
  }
});

test("E2E: unsupported repo (no manifest) tells user, doesn't crash", () => {
  const dir = tmpRepo({ "foo.txt": "x" });
  const { code, out } = run([dir]); // 无 manifest → 在同意门之前就返回
  assert.equal(code, 0);
  assert.match(out, /没认出支持的栈/);
});

test("E2E: install failure becomes a roast (主价值线)", () => {
  // preinstall exit 1 → npm install 快速失败、离线、不需网络
  const dir = tmpRepo({ "package.json": '{"name":"x","scripts":{"preinstall":"exit 1"}}' });
  const { code, out } = run(["--yes", "--timeout", "60", dir]);
  assert.equal(code, 0); // 工具自己正常退出（roast 出来了）
  assert.match(out, /暴毙|劝退/); // mockRoast 失败 headline
});

test("E2E: --no-run never executes scripts (安全门)", () => {
  // 放一个会留痕的 preinstall；--no-run 必须绝不执行它
  const marker = path.join(os.tmpdir(), `wis-marker-${Date.now()}`);
  const dir = tmpRepo({
    "package.json": `{"name":"x","scripts":{"preinstall":"node -e \\"require('fs').writeFileSync('${marker.replace(/\\/g, "\\\\")}','x')\\""}}`,
  });
  run(["--no-run", dir]);
  assert.equal(fs.existsSync(marker), false, "--no-run 不该执行任何脚本");
});
