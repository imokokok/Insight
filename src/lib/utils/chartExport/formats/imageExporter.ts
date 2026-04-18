/**
 * @fileoverview 图像格式导出 (PNG/SVG)
 * @description 处理PNG和SVG格式的图表导出
 */

import { exportColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

import { RESOLUTION_CONFIG } from '../types';

import type { Resolution, ExportProgressCallback } from '../types';

const logger = createLogger('imageExporter');

/**
 * 导出为PNG格式
 */
export async function exportToPNG(
  chartElement: HTMLElement,
  filename: string,
  options: {
    backgroundColor?: string;
    scale?: number;
    padding?: number;
    resolution?: Resolution;
    chartTitle?: string;
    dataSource?: string;
    showTimestamp?: boolean;
    watermark?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const {
    backgroundColor = exportColors.background,
    padding = 20,
    resolution = 'standard',
    chartTitle,
    dataSource,
    showTimestamp = true,
    watermark = false,
  } = options;

  const scale = RESOLUTION_CONFIG[resolution].scale;

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingChart' });

  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found in chart container');
  }

  onProgress?.({ status: 'exporting', progress: 20, messageKey: 'export.progress.cloningSVG' });

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgRect = svgElement.getBoundingClientRect();

  const headerHeight = chartTitle ? 60 : 0;
  const footerHeight = showTimestamp ? 40 : 0;
  const watermarkHeight = watermark ? 30 : 0;

  const totalWidth = svgRect.width + padding * 2;
  const totalHeight = svgRect.height + padding * 2 + headerHeight + footerHeight + watermarkHeight;

  clone.setAttribute('width', String(svgRect.width * scale));
  clone.setAttribute('height', String(svgRect.height * scale));
  clone.style.backgroundColor = backgroundColor;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (chartTitle) {
    ctx.fillStyle = exportColors.text.primary;
    ctx.font = `bold ${24 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(chartTitle, (totalWidth * scale) / 2, padding * scale + 30 * scale);
  }

  onProgress?.({ status: 'exporting', progress: 40, messageKey: 'export.progress.serializingSVG' });

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  onProgress?.({ status: 'exporting', progress: 50, messageKey: 'export.progress.renderingImage' });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const chartY = padding * scale + headerHeight * scale;
        ctx.drawImage(img, padding * scale, chartY, svgRect.width * scale, svgRect.height * scale);

        if (showTimestamp) {
          const timestampY = chartY + svgRect.height * scale + 25 * scale;
          ctx.fillStyle = exportColors.text.secondary;
          ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'left';

          const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          ctx.fillText(`Exported: ${timestamp}`, padding * scale, timestampY);

          if (dataSource) {
            ctx.fillStyle = exportColors.text.muted;
            ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.fillText(`Data Source: ${dataSource}`, padding * scale, timestampY + 18 * scale);
          }
        }

        if (watermark) {
          ctx.save();
          ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
          ctx.font = `bold ${20 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText('Insight Analytics', 0, 0);
          ctx.restore();
        }

        onProgress?.({
          status: 'exporting',
          progress: 80,
          messageKey: 'export.progress.generatingPNG',
        });

        canvas.toBlob(
          (blob) => {
            if (blob) {
              URL.revokeObjectURL(svgUrl);
              onProgress?.({
                status: 'completed',
                progress: 100,
                messageKey: 'export.progress.completed',
              });
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          },
          'image/png',
          1.0
        );
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = svgUrl;
  });
}

/**
 * 导出为SVG格式
 */
export async function exportToSVG(
  chartElement: HTMLElement,
  filename: string,
  options: {
    backgroundColor?: string;
    includeStyles?: boolean;
    chartTitle?: string;
    dataSource?: string;
    showTimestamp?: boolean;
    watermark?: boolean;
  } = {},
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const {
    backgroundColor = exportColors.background,
    includeStyles = true,
    chartTitle,
    dataSource,
    showTimestamp = true,
    watermark = false,
  } = options;

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingSVG' });

  const svgElement = chartElement.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found in chart container');
  }

  onProgress?.({ status: 'exporting', progress: 30, messageKey: 'export.progress.cloningSVG' });

  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgRect = svgElement.getBoundingClientRect();

  const headerHeight = chartTitle ? 60 : 0;
  const footerHeight = showTimestamp ? 40 : 0;
  const padding = 20;

  const totalWidth = svgRect.width + padding * 2;
  const totalHeight = svgRect.height + padding * 2 + headerHeight + footerHeight;

  clone.setAttribute('width', String(totalWidth));
  clone.setAttribute('height', String(totalHeight));

  if (includeStyles) {
    const styleSheets = document.styleSheets;
    let cssText = '';

    try {
      for (let i = 0; i < styleSheets.length; i++) {
        try {
          const rules = styleSheets[i].cssRules || styleSheets[i].rules;
          for (let j = 0; j < rules.length; j++) {
            cssText += rules[j].cssText + '\n';
          }
        } catch (e) {
          logger.warn(
            'Failed to access stylesheet rules',
            e instanceof Error ? e : new Error(String(e))
          );
        }
      }
    } catch (e) {
      logger.warn('Failed to extract stylesheets', e instanceof Error ? e : new Error(String(e)));
    }

    if (cssText) {
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = cssText;
      clone.insertBefore(styleElement, clone.firstChild);
    }
  }

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', backgroundColor);
  clone.insertBefore(bgRect, clone.firstChild);

  if (chartTitle) {
    const titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    titleGroup.setAttribute('class', 'export-title');

    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', String(totalWidth / 2));
    titleText.setAttribute('y', String(padding + 30));
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    titleText.setAttribute('font-size', '24');
    titleText.setAttribute('font-weight', 'bold');
    titleText.setAttribute('fill', exportColors.text.primary);
    titleText.textContent = chartTitle;
    titleGroup.appendChild(titleText);
    clone.appendChild(titleGroup);
  }

  const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  contentGroup.setAttribute('transform', `translate(${padding}, ${padding + headerHeight})`);

  const children = Array.from(clone.childNodes).filter(
    (node) => node !== bgRect && !(node as Element).classList?.contains('export-title')
  );
  children.forEach((child) => {
    if (child !== contentGroup) {
      contentGroup.appendChild(child);
    }
  });
  clone.appendChild(contentGroup);

  if (showTimestamp) {
    const footerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    footerGroup.setAttribute('class', 'export-footer');

    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const timestampText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timestampText.setAttribute('x', String(padding));
    timestampText.setAttribute('y', String(totalHeight - padding - (dataSource ? 18 : 0)));
    timestampText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    timestampText.setAttribute('font-size', '12');
    timestampText.setAttribute('fill', exportColors.text.secondary);
    timestampText.textContent = `Exported: ${timestamp}`;
    footerGroup.appendChild(timestampText);

    if (dataSource) {
      const sourceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sourceText.setAttribute('x', String(padding));
      sourceText.setAttribute('y', String(totalHeight - padding));
      sourceText.setAttribute(
        'font-family',
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      );
      sourceText.setAttribute('font-size', '10');
      sourceText.setAttribute('fill', exportColors.text.muted);
      sourceText.textContent = `Data Source: ${dataSource}`;
      footerGroup.appendChild(sourceText);
    }

    clone.appendChild(footerGroup);
  }

  if (watermark) {
    const watermarkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    watermarkGroup.setAttribute('opacity', '0.1');
    watermarkGroup.setAttribute('transform', `rotate(-30, ${totalWidth / 2}, ${totalHeight / 2})`);

    const watermarkText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    watermarkText.setAttribute('x', String(totalWidth / 2));
    watermarkText.setAttribute('y', String(totalHeight / 2));
    watermarkText.setAttribute('text-anchor', 'middle');
    watermarkText.setAttribute('dominant-baseline', 'middle');
    watermarkText.setAttribute(
      'font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    watermarkText.setAttribute('font-size', '24');
    watermarkText.setAttribute('font-weight', 'bold');
    watermarkText.setAttribute('fill', '#808080');
    watermarkText.textContent = 'Insight Analytics';
    watermarkGroup.appendChild(watermarkText);
    clone.appendChild(watermarkGroup);
  }

  onProgress?.({ status: 'exporting', progress: 60, messageKey: 'export.progress.serializingSVG' });

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const svgData = new XMLSerializer().serializeToString(clone);

  onProgress?.({ status: 'exporting', progress: 80, messageKey: 'export.progress.generatingFile' });

  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8;' });

  onProgress?.({ status: 'completed', progress: 100, messageKey: 'export.progress.completed' });

  return blob;
}
