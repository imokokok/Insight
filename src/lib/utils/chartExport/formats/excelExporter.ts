import type { ChartExportData, ExportMetadata, ExportProgressCallback } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportToExcel(
  data: ChartExportData[],
  filename: string,
  metadata?: ExportMetadata,
  onProgress?: ExportProgressCallback
): Blob {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  onProgress?.({ status: 'preparing', progress: 10, messageKey: 'export.progress.preparingExcel' });

  const headers = Object.keys(data[0]);
  const workbook: string[] = [];

  workbook.push('<?xml version="1.0" encoding="UTF-8"?>');
  workbook.push('<?mso-application progid="Excel.Sheet"?>');
  workbook.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
  workbook.push('          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
  workbook.push('  <Styles>');
  workbook.push('    <Style ss:ID="header">');
  workbook.push('      <Font ss:Bold="1"/>');
  workbook.push('      <Interior ss:Color="#9CA3AF" ss:Pattern="Solid"/>');
  workbook.push('    </Style>');
  workbook.push('  </Styles>');

  if (metadata) {
    workbook.push('  <Worksheet ss:Name="Metadata">');
    workbook.push('    <Table>');
    workbook.push(
      '      <Row><Cell><Data ss:Type="String">Oracle Market Data Export</Data></Cell></Row>'
    );
    workbook.push(
      `      <Row><Cell><Data ss:Type="String">Generated: ${escapeXml(metadata.exportedAt)}</Data></Cell></Row>`
    );
    if (metadata.dataSource) {
      workbook.push(
        `      <Row><Cell><Data ss:Type="String">Data Source: ${escapeXml(metadata.dataSource)}</Data></Cell></Row>`
      );
    }
    if (metadata.timeRange) {
      workbook.push(
        `      <Row><Cell><Data ss:Type="String">Time Range: ${escapeXml(metadata.timeRange)}</Data></Cell></Row>`
      );
    }
    workbook.push('    </Table>');
    workbook.push('  </Worksheet>');
  }

  workbook.push('  <Worksheet ss:Name="Data">');
  workbook.push('    <Table>');

  workbook.push('      <Row>');
  headers.forEach((header) => {
    workbook.push(
      `        <Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`
    );
  });
  workbook.push('      </Row>');

  const batchSize = 10000;
  const totalBatches = Math.ceil(data.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);

    for (const row of batch) {
      workbook.push('      <Row>');
      headers.forEach((header) => {
        const value = row[header];
        if (value === undefined || value === null) {
          workbook.push('        <Cell><Data ss:Type="String"></Data></Cell>');
        } else if (typeof value === 'number') {
          workbook.push(`        <Cell><Data ss:Type="Number">${value}</Data></Cell>`);
        } else {
          workbook.push(
            `        <Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`
          );
        }
      });
      workbook.push('      </Row>');
    }

    const progress = 10 + Math.floor(((i + 1) / totalBatches) * 80);
    onProgress?.({
      status: 'exporting',
      progress,
      messageKey: 'export.progress.processingData',
      messageParams: { current: end, total: data.length },
    });
  }

  workbook.push('    </Table>');
  workbook.push('  </Worksheet>');
  workbook.push('</Workbook>');

  onProgress?.({ status: 'exporting', progress: 95, messageKey: 'export.progress.generatingFile' });

  return new Blob([workbook.join('\n')], {
    type: 'application/vnd.ms-excel',
  });
}
