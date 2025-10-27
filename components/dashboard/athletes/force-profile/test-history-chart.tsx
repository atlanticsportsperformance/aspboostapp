'use client';

import { useEffect, useRef, useState } from 'react';

interface TestDataPoint {
  date: string;
  value: number;
  percentile: number;
}

interface TestHistoryChartProps {
  data: TestDataPoint[];
  metricName: string;
  eliteThreshold?: number; // 75th percentile value
  eliteStdDev?: number; // Standard deviation
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
  percentile: number;
}

export default function TestHistoryChart({ data, metricName, eliteThreshold, eliteStdDev }: TestHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min/max values - include elite threshold and SD bounds if provided
    const values = data.map(d => d.value);
    let maxValue = Math.max(...values);
    let minValue = Math.min(...values, 0);

    // Expand range to include elite threshold + 1 SD if provided
    if (eliteThreshold !== undefined) {
      const upperBound = eliteStdDev !== undefined ? eliteThreshold + eliteStdDev : eliteThreshold;
      const lowerBound = eliteStdDev !== undefined ? eliteThreshold - eliteStdDev : eliteThreshold;
      maxValue = Math.max(maxValue, upperBound);
      minValue = Math.min(minValue, lowerBound);
    }

    // Add 10% padding to top and bottom for better visualization
    let valueRange = maxValue - minValue;
    const padding10 = valueRange * 0.1;
    maxValue = maxValue + padding10;
    minValue = Math.max(0, minValue - padding10); // Don't go below 0

    // Recalculate range after padding
    valueRange = maxValue - minValue;

    // Calculate bar width and spacing
    const barCount = data.length;
    const totalBarWidth = chartWidth / barCount;
    const barWidth = totalBarWidth * 0.6;
    const barSpacing = totalBarWidth * 0.4;

    // Helper to get Y position for value
    const getY = (value: number) => {
      const normalizedValue = (value - minValue) / (valueRange || 1);
      return padding.top + chartHeight - normalizedValue * chartHeight;
    };

    // Helper to get X position for bar center
    const getX = (index: number) => {
      return padding.left + index * totalBarWidth + totalBarWidth / 2;
    };

    // Helper to get zone color
    const getZoneColor = (percentile: number): string => {
      if (percentile >= 75) return '#4ADE80'; // Green (ELITE)
      if (percentile >= 50) return '#9BDDFF'; // Blue (OPTIMIZE)
      if (percentile >= 25) return '#FCD34D'; // Yellow (SHARPEN)
      return '#EF4444'; // Red (BUILD)
    };

    // Draw horizontal grid lines
    const gridLines = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Draw value labels
      const value = maxValue - (valueRange / gridLines) * i;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toFixed(0), padding.left - 10, y);
    }

    // Draw 75th percentile line (ELITE threshold) if provided
    if (eliteThreshold !== undefined) {
      const thresholdY = getY(eliteThreshold);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)'; // Green dotted line
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(width - padding.right, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label for threshold
      ctx.fillStyle = 'rgba(74, 222, 128, 0.8)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('75th %ile', width - padding.right + 5, thresholdY);

      // Draw +1 SD and -1 SD lines if standard deviation is provided
      if (eliteStdDev !== undefined) {
        // Upper bound (75th percentile + 1 SD)
        const upperY = getY(eliteThreshold + eliteStdDev);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.35)'; // Light orange
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]); // Dotted pattern
        ctx.beginPath();
        ctx.moveTo(padding.left, upperY);
        ctx.lineTo(width - padding.right, upperY);
        ctx.stroke();

        // Lower bound (75th percentile - 1 SD)
        const lowerY = getY(eliteThreshold - eliteStdDev);
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.35)'; // Light orange
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]); // Dotted pattern
        ctx.beginPath();
        ctx.moveTo(padding.left, lowerY);
        ctx.lineTo(width - padding.right, lowerY);
        ctx.stroke();

        ctx.setLineDash([]); // Reset dash pattern

        // Labels for SD lines
        ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('+1 SD', width - padding.right + 5, upperY);
        ctx.fillText('-1 SD', width - padding.right + 5, lowerY);
      }
    }

    // Draw bars
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      const barHeight = Math.max(1, padding.top + chartHeight - y);
      const color = getZoneColor(point.percentile);

      // Bar gradient
      const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '60');

      // Draw bar shadow
      ctx.shadowBlur = 8;
      ctx.shadowColor = color + '40';

      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

      // Draw bar border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
    });

    // Draw connecting line
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.value);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points on line
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.value);
      const color = getZoneColor(point.percentile);

      // Point glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;

      // Point
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Point border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw X-axis labels (dates)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.forEach((point, index) => {
      const x = getX(index);
      const date = new Date(point.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      ctx.fillText(dateStr, x, padding.top + chartHeight + 10);
    });

  }, [data, eliteThreshold, eliteStdDev]);

  // Handle mouse movement for hover tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Helper to get Y position for value - MUST match canvas drawing logic exactly
    const values = data.map(d => d.value);
    let maxValue = Math.max(...values);
    let minValue = Math.min(...values, 0);

    // Expand range to include elite threshold + 1 SD if provided (same as drawing code)
    if (eliteThreshold !== undefined) {
      const upperBound = eliteStdDev !== undefined ? eliteThreshold + eliteStdDev : eliteThreshold;
      const lowerBound = eliteStdDev !== undefined ? eliteThreshold - eliteStdDev : eliteThreshold;
      maxValue = Math.max(maxValue, upperBound);
      minValue = Math.min(minValue, lowerBound);
    }

    // Add 10% padding to top and bottom (same as drawing code)
    let valueRange = maxValue - minValue;
    const padding10 = valueRange * 0.1;
    maxValue = maxValue + padding10;
    minValue = Math.max(0, minValue - padding10);

    // Recalculate range after padding
    valueRange = maxValue - minValue;

    const getY = (value: number) => {
      const normalizedValue = (value - minValue) / (valueRange || 1);
      return padding.top + chartHeight - normalizedValue * chartHeight;
    };

    // Helper to get X position for bar center
    const barCount = data.length;
    const totalBarWidth = chartWidth / barCount;
    const barWidth = totalBarWidth * 0.6;

    const getX = (index: number) => {
      return padding.left + index * totalBarWidth + totalBarWidth / 2;
    };

    // Check if mouse is over any bar OR near any dot
    let foundPoint = false;
    data.forEach((point, index) => {
      const x = getX(index);
      const y = getY(point.value);

      // Check if mouse is within bar area
      const inBar = (
        mouseX >= x - barWidth / 2 &&
        mouseX <= x + barWidth / 2 &&
        mouseY >= y &&
        mouseY <= padding.top + chartHeight
      );

      // Check if mouse is near the dot (within 15px radius)
      const distanceToDot = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
      const nearDot = distanceToDot < 15;

      if (inBar || nearDot) {
        foundPoint = true;
        console.log('Hover detected!', { x: e.clientX, y: e.clientY, value: point.value, distanceToDot });
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          date: point.date,
          value: point.value,
          percentile: point.percentile
        });
      }
    });

    if (!foundPoint) {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Get zone color for tooltip
  const getZoneColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-400';
    if (percentile >= 50) return 'text-[#9BDDFF]';
    if (percentile >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl shadow-black/50 animate-in fade-in duration-200">
            <div className="text-xs text-gray-400 mb-1">
              {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-white">
                {tooltip.value.toFixed(1)}
              </span>
              <span className="text-xs text-gray-400">{metricName.split('(')[1]?.replace(')', '') || ''}</span>
            </div>
            <div className={`text-sm font-semibold ${getZoneColor(tooltip.percentile)}`}>
              {Math.round(tooltip.percentile)}th Percentile
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
