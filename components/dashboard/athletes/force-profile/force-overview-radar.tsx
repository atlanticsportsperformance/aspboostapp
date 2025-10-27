'use client';

import { useEffect, useRef, useState } from 'react';

interface RadarDataPoint {
  name: string;
  displayName: string;
  current: { percentile: number; value: number; date: string } | null;
  previous: { percentile: number; value: number; date: string } | null;
}

interface ForceOverviewRadarProps {
  data: RadarDataPoint[];
  compositeScore: number;
}

interface TooltipData {
  x: number;
  y: number;
  displayName: string;
  percentile: number;
  value: number;
  date: string;
}

export default function ForceOverviewRadar({ data, compositeScore }: ForceOverviewRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

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
    const centerX = width / 2;
    const centerY = height / 2;
    // Reduce padding to make radar plot bigger (was -60, now -12 for maximum size)
    const maxRadius = Math.min(width, height) / 2 - 12;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Enable crisp text rendering on canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textRendering = 'optimizeLegibility' as any;

    // Helper function to get color based on percentile (using composite for whole shape)
    const getGradientColor = (percentile: number): string => {
      if (percentile >= 75) return '#4ADE80'; // Green (ELITE)
      if (percentile >= 50) return '#9BDDFF'; // Blue (OPTIMIZE)
      if (percentile >= 25) return '#FCD34D'; // Yellow (SHARPEN)
      return '#EF4444'; // Red (BUILD)
    };

    // Use light gray/white color for radar with glow (like the reference image)
    const radarColor = '#E5E7EB'; // Light gray instead of pure white for better visibility

    // Draw concentric circles (grid)
    const levels = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= levels; i++) {
      const radius = (maxRadius / levels) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axes for each metric
    const angleStep = (2 * Math.PI) / data.length;
    data.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2; // Start from top
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Draw PREVIOUS test (gray outline)
    const previousPoints: {x: number, y: number}[] = [];
    data.forEach((point, index) => {
      if (point.previous) {
        const angle = angleStep * index - Math.PI / 2;
        const radius = (point.previous.percentile / 100) * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        previousPoints.push({ x, y });
      }
    });

    if (previousPoints.length === data.length) {
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)'; // Gray
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      previousPoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw CURRENT test (smooth rounded polygon with single zone color)
    const currentPoints: {x: number, y: number, percentile: number}[] = [];
    data.forEach((point, index) => {
      if (point.current) {
        const angle = angleStep * index - Math.PI / 2;
        const radius = (point.current.percentile / 100) * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        currentPoints.push({ x, y, percentile: point.current.percentile });
      }
    });

    if (currentPoints.length === data.length) {
      // Create radial gradient fill using light gray/white
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, 'rgba(229, 231, 235, 0.15)'); // Light gray 15% at center
      gradient.addColorStop(1, 'rgba(229, 231, 235, 0.35)'); // Light gray 35% at edge

      // Helper to draw with rounded corners that stay close to actual points
      const drawWithRoundedCorners = (radius: number) => {
        if (currentPoints.length < 3) return;

        ctx.beginPath();

        // Start from midpoint between last and first point
        const firstPoint = currentPoints[0];
        const lastPoint = currentPoints[currentPoints.length - 1];
        const startX = (lastPoint.x + firstPoint.x) / 2;
        const startY = (lastPoint.y + firstPoint.y) / 2;
        ctx.moveTo(startX, startY);

        // Draw through all points with rounded corners
        for (let i = 0; i < currentPoints.length; i++) {
          const current = currentPoints[i];
          const next = currentPoints[(i + 1) % currentPoints.length];

          // Calculate distance to next point
          const distToNext = Math.sqrt(
            Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
          );

          // Use smaller radius to stay closer to the actual point
          const actualRadius = Math.min(radius, distToNext * 0.15);

          // Draw line toward current point, then arc toward next
          ctx.arcTo(current.x, current.y, next.x, next.y, actualRadius);
        }

        ctx.closePath();
      };

      // Fill with rounded corners (3px radius)
      ctx.fillStyle = gradient;
      drawWithRoundedCorners(3);
      ctx.fill();

      // Draw outer stroke with glow and rounded corners
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(229, 231, 235, 0.8)';
      ctx.strokeStyle = radarColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      drawWithRoundedCorners(3);
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // NO VISIBLE POINTS - just invisible hover regions stored for interactivity
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw labels with larger font size for crisp rendering at high DPI
    // Responsive font size based on canvas width
    const baseFontSize = Math.max(11, Math.min(14, width / 50));
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${baseFontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add shadow for better contrast and depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    data.forEach((point, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const labelRadius = maxRadius + 18; // Slightly more space for larger crisp text
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);

      // Split label into multiple lines if needed
      const words = point.displayName.split(' ');
      const lineHeight = baseFontSize * 1.3;
      if (words.length > 2) {
        ctx.fillText(words.slice(0, 2).join(' '), x, y - lineHeight / 2);
        ctx.fillText(words.slice(2).join(' '), x, y + lineHeight / 2);
      } else {
        ctx.fillText(point.displayName, x, y);
      }
    });

    // Reset shadow for other drawing
    ctx.shadowBlur = 0;

  }, [data, hoveredPoint]);

  // Handle mouse movement for interactivity
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 12; // Match the rendering maxRadius
    const angleStep = (2 * Math.PI) / data.length;

    let foundPoint = false;

    data.forEach((point, index) => {
      if (!point.current) return;

      const angle = angleStep * index - Math.PI / 2;
      const radius = (point.current.percentile / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);

      if (distance < 15) {
        foundPoint = true;
        setHoveredPoint(index);
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          displayName: point.displayName,
          percentile: point.current.percentile,
          value: point.current.value,
          date: point.current.date,
        });
      }
    });

    if (!foundPoint) {
      setHoveredPoint(null);
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setTooltip(null);
  };

  // Get zone color for composite score
  const getZoneColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-400';
    if (percentile >= 50) return 'text-[#9BDDFF]';
    if (percentile >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getZoneGlow = (percentile: number): string => {
    if (percentile >= 75) return 'drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]';
    if (percentile >= 50) return 'drop-shadow-[0_0_20px_rgba(155,221,255,0.6)]';
    if (percentile >= 25) return 'drop-shadow-[0_0_20px_rgba(252,211,77,0.6)]';
    return 'drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]';
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

      {/* Center composite score with glow - responsive sizing */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div
          className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 ${getZoneColor(compositeScore)} ${getZoneGlow(compositeScore)}`}
          style={{
            textShadow: '0px 3px 15px rgba(0,0,0,1), 0px 0px 12px rgba(0,0,0,0.95), 0px 6px 24px rgba(0,0,0,0.9), 0px 0px 6px rgba(0,0,0,0.85)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            fontFeatureSettings: '"kern" 1',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          {Math.round(compositeScore)}
        </div>
        <div
          className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 font-medium"
          style={{
            textShadow: '0px 2px 10px rgba(0,0,0,1), 0px 0px 8px rgba(0,0,0,0.95), 0px 0px 4px rgba(0,0,0,0.85)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          }}
        >
          Force Profile
        </div>
      </div>

      {/* Interactive Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x + 4,
            top: tooltip.y + 4,
          }}
        >
          <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl shadow-black/50 animate-in fade-in duration-200">
            <div className="text-white font-semibold text-sm mb-1">{tooltip.displayName}</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-2xl font-bold ${getZoneColor(tooltip.percentile)}`}>
                {Math.round(tooltip.percentile)}
              </span>
              <span className="text-xs text-gray-400">percentile</span>
            </div>
            <div className="text-xs text-gray-400">
              Value: <span className="text-white font-mono">{tooltip.value.toFixed(1)}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
