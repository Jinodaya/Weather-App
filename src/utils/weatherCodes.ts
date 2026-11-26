import type { TempUnit } from '../types/weather';

export type WeatherCategory =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export interface WeatherDescription {
  label: string;
  category: WeatherCategory;
}

const WMO_CODES: Record<number, WeatherDescription> = {
  0: { label: 'Clear Sky', category: 'clear' },
  1: { label: 'Mainly Clear', category: 'clear' },
  2: { label: 'Partly Cloudy', category: 'partly-cloudy' },
  3: { label: 'Overcast', category: 'cloudy' },
  45: { label: 'Fog', category: 'fog' },
  48: { label: 'Depositing Rime Fog', category: 'fog' },
  51: { label: 'Light Drizzle', category: 'drizzle' },
  53: { label: 'Moderate Drizzle', category: 'drizzle' },
  55: { label: 'Dense Drizzle', category: 'drizzle' },
  56: { label: 'Freezing Drizzle', category: 'drizzle' },
  57: { label: 'Heavy Freezing Drizzle', category: 'drizzle' },
  61: { label: 'Light Rain', category: 'rain' },
  63: { label: 'Moderate Rain', category: 'rain' },
  65: { label: 'Heavy Rain', category: 'rain' },
  66: { label: 'Freezing Rain', category: 'rain' },
  67: { label: 'Heavy Freezing Rain', category: 'rain' },
  71: { label: 'Light Snow', category: 'snow' },
  73: { label: 'Moderate Snow', category: 'snow' },
  75: { label: 'Heavy Snow', category: 'snow' },
  77: { label: 'Snow Grains', category: 'snow' },
  80: { label: 'Light Showers', category: 'rain' },
  81: { label: 'Moderate Showers', category: 'rain' },
  82: { label: 'Heavy Showers', category: 'rain' },
  85: { label: 'Snow Showers', category: 'snow' },
  86: { label: 'Heavy Snow Showers', category: 'snow' },
  95: { label: 'Thunderstorm', category: 'storm' },
  96: { label: 'Thunderstorm with Hail', category: 'storm' },
  99: { label: 'Severe Thunderstorm', category: 'storm' },
};

export function describeWeatherCode(code: number): WeatherDescription {
  return WMO_CODES[code] ?? { label: 'Variable Sky', category: 'partly-cloudy' };
}

export function formatTemp(celsius: number, unit: TempUnit): number {
  if (unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

export function formatWindSpeed(kmh: number, unit: TempUnit): string {
  if (unit === 'F') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatCompassDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return dirs[index];
}

export function getUvLabel(uv: number): string {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

export function formatCityLocalTime(utcOffsetSeconds: number): {
  timeStr: string;
  dateStr: string;
  minutesSinceMidnight: number;
} {
  const nowUtcMs = Date.now();
  const cityLocalMs = nowUtcMs + utcOffsetSeconds * 1000;
  const d = new Date(cityLocalMs);

  const hours24 = d.getUTCHours();
  const mins = d.getUTCMinutes();
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const timeStr = `${hours12}:${String(mins).padStart(2, '0')} ${period}`;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dateStr = `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;

  return {
    timeStr,
    dateStr,
    minutesSinceMidnight: hours24 * 60 + mins,
  };
}

export function formatHourLabel(isoLocalTime: string): string {
  // Open-Meteo returns "YYYY-MM-DDTHH:MM" in the location's local time
  const timePart = isoLocalTime.split('T')[1] ?? '00:00';
  const hour24 = parseInt(timePart.split(':')[0], 10);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12} ${period}`;
}

export function formatClockLabel(isoLocalTime: string): string {
  const timePart = isoLocalTime.split('T')[1] ?? '00:00';
  const [hStr, mStr] = timePart.split(':');
  const hour24 = parseInt(hStr, 10);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${mStr} ${period}`;
}

export function getMinutesFromIso(isoLocalTime: string): number {
  const timePart = isoLocalTime.split('T')[1] ?? '00:00';
  const [hStr, mStr] = timePart.split(':');
  return parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
}

export function formatDayName(isoDate: string, index: number): {
  day: string;
  shortDate: string;
} {
  if (index === 0) {
    const [, m, d] = isoDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { day: 'Today', shortDate: `${months[(m - 1) % 12]} ${d}` };
  }
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: weekdays[dateObj.getUTCDay()],
    shortDate: `${months[dateObj.getUTCMonth()]} ${d}`,
  };
}
