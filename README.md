# 骂了吗 (WouldItShip)

[![npm](https://img.shields.io/npm/v/woulditship)](https://www.npmjs.com/package/woulditship)
[![downloads](https://img.shields.io/npm/dt/woulditship)](https://www.npmjs.com/package/woulditship)
[![license](https://img.shields.io/npm/l/woulditship)](./LICENSE)
[![node](https://img.shields.io/node/v/woulditship)](https://nodejs.org)

> 把你刚 vibe 出来的产品丢进去，被全网最挑剔的真实用户骂醒。

vibecoding 让做产品的门槛塌了，但「做出来」和「有人能用」之间的鸿沟没变小——只是被自己人的乐观掩盖了。你测一遍觉得很顺，因为你知道每个按钮该点哪、哪些是占位。陌生用户没有这套内部知识，第一眼只看到困惑、死链、跑不起来的安装步骤，然后默默离开。

`woulditship` 在你的 repo 目录里，像一个最挑剔的陌生用户那样真的去装、去跑你的产品。**如果它连装都装不起来——那本身就是最狠、最不可辩驳的骂。**

## 效果预览

拿一个 README 吹「革命性 AI 神器」、但 `npm install` 直接 404 的 repo 丢进去：

```
$ npx woulditship ./my-cool-app --yes

跑 npm install ……（最多 300s）
────────────────────────────────────────────────────────────
这个产品，还没开始就结束了，速度堪比情话还没说完就被拉黑。

总评：
你这产品安装阶段就上演了《消失的依赖包》，npm 直接给我一个 404 大礼包。
README 吹得天花乱坠"革命性生产力神器"，结果连门都进不去——这不叫神器，
叫"神隐之器"。我的电脑很干净，它不配装一个自己生产方都找不到的幽灵包。

改这些：
1. npm install 直接挂了，依赖 supertool-ai 在 registry 不存在 → 检查
   package.json 依赖声明和实际发布状态，别让用户给你当 QA。
2. README 开头别写"革命性"，先写"如何正确安装"——把安装步骤写得像
   说明书，而不是小说序言。
3. 删掉"一键解决所有问题"，换成三件事：前置条件 / 安装命令+常见错误 /
   启动命令+最小可运行示例。用户不是来读广告的。
────────────────────────────────────────────────────────────
```

> 配了 `DEEPSEEK_API_KEY` 才有上面这种毒评；没配走离线 mock，朴素但能用。

## 用法

```bash
npx woulditship                 # 在当前 repo 跑；执行前会警告并等你确认
npx woulditship ./some-repo     # 指定目录
npx woulditship --no-run        # 静态模式：只读 README/结构，绝不执行任何脚本
npx woulditship --yes           # 跳过确认（CI / 熟练用户）
npx woulditship --timeout 120   # 安装硬超时秒数（默认 300）
```

## 配置

| 环境变量 | 作用 |
|---|---|
| `DEEPSEEK_API_KEY` | 配了才调 LLM 出毒评；没配走离线 mock（也能用，骂得朴素些） |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` |

## ⚠️ 安全

默认会在目标 repo 执行 `install`/`run` 脚本（含 `postinstall`），**等于运行里面的代码**。这是个骂人工具，你大概率会手痒去骂别人的 repo——`postinstall` 可以是任意代码。拿别人的 repo 前想清楚，或用 `--no-run` 只静态读。

## 支持的栈 (v1)

Node (`package.json`) · Python (`requirements.txt`/`pyproject.toml`) · Go (`go.mod`) · Rust (`Cargo.toml`)。
认不出的栈会明确告诉你「不支持」，不硬猜。

## 状态

v1：装 + 失败即 roast。`run` + 真实体验式吐槽（启动服务、点页面）是 v2。

MIT · 神仙鱼 / HRDAI
