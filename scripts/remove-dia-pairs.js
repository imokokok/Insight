const fs = require('fs');
const path = require('path');

const filePath = '/Users/imokokok/Documents/insight/src/lib/oracles/constants/supportedSymbols.ts';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const startLine = 184;
const endLine = 445;

const newLines = [...lines.slice(0, startLine - 1), ...lines.slice(endLine)];

const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✓ 已删除 DIA_AVAILABLE_PAIRS (第 184-445 行)');
