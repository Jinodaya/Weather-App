import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react';
import { describeWeatherCode } from '../utils/weatherCodes';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  size?: number;
}

export function WeatherIcon({
  code,
  isDay = true,
  className = '',
  size = 20,
}: WeatherIconProps) {
  const { category } = describeWeatherCode(code);

  switch (category) {
    case 'clear':
      return isDay ? (
        <Sun
          size={size}
          className={`text-amber-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      ) : (
        <Moon
          size={size}
          className={`text-indigo-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'partly-cloudy':
      return isDay ? (
        <CloudSun
          size={size}
          className={`text-amber-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      ) : (
        <CloudMoon
          size={size}
          className={`text-slate-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'cloudy':
      return (
        <Cloud
          size={size}
          className={`text-slate-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'fog':
      return (
        <CloudFog
          size={size}
          className={`text-slate-400 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'drizzle':
      return (
        <CloudDrizzle
          size={size}
          className={`text-sky-500 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'rain':
      return (
        <CloudRain
          size={size}
          className={`text-sky-600 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'snow':
      return (
        <CloudSnow
          size={size}
          className={`text-cyan-600 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    case 'storm':
      return (
        <CloudLightning
          size={size}
          className={`text-amber-600 shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
  }
}
