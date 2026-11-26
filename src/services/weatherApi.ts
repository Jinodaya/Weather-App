import type { LocationItem, WeatherData } from '../types/weather';

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<LocationItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '6');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error('Unable to search locations right now.');
  }

  const data = (await res.json()) as { results?: GeocodingResult[] };
  if (!data.results) return [];

  return data.results.map((item) => ({
    id: `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`,
    name: item.name,
    admin1: item.admin1,
    country: item.country,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
  }));
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<LocationItem> {
  const fallback: LocationItem = {
    id: `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
    name: 'Current Location',
    country: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    latitude,
    longitude,
  };

  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('localityLanguage', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };

    const cityName = data.city || data.locality || data.principalSubdivision;
    if (!cityName) return fallback;

    return {
      id: `${latitude.toFixed(3)},${longitude.toFixed(3)}`,
      name: cityName,
      admin1: data.principalSubdivision !== cityName ? data.principalSubdivision : undefined,
      country: data.countryName,
      latitude,
      longitude,
    };
  } catch {
    return fallback;
  }
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(',')
  );
  url.searchParams.set(
    'hourly',
    ['temperature_2m', 'precipitation_probability', 'weather_code', 'is_day'].join(',')
  );
  url.searchParams.set(
    'daily',
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(',')
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error('Failed to load weather forecast.');
  }

  const raw = await res.json();

  const current = {
    time: raw.current.time as string,
    temperature: raw.current.temperature_2m as number,
    apparentTemperature: raw.current.apparent_temperature as number,
    humidity: raw.current.relative_humidity_2m as number,
    isDay: raw.current.is_day === 1,
    precipitation: raw.current.precipitation as number,
    weatherCode: raw.current.weather_code as number,
    cloudCover: raw.current.cloud_cover as number,
    pressure: raw.current.surface_pressure as number,
    windSpeed: raw.current.wind_speed_10m as number,
    windDirection: raw.current.wind_direction_10m as number,
  };

  // Find current hour index in hourly array so we show the next 24 hours from now
  const currentTimePrefix = current.time.slice(0, 13); // "YYYY-MM-DDTHH"
  const hourlyTimes: string[] = raw.hourly.time;
  let startIndex = hourlyTimes.findIndex((t) => t.startsWith(currentTimePrefix));
  if (startIndex < 0) startIndex = 0;

  const hourly = hourlyTimes
    .slice(startIndex, startIndex + 24)
    .map((time, idx) => {
      const i = startIndex + idx;
      return {
        time,
        temperature: raw.hourly.temperature_2m[i] as number,
        precipitationProbability: (raw.hourly.precipitation_probability[i] as number) ?? 0,
        weatherCode: raw.hourly.weather_code[i] as number,
        isDay: raw.hourly.is_day[i] === 1,
      };
    });

  const daily = (raw.daily.time as string[]).map((date, i) => ({
    date,
    weatherCode: raw.daily.weather_code[i] as number,
    tempMax: raw.daily.temperature_2m_max[i] as number,
    tempMin: raw.daily.temperature_2m_min[i] as number,
    sunrise: raw.daily.sunrise[i] as string,
    sunset: raw.daily.sunset[i] as string,
    uvIndexMax: (raw.daily.uv_index_max[i] as number) ?? 0,
    precipitationProbabilityMax: (raw.daily.precipitation_probability_max[i] as number) ?? 0,
    windSpeedMax: (raw.daily.wind_speed_10m_max[i] as number) ?? 0,
  }));

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds ?? 0,
    current,
    hourly,
    daily,
  };
}
