// roast — 产品核心。把 facts 组装成毒舌 prompt，调 LLM（复用 aiForLove 的 callDeepSeek 模式：
// AbortController 超时 + 无 key 时 mock fallback），输出中文毒评 + 修改清单。
//
// 人设：神仙鱼·毒舌真实用户。刀子嘴豆腐心 —— 骂得狠、有金句，但每条都给改法，
// 不做人身攻击，骂的是产品不是人。
"use strict";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const TIMEOUT_MS = 30000;

const PERSONA = `你是「神仙鱼·毒舌真实用户」——全网最挑剔的陌生用户，第一次碰到一个 vibecoding 做出来的产品。
你的任务：把一个陌生人第一次接触这个产品时的冷漠、困惑、想摔手机的瞬间，毫不留情地骂回来，好让产品越改越好。

规矩（必须守）：
1. 骂产品，不骂人。绝不人身攻击、不涉及作者身份/能力/智商。
2. 刀子嘴豆腐心：每条吐槽后面跟一句「照着能改」的具体建议。
3. 要有 voice、有金句，能让人想截图发出去。中文，口语，毒但准。
4. 只基于我给你的事实骂。事实不够就明说「我连料都没采到」，绝不编造不存在的报错或功能。
5. 输出结构：先一段总评（2-4 句，带金句），再一个「改这些」清单（3-6 条，每条 = 问题 + 改法）。`;

function buildRoastPrompt(facts) {
  const lines = [];
  if (facts.static) {
    lines.push(`模式：静态（--no-run）。我没真装真跑，只翻了 README / 清单 / 结构。基于这些骂，别假装试过功能。`);
  }
  lines.push(`安装命令：${facts.cmd}`);
  if (facts.spawnError) lines.push(`致命：${facts.spawnError}`);
  if (facts.timedOut) lines.push(`安装超时被我掐了——普通用户早关页面了。`);
  lines.push(`装上了吗：${facts.installed ? "装上了" : "没装上"}（exit ${facts.exitCode}，耗时 ${Math.round((facts.durationMs || 0) / 1000)}s）`);
  lines.push(`有 README 吗：${facts.hasReadme ? "有" : "没有（陌生人连入口都找不到）"}`);
  if (facts.errorLines.length) {
    lines.push(`安装时喷出来的报错（真实日志）：\n${facts.errorLines.join("\n")}`);
  }
  if (facts.readmeExcerpt) {
    lines.push(`README 自称（节选）：\n${facts.readmeExcerpt}`);
  }
  if (facts.sparse) {
    lines.push(`注意：我没采到任何具体报错，也没确认装成功。料很少，别硬骂细节，就骂「连让我看清你在干嘛都做不到」这一层。`);
  }

  return [
    { role: "system", content: PERSONA },
    {
      role: "user",
      content: `这是我（一个陌生用户）尝试上手这个产品采到的事实：\n\n${lines.join("\n\n")}\n\n现在，骂。`,
    },
  ];
}

function hasKey() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

async function callDeepSeek(messages) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        stream: false,
        temperature: 0.9,
        max_tokens: 1500,
        messages,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}`);
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("LLM 返回空");
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

// 无 key 时的本地 mock，保证零配置也能 demo（不调网络，按事实拼）。
function mockRoast(facts) {
  if (facts.static) {
    const items = [];
    if (!facts.hasReadme) {
      items.push("1. 没 README。静态翻一圈，我连「这是干嘛的」都得猜——补一个，三句话讲清。");
    } else {
      items.push("1. 我只静态翻了你的 README/结构。想让我真上强度，去掉 --no-run 让我真装真跑。");
    }
    const headline = facts.hasReadme
      ? "我没真跑，只翻了你的 README 和文件结构。"
      : "我没真跑，而且你连 README 都没有，我翻得一头雾水。";
    return `【总评】${headline}光看皮，第一印象就这样：要么说不清自己是干嘛的，要么得让人猜。\n\n【改这些】\n${items.join("\n")}`;
  }
  if (facts.installed) {
    return `【总评】行，装是装上了，${Math.round((facts.durationMs || 0) / 1000)} 秒。但「能装」是及格线下面那条线，别急着庆祝。\n\n【改这些】\n1. 配 DEEPSEEK_API_KEY 再来，我才能真给你上点强度。`;
  }
  const headline = facts.spawnError
    ? `连 \`${facts.cmd}\` 都跑不起来——${facts.spawnError}。`
    : facts.timedOut
      ? `装了 5 分钟还没完，我掐了。陌生用户 5 秒就跑了。`
      : `\`${facts.cmd}\` 当场暴毙（exit ${facts.exitCode}）。`;
  const items = [];
  if (!facts.hasReadme) items.push("1. 没 README。我连「这是干嘛的、怎么跑」都得猜——猜你的人，没有。补一个，三句话讲清。");
  facts.errorLines.slice(0, 3).forEach((l, i) => {
    items.push(`${items.length + 1}. 报错「${l.trim().slice(0, 80)}」——照着把这个先修了。`);
  });
  if (items.length === 0) items.push("1. 装不上又没给清楚报错。先让 install 能复现、能报清楚，再谈别的。");
  return `【总评】${headline}我一个有手有脚的工具都跑不起来，你真觉得陌生用户能跑起来？第一关就劝退。\n\n【改这些】\n${items.join("\n")}\n\n（这是无 key 的离线模式，配上 DEEPSEEK_API_KEY 我骂得更花。）`;
}

async function roast(facts) {
  if (!hasKey()) {
    return { text: mockRoast(facts), source: "mock" };
  }
  try {
    const text = await callDeepSeek(buildRoastPrompt(facts));
    return { text, source: "deepseek" };
  } catch (err) {
    // LLM 挂了不能让整个工具崩，退回 mock + 提示
    return { text: mockRoast(facts) + `\n\n（LLM 调用失败回退离线模式：${err.message}）`, source: "mock-fallback" };
  }
}

module.exports = { roast, buildRoastPrompt, mockRoast, PERSONA };
