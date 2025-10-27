'use client';

import { useEffect, useRef } from 'react';

interface TestDataPoint {
  date: string;
  value: number;
  percentile: number;
}

interface TestHistoryChartProps {
  data: TestDataPoint[];
  metricName: string;
  eliteThreshold?: number; // 75th percentile value
}

export default function TestHistoryChart({ data, metricName, eliteThreshold }: TestHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Find min/max values
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue;

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

  }, [data, eliteThreshold]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
