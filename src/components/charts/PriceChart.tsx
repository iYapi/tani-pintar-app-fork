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
  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));
  
  // Padding for the chart to not touch the very top/bottom
  const padding = (maxPrice - minPrice) * 0.1 || 1000;
  const graphMin = minPrice - padding;
  const graphMax = maxPrice + padding;
  const range = graphMax - graphMin;

  const width = 100; // viewbox percentage
  const height = 100;

  // Calculate coordinates for the SVG polyline
  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.price - graphMin) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm w-full">
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">{title}</h3>
      
      <div className="relative h-48 w-full">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-zinc-400 font-mono pb-6">
          <span>Rp{(graphMax / 1000).toFixed(0)}k</span>
          <span>Rp{((graphMin + range / 2) / 1000).toFixed(0)}k</span>
          <span>Rp{(graphMin / 1000).toFixed(0)}k</span>
        </div>

        {/* Chart Area */}
        <div className="absolute left-10 right-0 top-0 h-full">
          {/* Grid lines */}
          <div className="absolute top-0 w-full h-[1px] bg-zinc-100 dark:bg-zinc-800"></div>
          <div className="absolute top-1/2 w-full h-[1px] bg-zinc-100 dark:bg-zinc-800"></div>
          <div className="absolute bottom-6 w-full h-[1px] bg-zinc-100 dark:bg-zinc-800"></div>

          {/* SVG Line */}
          <svg
            className="absolute top-0 left-0 w-full h-[calc(100%-1.5rem)] overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="#22c55e" // green-500
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="drop-shadow-sm"
            />
            {/* Dots */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((point.price - graphMin) / range) * 100;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1.5"
                  className="fill-white dark:fill-zinc-900 stroke-green-500 stroke-[1]"
                />
              );
            })}
          </svg>

          {/* X-Axis Labels (first, middle, last) */}
          <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] text-zinc-400 mt-2">
            <span>{new Date(data[0].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
