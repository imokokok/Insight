/**
 * colorblind-friendly color scheme
 * useBlue-YellowGreen-Red，RedGreenuser
 */

import { accessibleColors } from '@/lib/config/colors';

/**
 * getmodeHeatmap colors
 * valuefromcolorinreturnforcolor
 *
 * @param percent - currentvalue
 * @param maxPercent - maximumvalue（usenormalization）
 * @returns forcolorstring（hex format）
 */
export const getColorblindHeatmapColor = (percent: number, maxPercent: number): string => {
  const absValue = Math.abs(percent);
  const seq = accessibleColors.chart.sequence;

  // whenmaximumvalueas0orrangehours，useforthreshold
  if (maxPercent === 0 || maxPercent < 0.001) {
    // threshold（supportto0.001%）
    if (absValue < 0.001) return seq[0];
    if (absValue < 0.003) return seq[1] || seq[0];
    if (absValue < 0.005) return seq[2] || seq[0];
    if (absValue < 0.01) return seq[3] || seq[0];
    if (absValue < 0.03) return seq[4] || seq[seq.length - 1];
    if (absValue < 0.05) return seq[5] || seq[seq.length - 1];
    return seq[seq.length - 1];
  }

  const normalizedValue = Math.min(percent / maxPercent, 1);
  const index = Math.floor(normalizedValue * (accessibleColors.chart.sequence.length - 1));
  return accessibleColors.chart.sequence[
    Math.min(index, accessibleColors.chart.sequence.length - 1)
  ];
};

/**
 * modecolorconfiguration
 * note：label inComponentsinusefunction
 */
export const colorblindLegendConfig = {
  heatmap: {
    lowColor: accessibleColors.priceChange.down.color,
    highColor: accessibleColors.priceChange.up.color,
    lowLabel: 'Low Diff',
    highLabel: 'High Diff',
  },
  correlation: {
    negativeColor: accessibleColors.priceChange.down.color,
    positiveColor: accessibleColors.priceChange.up.color,
    negativeLabel: 'Negative Corr',
    positiveLabel: 'Positive Corr',
  },
};
