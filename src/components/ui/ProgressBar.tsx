interface ProgressBarProps {
  value: number;
  maxValue: number;
  color: string;
}

export function ProgressBar({ value, maxValue, color }: ProgressBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}
