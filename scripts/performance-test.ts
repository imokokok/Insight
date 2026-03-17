import { chromium, Browser, Page } from 'playwright';

interface PerformanceMetrics {
  url: string;
  timestamp: string;
  metrics: {
    FCP: number;
    LCP: number;
    TTFB: number;
    CLS: number;
    FID: number;
    TTI: number;
    SI: number;
    TBT: number;
  };
  resources: {
    totalResources: number;
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
    fontSIze: number;
  };
  screenshots: {
    before: string;
    after: string;
  };
}

const PAGES_TO_TEST = [
  { name: 'Home', url: 'http://localhost:3000' },
  { name: 'Market Overview', url: 'http://localhost:3000/market-overview' },
  { name: 'Chainlink', url: 'http://localhost:3000/chainlink' },
];

const PERFORMANCE_BUDGETS = {
  FCP: { target: 1800, warning: 3000 },
  LCP: { target: 2500, warning: 4000 },
  TTFB: { target: 800, warning: 1800 },
  CLS: { target: 0.1, warning: 0.25 },
  TTI: { target: 3800, warning: 7300 },
  TBT: { target: 200, warning: 600 },
};

async function measurePagePerformance(
  browser: Browser,
  pageName: string,
  url: string
): Promise<PerformanceMetrics> {
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const resources: any[] = [];
    page.on('response', (response) => {
      const request = response.request();
      resources.push({
        url: response.url(),
        method: request.method(),
        status: response.status(),
        resourceType: request.resourceType(),
        size: response.headers()['content-length'] || 0,
      });
    });

    console.log(`\n📊 Testing ${pageName}: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const performanceTiming = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : null;

      const clsEntries = performance.getEntriesByType('layout-shift');
      let cls = 0;
      clsEntries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });

      const longTasks = performance.getEntriesByType('longtask');
      let tbt = 0;
      longTasks.forEach((task: any) => {
        tbt += task.duration - 50;
      });

      return {
        FCP: fcp ? fcp.startTime : 0,
        LCP: lcp ? lcp.startTime : 0,
        TTFB: perfEntries ? perfEntries.responseStart - perfEntries.requestStart : 0,
        CLS: cls,
        FID: 0,
        TTI: 0,
        SI: 0,
        TBT: tbt,
      };
    });

    const totalSize = resources.reduce((acc, r) => acc + parseInt(r.size || '0'), 0);
    const jsSize = resources
      .filter((r) => r.resourceType === 'script')
      .reduce((acc, r) => acc + parseInt(r.size || '0'), 0);
    const cssSize = resources
      .filter((r) => r.resourceType === 'stylesheet')
      .reduce((acc, r) => acc + parseInt(r.size || '0'), 0);
    const imageSize = resources
      .filter((r) => r.resourceType === 'image')
      .reduce((acc, r) => acc + parseInt(r.size || '0'), 0);
    const fontSIze = resources
      .filter((r) => r.resourceType === 'font')
      .reduce((acc, r) => acc + parseInt(r.size || '0'), 0);

    const screenshotPath = `./performance-screenshots/${pageName.toLowerCase().replace(/\s+/g, '-')}.png`;

    const metrics: PerformanceMetrics = {
      url,
      timestamp: new Date().toISOString(),
      metrics: performanceTiming,
      resources: {
        totalResources: resources.length,
        totalSize,
        jsSize,
        cssSize,
        imageSize,
        fontSIze,
      },
      screenshots: {
        before: '',
        after: screenshotPath,
      },
    };

    console.log(`  ✅ FCP: ${(performanceTiming.FCP / 1000).toFixed(2)}s`);
    console.log(`  ✅ LCP: ${(performanceTiming.LCP / 1000).toFixed(2)}s`);
    console.log(`  ✅ TTFB: ${(performanceTiming.TTFB / 1000).toFixed(2)}s`);
    console.log(`  ✅ CLS: ${performanceTiming.CLS.toFixed(3)}`);
    console.log(`  ✅ TBT: ${performanceTiming.TBT.toFixed(0)}ms`);
    console.log(`  ✅ Total Resources: ${resources.length}`);
    console.log(`  ✅ Total Size: ${(totalSize / 1024).toFixed(2)}KB`);

    return metrics;
  } finally {
    await page.close();
  }
}

function checkPerformanceBudget(metrics: PerformanceMetrics): void {
  console.log(`\n📈 Performance Budget Check for ${metrics.url}:`);

  const checks = [
    { name: 'FCP', value: metrics.metrics.FCP, budget: PERFORMANCE_BUDGETS.FCP },
    { name: 'LCP', value: metrics.metrics.LCP, budget: PERFORMANCE_BUDGETS.LCP },
    { name: 'TTFB', value: metrics.metrics.TTFB, budget: PERFORMANCE_BUDGETS.TTFB },
    { name: 'CLS', value: metrics.metrics.CLS, budget: PERFORMANCE_BUDGETS.CLS },
    { name: 'TBT', value: metrics.metrics.TBT, budget: PERFORMANCE_BUDGETS.TBT },
  ];

  checks.forEach(({ name, value, budget }) => {
    if (value <= budget.target) {
      console.log(`  ✅ ${name}: ${value.toFixed(2)} (within target: ${budget.target})`);
    } else if (value <= budget.warning) {
      console.log(
        `  ⚠️  ${name}: ${value.toFixed(2)} (warning: target ${budget.target}, warning ${budget.warning})`
      );
    } else {
      console.log(`  ❌ ${name}: ${value.toFixed(2)} (exceeds warning: ${budget.warning})`);
    }
  });
}

async function generateReport(allMetrics: PerformanceMetrics[]): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE TEST REPORT');
  console.log('='.repeat(80));

  allMetrics.forEach((metrics) => {
    console.log(`\n📄 ${metrics.url}`);
    console.log('-'.repeat(80));
    checkPerformanceBudget(metrics);
  });

  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));

  const avgMetrics = {
    FCP: 0,
    LCP: 0,
    TTFB: 0,
    CLS: 0,
    TBT: 0,
  };

  allMetrics.forEach((m) => {
    avgMetrics.FCP += m.metrics.FCP;
    avgMetrics.LCP += m.metrics.LCP;
    avgMetrics.TTFB += m.metrics.TTFB;
    avgMetrics.CLS += m.metrics.CLS;
    avgMetrics.TBT += m.metrics.TBT;
  });

  const count = allMetrics.length;
  console.log(`\nAverage Metrics across ${count} pages:`);
  console.log(`  FCP: ${(avgMetrics.FCP / count / 1000).toFixed(2)}s`);
  console.log(`  LCP: ${(avgMetrics.LCP / count / 1000).toFixed(2)}s`);
  console.log(`  TTFB: ${(avgMetrics.TTFB / count / 1000).toFixed(2)}s`);
  console.log(`  CLS: ${(avgMetrics.CLS / count).toFixed(3)}`);
  console.log(`  TBT: ${(avgMetrics.TBT / count).toFixed(0)}ms`);

  console.log('\n✅ Performance test completed!');
}

async function main() {
  console.log('🚀 Starting Performance Tests...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const allMetrics: PerformanceMetrics[] = [];

    for (const page of PAGES_TO_TEST) {
      const metrics = await measurePagePerformance(browser, page.name, page.url);
      allMetrics.push(metrics);
    }

    await generateReport(allMetrics);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
