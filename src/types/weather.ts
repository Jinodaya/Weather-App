export type TempUnit = 'C' | 'F';

export interface LocationItem {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature: number; // Celsius from API
  apparentTemperature: number; // Celsius from API
  humidity: number;
  isDay: boolean;
  precipitation: number; // mm
  weatherCode: number;
  cloudCover: number;
  pressure: number; // hPa
  windSpeed: number; // km/h
  windDirection: number; // degrees
}

export interface HourlyPoint {
  time: string;
  temperature: number; // Celsius
  precipitationProbability: number;
  weatherCode: number;
  isDay: boolean;
}

export interface DailyPoint {
  date: string;
  weatherCode: number;
  tempMax: number; // Celsius
  tempMin: number; // Celsius
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}
