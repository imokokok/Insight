import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PAGES_TO_TEST = [
  { name: 'Home', url: 'http://localhost:3000' },
  { name: 'Market Overview', url: 'http://localhost:3000/market-overview' },
];

const PERFORMANCE_BUDGETS = {
  FCP: { target: 1800, warning: 3000 },
  LCP: { target: 2500, warning: 4000 },
  TTFB: { target: 800, warning: 1800 },
  CLS: { target: 0.1, warning: 0.25 },
};

async function checkServerStatus() {
  try {
    const { stdout } = await execAsync(
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000'
    );
    return stdout.trim() === '200';
  } catch (error) {
    return false;
  }
}

async function measureWithLighthouse(url) {
  try {
    const { stdout } = await execAsync(
      `npx lighthouse ${url} --output=json --quiet --chrome-flags="--headless" --only-categories=performance`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    const result = JSON.parse(stdout);
    const metrics = result.audits;

    return {
      FCP: metrics['first-contentful-paint']?.numericValue || 0,
      LCP: metrics['largest-contentful-paint']?.numericValue || 0,
      TTFB: metrics['server-response-time']?.numericValue || 0,
      CLS: metrics['cumulative-layout-shift']?.numericValue || 0,
      TTI: metrics['interactive']?.numericValue || 0,
      TBT: metrics['total-blocking-time']?.numericValue || 0,
      speedIndex: metrics['speed-index']?.numericValue || 0,
      performanceScore: result.categories.performance.score * 100,
    };
  } catch (error) {
    console.error(`Error measuring ${url}:`, error.message);
    return null;
  }
}

function formatMetric(value, unit = 'ms') {
  if (unit === 'ms') {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return value.toFixed(3);
}

function checkBudget(name, value, budget) {
  if (value <= budget.target) {
    return `✅ ${name}: ${formatMetric(value)} (target: ${formatMetric(budget.target)})`;
  } else if (value <= budget.warning) {
    return `⚠️  ${name}: ${formatMetric(value)} (warning: ${formatMetric(budget.warning)})`;
  } else {
    return `❌ ${name}: ${formatMetric(value)} (exceeds: ${formatMetric(budget.warning)})`;
  }
}

async function main() {
  console.log('🚀 Quick Performance Test\n');
  console.log('='.repeat(80));

  const serverRunning = await checkServerStatus();

  if (!serverRunning) {
    console.log('❌ Development server is not running!');
    console.log('Please run "npm run dev" in another terminal and try again.\n');
    process.exit(1);
  }

  console.log('✅ Development server is running\n');

  const results = [];

  for (const page of PAGES_TO_TEST) {
    console.log(`\n📊 Testing: ${page.name} (${page.url})`);
    console.log('-'.repeat(80));

    const metrics = await measureWithLighthouse(page.url);

    if (metrics) {
      results.push({ name: page.name, url: page.url, metrics });

      console.log(`  Performance Score: ${metrics.performanceScore.toFixed(0)}/100`);
      console.log('  ' + checkBudget('FCP', metrics.FCP, PERFORMANCE_BUDGETS.FCP));
      console.log('  ' + checkBudget('LCP', metrics.LCP, PERFORMANCE_BUDGETS.LCP));
      console.log('  ' + checkBudget('TTFB', metrics.TTFB, PERFORMANCE_BUDGETS.TTFB));
      console.log('  ' + checkBudget('CLS', metrics.CLS, PERFORMANCE_BUDGETS.CLS));
      console.log(`  Speed Index: ${formatMetric(metrics.speedIndex)}`);
      console.log(`  Total Blocking Time: ${metrics.TBT.toFixed(0)}ms`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));

  if (results.length > 0) {
    const avgScore =
      results.reduce((acc, r) => acc + r.metrics.performanceScore, 0) / results.length;
    const avgFCP = results.reduce((acc, r) => acc + r.metrics.FCP, 0) / results.length;
    const avgLCP = results.reduce((acc, r) => acc + r.metrics.LCP, 0) / results.length;
    const avgCLS = results.reduce((acc, r) => acc + r.metrics.CLS, 0) / results.length;

    console.log(`\nAverage Performance Score: ${avgScore.toFixed(0)}/100`);
    console.log(`Average FCP: ${formatMetric(avgFCP)}`);
    console.log(`Average LCP: ${formatMetric(avgLCP)}`);
    console.log(`Average CLS: ${avgCLS.toFixed(3)}`);
  }

  console.log('\n✅ Performance test completed!\n');
}

main().catch(console.error);
