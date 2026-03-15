'use client';

import { useState, useCallback, RefObject } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import { exportColors, baseColors, semanticColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ComparisonReportExporter');

interface ExportData {
  symbol: string;
  timestamp: string;
  oracles: Array<{
    provider: string;
    price: number;
    confidence?: number;
    responseTime: number;
    deviation: number;
  }>;
  statistics: {
    avg: number;
    max: number;
    min: number;
    range: number;
    stdDev: number;
    median?: number;
  } | null;
}

interface ComparisonReportExporterProps {
  data: ExportData;
  chartRef?: RefObject<HTMLElement | null> | RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function ComparisonReportExporter({
  data,
  chartRef,
  fileName = 'oracle-comparison-report',
}: ComparisonReportExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /**
   * 导出数据为 CSV 格式
   */
  const exportToCSV = useCallback(() => {
    if (!data) return;

    const rows: string[] = [];

    // 添加标题
    rows.push('Cross-Oracle Comparison Report');
    rows.push(`Symbol,${data.symbol}`);
    rows.push(`Timestamp,${data.timestamp}`);
    rows.push('');

    // 添加统计数据
    if (data.statistics) {
      rows.push('Statistics');
      rows.push('Metric,Value');
      rows.push(`Average Price,$${data.statistics.avg.toFixed(2)}`);
      rows.push(`Maximum Price,$${data.statistics.max.toFixed(2)}`);
      rows.push(`Minimum Price,$${data.statistics.min.toFixed(2)}`);
      rows.push(`Price Range,$${data.statistics.range.toFixed(2)}`);
      rows.push(`Standard Deviation,$${data.statistics.stdDev.toFixed(2)}`);
      if (data.statistics.median) {
        rows.push(`Median Price,$${data.statistics.median.toFixed(2)}`);
      }
      rows.push('');
    }

    // 添加预言机数据
    rows.push('Oracle Data');
    rows.push('Provider,Price,Confidence,Response Time (ms),Deviation from Avg (%)');

    data.oracles.forEach((oracle) => {
      rows.push(
        `${oracle.provider},$${oracle.price.toFixed(2)},${oracle.confidence ? (oracle.confidence * 100).toFixed(1) + '%' : 'N/A'},${oracle.responseTime},${oracle.deviation.toFixed(4)}`
      );
    });

    // 创建并下载文件
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, fileName]);

  /**
   * 导出图表为 PNG 格式
   */
  const exportToPNG = useCallback(async () => {
    if (!chartRef?.current) {
      alert('无法找到图表元素');
      return;
    }

    setIsExporting(true);

    try {
      // 使用 html2canvas 或类似库来捕获图表
      // 这里我们使用浏览器原生 API 作为简化实现
      const element = chartRef.current;

      // 创建 canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 canvas 上下文');

      // 设置 canvas 尺寸
      const rect = element.getBoundingClientRect();
      canvas.width = rect.width * 2; // 高分辨率
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      // 绘制白色背景
      ctx.fillStyle = exportColors.background;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // 绘制标题
      ctx.fillStyle = baseColors.gray[900];
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`Oracle Comparison Report - ${data.symbol}`, 20, 30);

      ctx.fillStyle = baseColors.gray[500];
      ctx.font = '14px sans-serif';
      ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 20, 55);

      // 绘制统计信息
      let yOffset = 90;
      if (data.statistics) {
        ctx.fillStyle = baseColors.gray[900];
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Statistics:', 20, yOffset);
        yOffset += 25;

        ctx.font = '14px sans-serif';
        ctx.fillText(`Average Price: $${data.statistics.avg.toFixed(2)}`, 20, yOffset);
        yOffset += 20;
        ctx.fillText(
          `Price Range: $${data.statistics.range.toFixed(2)} (${((data.statistics.range / data.statistics.avg) * 100).toFixed(2)}%)`,
          20,
          yOffset
        );
        yOffset += 20;
        ctx.fillText(`Standard Deviation: $${data.statistics.stdDev.toFixed(2)}`, 20, yOffset);
        yOffset += 30;
      }

      // 绘制表格
      ctx.fillStyle = baseColors.gray[900];
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Oracle Data:', 20, yOffset);
      yOffset += 25;

      // 表头
      const colWidths = [120, 100, 100, 120, 150];
      const headers = ['Provider', 'Price', 'Confidence', 'Response Time', 'Deviation'];

      ctx.fillStyle = baseColors.gray[100];
      ctx.fillRect(
        20,
        yOffset - 15,
        colWidths.reduce((a, b) => a + b, 0),
        25
      );

      ctx.fillStyle = baseColors.gray[700];
      ctx.font = 'bold 12px sans-serif';
      let xOffset = 20;
      headers.forEach((header, index) => {
        ctx.fillText(header, xOffset, yOffset);
        xOffset += colWidths[index];
      });
      yOffset += 20;

      // 数据行
      ctx.font = '12px sans-serif';
      data.oracles.forEach((oracle, rowIndex) => {
        if (rowIndex % 2 === 0) {
          ctx.fillStyle = baseColors.gray[50];
          ctx.fillRect(
            20,
            yOffset - 12,
            colWidths.reduce((a, b) => a + b, 0),
            20
          );
        }

        ctx.fillStyle = baseColors.gray[900];
        xOffset = 20;

        ctx.fillText(oracle.provider, xOffset, yOffset);
        xOffset += colWidths[0];

        ctx.fillText(`$${oracle.price.toFixed(2)}`, xOffset, yOffset);
        xOffset += colWidths[1];

        ctx.fillText(
          oracle.confidence ? `${(oracle.confidence * 100).toFixed(1)}%` : 'N/A',
          xOffset,
          yOffset
        );
        xOffset += colWidths[2];

        ctx.fillText(`${oracle.responseTime}ms`, xOffset, yOffset);
        xOffset += colWidths[3];

        const deviationColor =
          Math.abs(oracle.deviation) > 1
            ? semanticColors.danger.DEFAULT
            : semanticColors.success.DEFAULT;
        ctx.fillStyle = deviationColor;
        ctx.fillText(
          `${oracle.deviation > 0 ? '+' : ''}${oracle.deviation.toFixed(3)}%`,
          xOffset,
          yOffset
        );

        yOffset += 20;
      });

      // 下载图片
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      logger.error('Export failed', error instanceof Error ? error : new Error(String(error)));
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [chartRef, data, fileName]);

  /**
   * 导出为 JSON 格式
   */
  const exportToJSON = useCallback(() => {
    if (!data) return;

    const jsonData = {
      reportType: 'Cross-Oracle Comparison',
      generatedAt: new Date().toISOString(),
      ...data,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, fileName]);

  return (
    <>
      {/* 导出按钮 */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white  hover:bg-green-700 transition-colors"
        title="导出报告"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>导出</span>
      </button>

      {/* 导出选项模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white   max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">导出对比报告</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                选择要导出的格式。CSV 适合数据分析，PNG 适合展示分享，JSON 适合程序处理。
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowModal(false);
                  }}
                  className="flex items-center gap-3 p-4 border border-gray-200  hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="p-2 bg-green-100 ">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">导出为 CSV</p>
                    <p className="text-sm text-gray-500">适用于 Excel 或数据分析</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportToPNG();
                    setShowModal(false);
                  }}
                  disabled={isExporting}
                  className="flex items-center gap-3 p-4 border border-gray-200  hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 bg-purple-100 ">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {isExporting ? '导出中...' : '导出为 PNG'}
                    </p>
                    <p className="text-sm text-gray-500">保存为图片格式</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    exportToJSON();
                    setShowModal(false);
                  }}
                  className="flex items-center gap-3 p-4 border border-gray-200  hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="p-2 bg-blue-100 ">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">导出为 JSON</p>
                    <p className="text-sm text-gray-500">适用于程序处理</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 -xl">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800  hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 独立的报告导出组件，用于完整页面导出
 */
export function FullReportExporter({
  data,
  fileName = 'oracle-full-report',
}: {
  data: ExportData;
  fileName?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateFullReport = useCallback(async () => {
    setIsGenerating(true);

    try {
      // 生成完整的 HTML 报告
      const reportHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oracle Comparison Report - ${data.symbol}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #111;
    }
    .subtitle {
      color: #666;
      margin-bottom: 32px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e5e5;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
    }
    tr:hover {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔮 Oracle Comparison Report</h1>
    <p class="subtitle">${data.symbol}/USD • Generated on ${new Date(data.timestamp).toLocaleString()}</p>
    
    <div class="section">
      <h2 class="section-title">Price Statistics</h2>
      <div class="stats-grid">
        ${
          data.statistics
            ? `
        <div class="stat-card">
          <div class="stat-label">Average Price</div>
          <div class="stat-value">$${data.statistics.avg.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Price Range</div>
          <div class="stat-value">$${data.statistics.range.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Standard Deviation</div>
          <div class="stat-value">$${data.statistics.stdDev.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Max Price</div>
          <div class="stat-value">$${data.statistics.max.toFixed(2)}</div>
        </div>
        `
            : ''
        }
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Oracle Comparison Data</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Price</th>
            <th>Confidence</th>
            <th>Response Time</th>
            <th>Deviation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.oracles
            .map((oracle) => {
              const deviationAbs = Math.abs(oracle.deviation);
              let statusClass = 'badge-green';
              let statusText = 'Normal';
              if (deviationAbs > 2) {
                statusClass = 'badge-red';
                statusText = 'High Deviation';
              } else if (deviationAbs > 1) {
                statusClass = 'badge-yellow';
                statusText = 'Warning';
              }
              return `
          <tr>
            <td><strong>${oracle.provider}</strong></td>
            <td>$${oracle.price.toFixed(2)}</td>
            <td>${oracle.confidence ? (oracle.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
            <td>${oracle.responseTime}ms</td>
            <td>${oracle.deviation > 0 ? '+' : ''}${oracle.deviation.toFixed(3)}%</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
          </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Generated by Oracle Insight Platform • ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;

      // 下载 HTML 报告
      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsGenerating(false);
    }
  }, [data, fileName]);

  return (
    <button
      onClick={generateFullReport}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span>{isGenerating ? '生成中...' : '生成完整报告'}</span>
    </button>
  );
}

export default ComparisonReportExporter;
