// v1 单测：detectStack / collectFacts / parseArgs / mockRoast。
// 用 node:test，零依赖。E2E（真跑 fixture repo）+ 毒舌 eval 见 test plan，后续补。
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { detectStack } = require("../src/detectStack");
const { collectFacts, extractErrorLines } = require("../src/collectFacts");
const { parseArgs } = require("../src/cli");
const { mockRoast } = require("../src/roast");

function tmpRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "malema-"));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

test("detectStack: node via package.json", () => {
  const dir = tmpRepo({ "package.json": "{}" });
  assert.equal(detectStack(dir).stack, "node");
});

test("detectStack: node prefers pnpm lockfile", () => {
  const dir = tmpRepo({ "package.json": "{}", "pnpm-lock.yaml": "" });
  assert.deepEqual(detectStack(dir).installCmd, ["pnpm", "install"]);
});

test("detectStack: python / go / rust", () => {
  assert.equal(detectStack(tmpRepo({ "requirements.txt": "" })).stack, "python");
  assert.equal(detectStack(tmpRepo({ "go.mod": "" })).stack, "go");
  assert.equal(detectStack(tmpRepo({ "Cargo.toml": "" })).stack, "rust");
});

test("detectStack: unsupported when no manifest", () => {
  assert.equal(detectStack(tmpRepo({ "foo.txt": "" })).stack, "unsupported");
});

test("detectStack: ambiguous when multiple stacks", () => {
  const d = detectStack(tmpRepo({ "package.json": "{}", "go.mod": "" }));
  assert.equal(d.stack, "ambiguous");
  assert.equal(d.primary.stack, "node");
});

test("extractErrorLines picks error-ish lines", () => {
  const lines = extractErrorLines("ok line\nnpm ERR! missing dep\nanother ok\nENOENT here");
  assert.equal(lines.length, 2);
});

test("collectFacts: failed install is not installed and not sparse when errors exist", () => {
  const dir = tmpRepo({ "README.md": "hi" });
  const f = collectFacts({ exitCode: 1, timedOut: false, spawnError: null, stdout: "", stderr: "npm ERR! boom", cmd: "npm install", durationMs: 10 }, dir);
  assert.equal(f.installed, false);
  assert.equal(f.sparse, false);
  assert.equal(f.hasReadme, true);
  assert.ok(f.errorLines.length >= 1);
});

test("collectFacts: sparse when no errors and not installed", () => {
  const dir = tmpRepo({ "foo.txt": "x" });
  const f = collectFacts({ exitCode: 7, timedOut: false, spawnError: null, stdout: "", stderr: "", cmd: "npm install", durationMs: 5 }, dir);
  assert.equal(f.sparse, true);
  assert.equal(f.hasReadme, false);
});

test("parseArgs flags", () => {
  assert.deepEqual(parseArgs(["--no-run"]).noRun, true);
  assert.equal(parseArgs(["--yes", "./x"]).dir, "./x");
  assert.equal(parseArgs(["--timeout", "120"]).timeoutMs, 120000);
});

test("collectFacts: static mode is not sparse and not a fake failure", () => {
  const dir = tmpRepo({ "README.md": "hi" });
  const f = collectFacts({ exitCode: null, timedOut: false, spawnError: null, stdout: "", stderr: "", cmd: "(static, --no-run)", durationMs: 0, static: true }, dir);
  assert.equal(f.static, true);
  assert.equal(f.sparse, false);
  assert.equal(f.installed, false);
});

test("mockRoast static mode does not claim install crashed", () => {
  const r = mockRoast({ static: true, installed: false, hasReadme: true, errorLines: [], cmd: "(static, --no-run)", durationMs: 0 });
  assert.match(r, /没真跑/);
  assert.doesNotMatch(r, /暴毙/);
});

test("mockRoast quotes the spawn error and never crashes on sparse", () => {
  const r = mockRoast({ installed: false, spawnError: "命令不存在: npm", timedOut: false, exitCode: null, durationMs: 0, hasReadme: false, errorLines: [], sparse: true, cmd: "npm install" });
  assert.match(r, /命令不存在/);
  assert.match(r, /改这些/);
});
