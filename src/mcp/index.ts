import { runStdioServer } from './server';

// Redirect stdout-based console methods to stderr so non-MCP logs don't corrupt
// the stdio message stream used by the MCP transport.
// eslint-disable-next-line no-console
const originalLog = console.log;
// eslint-disable-next-line no-console
const originalInfo = console.info;

const originalWarn = console.warn;

function formatArgs(args: unknown[]): string {
  return args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
}

// eslint-disable-next-line no-console
console.log = (...args: unknown[]) => {
  process.stderr.write(`${formatArgs(args)}\n`);
  originalLog(...args);
};

// eslint-disable-next-line no-console
console.info = (...args: unknown[]) => {
  process.stderr.write(`${formatArgs(args)}\n`);
  originalInfo(...args);
};

console.warn = (...args: unknown[]) => {
  process.stderr.write(`${formatArgs(args)}\n`);
  originalWarn(...args);
};

runStdioServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
