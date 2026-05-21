#!/usr/bin/env node
// 骂了吗 CLI 入口。薄壳，真实逻辑在 ../src/cli.js。
"use strict";

const { main } = require("../src/cli");

main(process.argv.slice(2)).catch((err) => {
  console.error("\n骂了吗自己崩了（这下尴尬的是我）：", err && err.message ? err.message : err);
  process.exit(1);
});
