# 骂了吗 (WouldYouShip)

> 把你刚 vibe 出来的产品丢进去，被全网最挑剔的真实用户骂醒。

vibecoding 让做产品的门槛塌了，但「做出来」和「有人能用」之间的鸿沟没变小——只是被自己人的乐观掩盖了。你测一遍觉得很顺，因为你知道每个按钮该点哪、哪些是占位。陌生用户没有这套内部知识，第一眼只看到困惑、死链、跑不起来的安装步骤，然后默默离开。

`wouldyouship` 在你的 repo 目录里，像一个最挑剔的陌生用户那样真的去装、去跑你的产品。**如果它连装都装不起来——那本身就是最狠、最不可辩驳的骂。**

## 用法

```bash
npx wouldyouship                 # 在当前 repo 跑；执行前会警告并等你确认
npx wouldyouship ./some-repo     # 指定目录
npx wouldyouship --no-run        # 静态模式：只读 README/结构，绝不执行任何脚本
npx wouldyouship --yes           # 跳过确认（CI / 熟练用户）
npx wouldyouship --timeout 120   # 安装硬超时秒数（默认 300）
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
