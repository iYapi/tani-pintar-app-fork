import React from "react";

interface PriceTrendData {
  date: string;
  price: number;
}

interface PriceChartProps {
  data: PriceTrendData[];
  title?: string;
}

export default function PriceChart({ data, title = "Proyeksi Harga 14 Hari" }: PriceChartProps) {
  if (!data || data.length === 0) return null;

  // Find min and max for scaling
  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Padding for the chart to not touch the very top/bottom
  const padding = (maxPrice - minPrice) * 0.15 || 1000;
  const graphMin = Math.max(0, minPrice - padding);
  const graphMax = maxPrice + padding;
  const range = graphMax - graphMin || 1;

  // Calculate coordinates for the SVG path (viewBox is 400 x 100)
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 400;
    // Keep Y within 10 to 90 to prevent clipping of strokes at the boundaries
    const y = 90 - ((point.price - graphMin) / range) * 80;
    return { x, y, price: point.price, date: point.date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L 400 100 L 0 100 Z`;

  // Helper value for middle Y-axis label
  const midPrice = graphMin + range / 2;

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm w-full">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{title}</h3>
      
      <div className="relative h-48 w-full flex">
        {/* Y-Axis Labels (Right-aligned, fixed width, no clipping) */}
        <div className="w-16 shrink-0 flex flex-col justify-between text-[9px] text-zinc-400 font-bold font-mono pb-6 pr-2.5 text-right border-r border-border/30">
          <span>Rp {Math.round(graphMax).toLocaleString("id-ID")}</span>
          <span>Rp {Math.round(midPrice).toLocaleString("id-ID")}</span>
          <span>Rp {Math.round(graphMin).toLocaleString("id-ID")}</span>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative pl-3">
          {/* Grid lines */}
          <div className="absolute left-3 right-0 top-0 h-[1px] bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="absolute left-3 right-0 top-[40%] h-[1px] bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="absolute left-3 right-0 bottom-6 h-[1px] bg-zinc-100 dark:bg-zinc-800/60" />

          {/* SVG Line & Area Container */}
          <div className="w-full h-[calc(100%-1.5rem)] relative overflow-visible">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 400 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area path */}
              <path
                d={areaPath}
                fill="url(#chartGradient)"
              />

              {/* Line path with non-scaling stroke for sharpness */}
              <path
                d={linePath}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="drop-shadow-[0_2px_4px_rgba(34,197,94,0.15)]"
              />
            </svg>

            {/* HTML Absolute Dots - Guaranteed to be perfect circles and never stretch */}
            {points.map((p, index) => {
              const leftPct = (index / (data.length - 1)) * 100;
              const topPct = 90 - ((p.price - graphMin) / range) * 80;
              return (
                <div
                  key={index}
                  className="absolute w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-green-500 -translate-x-1/2 -translate-y-1/2 shadow-sm transition-all hover:scale-125 hover:border-green-600 cursor-pointer"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                  }}
                  title={`Rp ${p.price.toLocaleString("id-ID")} (${p.date})`}
                />
              );
            })}
          </div>

          {/* X-Axis Labels (first, middle, last) */}
          <div className="absolute bottom-0 left-3 right-0 flex justify-between text-[9px] text-zinc-400 font-bold font-mono">
            <span>{new Date(data[0].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
