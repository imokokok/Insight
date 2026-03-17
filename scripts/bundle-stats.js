const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '..', '.next', 'static', 'chunks');
const BUILD_ID_FILE = path.join(__dirname, '..', '.next', 'BUILD_ID');

const BUDGET_LIMITS = {
  maxChunkSize: 500 * 1024,
  totalJsSize: 6 * 1024 * 1024,
  warningChunkSize: 300 * 1024,
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getJsFiles(fullPath));
    } else if (item.endsWith('.js') && !item.endsWith('.map')) {
      files.push({
        name: item,
        path: fullPath,
        size: stat.size,
      });
    }
  }

  return files;
}

function analyzeBundles() {
  console.log('\n📊 Bundle Size Analysis\n');
  console.log('='.repeat(60));

  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error('❌ Build output not found. Run "npm run build" first.');
    process.exit(1);
  }

  const buildId = fs.existsSync(BUILD_ID_FILE)
    ? fs.readFileSync(BUILD_ID_FILE, 'utf-8').trim()
    : 'unknown';
  console.log(`Build ID: ${buildId}\n`);

  const jsFiles = getJsFiles(CHUNKS_DIR);
  const sortedFiles = jsFiles.sort((a, b) => b.size - a.size);

  const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(`Total JS Size: ${formatBytes(totalSize)}`);
  console.log(`Total Chunks: ${jsFiles.length}\n`);

  console.log('Top 20 Largest Chunks:');
  console.log('-'.repeat(60));

  const topFiles = sortedFiles.slice(0, 20);
  let hasWarnings = false;
  let hasErrors = false;

  topFiles.forEach((file, index) => {
    const icon =
      file.size > BUDGET_LIMITS.maxChunkSize
        ? '❌'
        : file.size > BUDGET_LIMITS.warningChunkSize
          ? '⚠️'
          : '✅';

    if (file.size > BUDGET_LIMITS.maxChunkSize) hasErrors = true;
    if (file.size > BUDGET_LIMITS.warningChunkSize) hasWarnings = true;

    console.log(
      `${icon} ${(index + 1).toString().padStart(2)}. ${file.name.padEnd(40)} ${formatBytes(file.size).padStart(10)}`
    );
  });

  console.log('-'.repeat(60));

  const largeChunks = jsFiles.filter((f) => f.size > BUDGET_LIMITS.warningChunkSize);
  if (largeChunks.length > 0) {
    console.log(
      `\n⚠️  ${largeChunks.length} chunk(s) exceed warning threshold (${formatBytes(BUDGET_LIMITS.warningChunkSize)})`
    );
  }

  const errorChunks = jsFiles.filter((f) => f.size > BUDGET_LIMITS.maxChunkSize);
  if (errorChunks.length > 0) {
    console.log(
      `❌ ${errorChunks.length} chunk(s) exceed error threshold (${formatBytes(BUDGET_LIMITS.maxChunkSize)})`
    );
  }

  console.log('\n📦 Size Summary:');
  console.log(`   Total JS:      ${formatBytes(totalSize)}`);
  console.log(`   Average Chunk: ${formatBytes(totalSize / jsFiles.length)}`);
  console.log(`   Largest Chunk: ${formatBytes(sortedFiles[0]?.size || 0)}`);

  console.log('\n💡 Recommendations:');
  if (totalSize > BUDGET_LIMITS.totalJsSize) {
    console.log('   - Consider code splitting for large routes');
    console.log('   - Review and optimize large dependencies');
  }
  console.log('   - Run "npm run analyze" for detailed bundle analysis');
  console.log('   - Check for duplicate dependencies with "npx depcheck"');

  console.log('\n' + '='.repeat(60) + '\n');

  if (hasErrors) {
    console.log('❌ Bundle size check failed!\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Bundle size check passed with warnings!\n');
  } else {
    console.log('✅ Bundle size check passed!\n');
  }
}

analyzeBundles();
