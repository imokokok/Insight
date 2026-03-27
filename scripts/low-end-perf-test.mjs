import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const LOW_END_DEVICE_FLAGS = [
  '--cpu-throttling=4',
  '--disable-gpu',
  '--disable-software-rasterizer',
];

const PAGES_TO_TEST = [
  { name: 'Home (Low-End)', url: 'http://localhost:3000/en' },
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
      'curl -s -L -o /dev/null -w "%{http_code}" http://localhost:3000/en'
    );
    return stdout.trim() === '200';
  } catch (_error) {
    return false;
  }
}

async function measureWithLighthouse(url, flags = []) {
  try {
    const chromeFlags = `--headless ${flags.join(' ')}`;
    const { stdout } = await execAsync(
      `npx lighthouse ${url} --output=json --quiet --chrome-flags="${chromeFlags}" --only-categories=performance`,
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
  console.log('🐌 Low-End Device Performance Test\n');
  console.log('='.repeat(80));
  console.log('Testing with CPU throttling (4x slowdown) and GPU disabled\n');

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

    const metrics = await measureWithLighthouse(page.url, LOW_END_DEVICE_FLAGS);

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
  console.log('📈 DEGRADATION ANALYSIS');
  console.log('='.repeat(80));

  if (results.length > 0) {
    console.log('\nExpected Degradation Behavior:');
    console.log('  • ParticleNetwork should detect low FPS and reduce particle count');
    console.log('  • Device memory check should trigger if memory < 4GB');
    console.log('  • prefers-reduced-motion should be respected if set');
    console.log('  • DataFlowLines should respect prefers-reduced-motion');
    console.log('\nActual Performance:');
    console.log(`  • Performance Score: ${results[0].metrics.performanceScore.toFixed(0)}/100`);
    console.log(`  • FCP: ${formatMetric(results[0].metrics.FCP)}`);
    console.log(`  • LCP: ${formatMetric(results[0].metrics.LCP)}`);
    console.log(`  • TBT: ${results[0].metrics.TBT.toFixed(0)}ms (blocking time indicates JS execution)`);
  }

  console.log('\n✅ Low-end device test completed!\n');
}

main().catch(console.error);
