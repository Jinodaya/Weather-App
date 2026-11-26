import { Sunrise, Sunset } from 'lucide-react';
import type { CurrentWeather, DailyPoint } from '../types/weather';
import {
  formatClockLabel,
  getMinutesFromIso,
  getUvLabel,
} from '../utils/weatherCodes';

interface DaylightCardProps {
  today: DailyPoint | undefined;
  current: CurrentWeather;
  minutesSinceMidnight: number;
}

export function DaylightCard({
  today,
  current,
  minutesSinceMidnight,
}: DaylightCardProps) {
  if (!today) return null;

  const sunriseMins = getMinutesFromIso(today.sunrise);
  const sunsetMins = getMinutesFromIso(today.sunset);
  const totalDaylightMins = Math.max(sunsetMins - sunriseMins, 1);

  const rawProgress = (minutesSinceMidnight - sunriseMins) / totalDaylightMins;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const isDaylight = minutesSinceMidnight >= sunriseMins && minutesSinceMidnight <= sunsetMins;

  const daylightHours = Math.floor(totalDaylightMins / 60);
  const daylightRemMins = totalDaylightMins % 60;

  // Semi-circle arc geometry
  const cx = 120;
  const cy = 92;
  const r = 74;
  const theta = Math.PI * (1 - progress);
  const sunX = cx + r * Math.cos(theta);
  const sunY = cy - r * Math.sin(theta);

  return (
    <section
      aria-label="Daylight and atmospheric conditions"
      className="h-full bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-slate-900">Daylight &amp; Atmosphere</h2>
          <span className="text-xs text-slate-500 tabular-nums font-mono">
            {daylightHours}h {daylightRemMins}m day
          </span>
        </div>

        {/* Daylight solar arc */}
        <div className="flex flex-col items-center pt-2 pb-4 border-b border-slate-100">
          <svg viewBox="0 0 240 108" className="w-full max-w-[260px] h-auto" aria-hidden="true">
            {/* Horizon baseline */}
            <line
              x1="20"
              y1={cy}
              x2="220"
              y2={cy}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Full arc track */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Elapsed daylight arc */}
            {isDaylight && (
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX.toFixed(1)} ${sunY.toFixed(1)}`}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {/* Sun position marker */}
            <circle
              cx={sunX}
              cy={sunY}
              r={isDaylight ? 6 : 4.5}
              fill={isDaylight ? '#F59E0B' : '#94A3B8'}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </svg>

          <div className="w-full max-w-[260px] flex items-center justify-between text-xs mt-1">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Sunrise size={14} className="text-amber-500" aria-hidden="true" />
              <span className="font-mono tabular-nums">{formatClockLabel(today.sunrise)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Sunset size={14} className="text-orange-500" aria-hidden="true" />
              <span className="font-mono tabular-nums">{formatClockLabel(today.sunset)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric summary rows */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 pt-5 text-sm">
        <div>
          <dt className="text-xs text-slate-500">UV Index Peak</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
            <span className="font-mono">{today.uvIndexMax.toFixed(1)}</span>
            <span className="ml-1.5 text-xs font-normal text-slate-500">
              {getUvLabel(today.uvIndexMax)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Pressure</dt>
          <dd className="mt-0.5 font-semibold font-mono tabular-nums text-slate-900">
            {Math.round(current.pressure)} hPa
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Cloud Cover</dt>
          <dd className="mt-0.5 font-semibold font-mono tabular-nums text-slate-900">
            {current.cloudCover}%
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Precipitation</dt>
          <dd className="mt-0.5 font-semibold font-mono tabular-nums text-slate-900">
            {current.precipitation.toFixed(1)} mm
          </dd>
        </div>
      </dl>
    </section>
  );
}
