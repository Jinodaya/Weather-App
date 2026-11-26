import { useState } from 'react';
import { Droplets } from 'lucide-react';
import type { HourlyPoint, TempUnit } from '../types/weather';
import { describeWeatherCode, formatHourLabel, formatTemp } from '../utils/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface HourlyTimelineProps {
  hourly: HourlyPoint[];
  unit: TempUnit;
}

export function HourlyTimeline({ hourly, unit }: HourlyTimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (hourly.length === 0) return null;

  const displayHours = hourly.slice(0, 24);
  const temps = displayHours.map((h) => formatTemp(h.temperature, unit));
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const range = Math.max(maxTemp - minTemp, 1);

  // Build SVG polyline points across a virtual 24-column coordinate space
  const svgWidth = displayHours.length * 64;
  const svgHeight = 52;
  const padTop = 10;
  const padBottom = 10;
  const usableHeight = svgHeight - padTop - padBottom;

  const coords = temps.map((t, i) => {
    const x = i * 64 + 32;
    const y = padTop + usableHeight - ((t - minTemp) / range) * usableHeight;
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${svgHeight} L ${coords[0].x.toFixed(1)} ${svgHeight} Z`;

  const activeHour = displayHours[selectedIndex] ?? displayHours[0];
  const activeDesc = describeWeatherCode(activeHour.weatherCode);

  return (
    <section
      aria-label="Hourly forecast"
      className="bg-white border border-slate-200/80 rounded-2xl p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Next 24 Hours</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {selectedIndex === 0 ? 'Now' : formatHourLabel(activeHour.time)}
            <span aria-hidden="true"> · </span>
            {activeDesc.label}
            <span aria-hidden="true"> · </span>
            {formatTemp(activeHour.temperature, unit)}°{unit}
            {activeHour.precipitationProbability > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                {activeHour.precipitationProbability}% precip chance
              </>
            )}
          </p>
        </div>
        <div className="text-xs text-slate-500 tabular-nums font-mono">
          Range {minTemp}° – {maxTemp}°{unit}
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
        <div style={{ width: `${svgWidth}px` }} className="relative">
          {/* Temperature curve */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[52px] block overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hourlyCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#hourlyCurveFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#0284C7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coords.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={idx === selectedIndex ? 4 : 2.25}
                fill={idx === selectedIndex ? '#0284C7' : '#FFFFFF'}
                stroke="#0284C7"
                strokeWidth="1.75"
              />
            ))}
          </svg>

          {/* Hour columns */}
          <div className="grid grid-flow-col auto-cols-[64px] mt-2">
            {displayHours.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const temp = formatTemp(item.temperature, unit);
              return (
                <button
                  key={item.time}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                    isSelected
                      ? 'bg-sky-50/90 text-slate-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap tabular-nums">
                    {idx === 0 ? 'Now' : formatHourLabel(item.time)}
                  </span>
                  <div className="my-2">
                    <WeatherIcon code={item.weatherCode} isDay={item.isDay} size={18} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums font-mono text-slate-900">
                    {temp}°
                  </span>
                  <span className="mt-1 h-4 flex items-center justify-center text-[11px] tabular-nums font-mono text-sky-600">
                    {item.precipitationProbability >= 10 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Droplets size={10} aria-hidden="true" />
                        {item.precipitationProbability}%
                      </span>
                    ) : (
                      <span className="text-slate-300">–</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
