#!/usr/bin/env zsh
# アイコン生成スクリプト（macOS qlmanage を使用）
# 使い方: node generate.mjs  または  zsh generate.mjs

import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const svg = join(dir, 'icon.svg');

for (const size of [128, 48, 16]) {
  const tmp = `/tmp/ql_icon_${size}`;
  mkdirSync(tmp, { recursive: true });
  execSync(`qlmanage -t -s ${size} -o ${tmp} ${svg}`, { stdio: 'pipe' });
  copyFileSync(`${tmp}/icon.svg.png`, join(dir, `icon${size}.png`));
  console.log(`✓ icon${size}.png`);
}
