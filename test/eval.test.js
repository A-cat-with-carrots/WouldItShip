// 毒舌 eval：人设就是产品，这里断言真实 LLM 输出的「结构质量」。
// 仅在有 DEEPSEEK_API_KEY 时跑（CI 无 key 自动 skip）。本地：
//   node --env-file=.env --test test/eval.test.js
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { roast } = require("../src/roast");

const HAS_KEY = Boolean(process.env.DEEPSEEK_API_KEY);

// 一个「装不起来」的事实，料够，让 LLM 有的骂。
const FAILED_FACTS = {
  installed: false,
  static: false,
  timedOut: false,
  spawnError: null,
  exitCode: 1,
  durationMs: 1500,
  cmd: "npm install",
  errorLines: ["npm error 404 Not Found - GET https://registry.npmjs.org/supertool-ai-xyz"],
  readmeExcerpt: "# SuperTool\n革命性 AI 神器，一键解决所有问题！",
  hasReadme: true,
  pkgExcerpt: '{"dependencies":{"supertool-ai-xyz":"^9.9.9"}}',
  sparse: false,
};

test("eval: real LLM roast meets quality bar", { skip: HAS_KEY ? false : "no DEEPSEEK_API_KEY" }, async () => {
  const { text, source } = await roast(FAILED_FACTS);
  assert.equal(source, "deepseek", "应走真实 LLM，而非 mock fallback");

  // 1. 引用了我给的真实事实（不是凭空编）
  assert.ok(/supertool|404|registry/i.test(text), "应引用提供的真实报错");

  // 2. 给了改法（不是只骂不教）
  assert.ok(/改|建议|应该|换成|加[一上]?|删/.test(text), "应包含可执行改法");

  // 3. 中文、长度合理（不是一句话敷衍，也不是失控长文）
  assert.ok(/[一-龥]/.test(text), "应为中文");
  assert.ok(text.length > 80 && text.length < 4000, `长度异常: ${text.length}`);

  // 4. 没有变成拒答 / 免责声明
  assert.doesNotMatch(text, /作为(一个)?(AI|人工智能).*(无法|不能|抱歉)/);
});

test("eval: static mode roast does not fabricate runtime details", { skip: HAS_KEY ? false : "no DEEPSEEK_API_KEY" }, async () => {
  const staticFacts = { ...FAILED_FACTS, static: true, errorLines: [], cmd: "(static, --no-run)", exitCode: null };
  const { text, source } = await roast(staticFacts);
  assert.equal(source, "deepseek");
  assert.ok(/[一-龥]/.test(text));
  // 静态模式没真跑，不该编造「运行时崩溃 / 点击按钮没反应」这类没观察到的事
  assert.doesNotMatch(text, /我点(了|击)|运行时崩溃|跑起来后/);
});
