'use client';

/**
 * @fileoverview 离散度仪表盘组件
 * @description 使用环形图展示价格离散度指数 (变异系数 CV)
 */

import { memo } from 'react';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DispersionGaugeProps {
  cv: number; // 变异系数 (Coefficient of Variation) 百分比
  size?: number;
}

/**
 * 获取离散度解读
 */
function getDispersionInterpretation(cv: number): {
  label: string;
  color: string;
  description: string;
} {
  if (cv < 0.1) {
    return {
      label: '高度一致',
      color: '#10B981',
      description: '各预言机价格高度一致，市场共识强',
    };
  }
  if (cv < 0.5) {
    return {
      label: '基本一致',
      color: '#3B82F6',
      description: '价格偏差在可接受范围内',
    };
  }
  if (cv < 1.0) {
    return {
      label: '存在分歧',
      color: '#F59E0B',
      description: '部分预言机价格存在偏差，建议关注',
    };
  }
  return {
    label: '严重分歧',
    color: '#EF4444',
    description: '价格离散度高，存在潜在风险',
  };
}

function DispersionGaugeComponent({ cv, size = 120 }: DispersionGaugeProps) {
  const interpretation = getDispersionInterpretation(cv);
  const maxCV = 2.0; // 最大显示2%
  const normalizedCV = Math.min(cv, maxCV);
  const percentage = (normalizedCV / maxCV) * 100;

  // 仪表盘数据
  const data = [
    { name: 'dispersion', value: percentage },
    { name: 'empty', value: 100 - percentage },
  ];

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={size * 0.35}
              outerRadius={size * 0.5}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={interpretation.color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* 中心文字 */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            marginTop: -size * 0.65,
            height: size * 0.5,
          }}
        >
          <span className="text-lg font-bold text-gray-900">{cv.toFixed(2)}%</span>
          <span className="text-xs text-gray-500">CV</span>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: interpretation.color }} />
          <span className="font-medium text-gray-900">{interpretation.label}</span>
        </div>
        <p className="text-xs text-gray-500">{interpretation.description}</p>
        <div className="mt-2 text-xs text-gray-400">变异系数 = 标准差 / 平均值</div>
      </div>
    </div>
  );
}

export const DispersionGauge = memo(DispersionGaugeComponent);
DispersionGauge.displayName = 'DispersionGauge';

export default DispersionGauge;
