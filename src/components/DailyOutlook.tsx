import { Droplets } from 'lucide-react';
import type { DailyPoint, TempUnit } from '../types/weather';
import { describeWeatherCode, formatDayName, formatTemp } from '../utils/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface DailyOutlookProps {
  daily: DailyPoint[];
  unit: TempUnit;
}

export function DailyOutlook({ daily, unit }: DailyOutlookProps) {
  if (daily.length === 0) return null;

  const weekMin = Math.min(...daily.map((d) => d.tempMin));
  const weekMax = Math.max(...daily.map((d) => d.tempMax));
  const weekSpan = Math.max(weekMax - weekMin, 1);

  return (
    <section
      aria-label="7-day forecast"
      className="h-full bg-white border border-slate-200/80 rounded-2xl p-6"
    >
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-slate-900">7-Day Outlook</h2>
        <span className="text-xs text-slate-500">Daily low to high</span>
      </div>

      <div className="divide-y divide-slate-100">
        {daily.map((day, idx) => {
          const { day: dayLabel, shortDate } = formatDayName(day.date, idx);
          const { label: conditionLabel } = describeWeatherCode(day.weatherCode);
          const low = formatTemp(day.tempMin, unit);
          const high = formatTemp(day.tempMax, unit);

          const leftPct = ((day.tempMin - weekMin) / weekSpan) * 100;
          const widthPct = Math.max(((day.tempMax - day.tempMin) / weekSpan) * 100, 8);

          return (
            <div
              key={day.date}
              className="grid grid-cols-[minmax(88px,1fr)_auto_minmax(120px,2fr)] sm:grid-cols-[120px_1fr_72px_180px] items-center gap-3 py-3 first:pt-1 last:pb-1"
            >
              {/* Day + Date */}
              <div className="min-w-0">
                <div className={`text-sm font-medium ${idx === 0 ? 'text-sky-700' : 'text-slate-900'}`}>
                  {dayLabel}
                </div>
                <div className="text-xs text-slate-400 tabular-nums">{shortDate}</div>
              </div>

              {/* Icon + Condition */}
              <div className="flex items-center gap-2.5 min-w-0">
                <WeatherIcon code={day.weatherCode} isDay size={18} />
                <span className="hidden sm:inline text-sm text-slate-600 truncate">
                  {conditionLabel}
                </span>
              </div>

              {/* Precipitation probability */}
              <div className="hidden sm:flex items-center justify-end text-xs font-mono tabular-nums text-sky-600">
                {day.precipitationProbabilityMax >= 15 ? (
                  <span className="inline-flex items-center gap-1">
                    <Droplets size={12} aria-hidden="true" />
                    {day.precipitationProbabilityMax}%
                  </span>
                ) : (
                  <span className="text-slate-300">–</span>
                )}
              </div>

              {/* Proportional temperature range bar */}
              <div className="flex items-center gap-2.5 justify-end">
                <span className="w-8 text-right text-sm font-mono tabular-nums text-slate-500">
                  {low}°
                </span>
                <div className="relative flex-1 max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-amber-500"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.min(widthPct, 100 - leftPct)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {high}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
