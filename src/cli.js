// cli.js — 编排 + 安全门。
//   解析参数 → 同意门(默认警告等确认) → detectStack → runInstall(除非 --no-run)
//   → collectFacts → roast → 打印中文毒评。
"use strict";

const path = require("node:path");
const readline = require("node:readline");
const { detectStack } = require("./detectStack");
const { runInstall, DEFAULT_TIMEOUT_MS } = require("./runInstall");
const { collectFacts } = require("./collectFacts");
const { roast } = require("./roast");

const HELP = `骂了吗 (WouldYouShip) — 把你刚 vibe 出来的产品丢进去，被全网最挑剔的真实用户骂醒。

用法:
  npx wouldyouship [目录]              # 默认当前目录；跑前会警告并等你确认
  npx wouldyouship --yes               # 跳过确认（CI / 熟练用户）
  npx wouldyouship --no-run            # 静态模式：只读 README/代码结构，绝不执行任何脚本
  npx wouldyouship --timeout <秒>      # 安装硬超时（默认 300s）
  npx wouldyouship --help

环境:
  DEEPSEEK_API_KEY   配了才调 LLM 出毒评；没配走离线 mock（也能用，但骂得不够花）
  DEEPSEEK_MODEL     默认 deepseek-chat

安全:
  默认会在目标 repo 里执行 install/run 脚本（含 postinstall），等于跑里面的代码。
  拿别人的 repo 来骂前先想清楚，或用 --no-run 只静态读。`;

function parseArgs(argv) {
  const opts = { dir: ".", yes: false, noRun: false, timeoutMs: DEFAULT_TIMEOUT_MS, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--yes" || a === "-y") opts.yes = true;
    else if (a === "--no-run") opts.noRun = true;
    else if (a === "--timeout") opts.timeoutMs = Number(argv[++i]) * 1000;
    else if (!a.startsWith("-")) opts.dir = a;
  }
  return opts;
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(/^(y|yes|是|好)$/i.test(ans.trim()));
    });
  });
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const dir = path.resolve(process.cwd(), opts.dir);
  const detected = detectStack(dir);

  if (detected.stack === "unsupported") {
    console.log(`在 ${dir} 没认出支持的栈（package.json / requirements.txt / go.mod / Cargo.toml 一个都没有）。`);
    console.log("我连你用啥做的都看不出来——这本身就值得骂。先放个清单文件再来。");
    return;
  }

  const target = detected.stack === "ambiguous" ? detected.primary : detected;
  if (detected.stack === "ambiguous") {
    console.log(`检测到多栈共存（${detected.candidates.join(" + ")}），v1 先骂主栈：${target.stack}。`);
  }

  let installResult;
  if (opts.noRun) {
    console.log("静态模式（--no-run）：不执行任何脚本，只读 README / 清单。");
    installResult = { exitCode: null, timedOut: false, spawnError: null, stdout: "", stderr: "", cmd: "(static, --no-run)", durationMs: 0, static: true };
  } else {
    if (!opts.yes) {
      console.log(`\n⚠️  我接下来会在这个目录执行：${target.installCmd.join(" ")}`);
      console.log("   这会运行该 repo 的安装脚本（含 postinstall），等于执行里面的代码。");
      console.log("   拿的是别人的 repo？想清楚。只想静态看就用 --no-run。\n");
      const ok = await confirm("继续？(y/N) ");
      if (!ok) {
        console.log("行，撤了。要么 --no-run 静态看，要么 --yes 直接上。");
        return;
      }
    }
    console.log(`\n跑 ${target.installCmd.join(" ")} ……（最多 ${Math.round(opts.timeoutMs / 1000)}s）`);
    installResult = await runInstall(target.installCmd, dir, { timeoutMs: opts.timeoutMs });
  }

  const facts = collectFacts(installResult, dir);
  const result = await roast(facts);

  console.log("\n" + "─".repeat(60));
  console.log(result.text);
  console.log("─".repeat(60));
  if (result.source !== "deepseek") {
    console.log("(离线 mock 模式；配 DEEPSEEK_API_KEY 后我骂得更狠)");
  }
}

module.exports = { main, parseArgs };
