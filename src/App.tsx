import { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  LocateFixed,
  RefreshCw,
  X,
} from 'lucide-react';
import { DailyOutlook } from './components/DailyOutlook';
import { DaylightCard } from './components/DaylightCard';
import { HourlyTimeline } from './components/HourlyTimeline';
import { LocationSearch } from './components/LocationSearch';
import { WeatherIcon } from './components/WeatherIcon';
import { fetchWeather, reverseGeocodeLocation } from './services/weatherApi';
import type { LocationItem, TempUnit, WeatherData } from './types/weather';
import {
  describeWeatherCode,
  formatCityLocalTime,
  formatCompassDirection,
  formatTemp,
  formatWindSpeed,
} from './utils/weatherCodes';

const DEFAULT_LOCATIONS: LocationItem[] = [
  {
    id: '37.775,-122.419',
    name: 'San Francisco',
    admin1: 'California',
    country: 'United States',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    id: '40.713,-74.006',
    name: 'New York',
    admin1: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: '51.507,-0.128',
    name: 'London',
    admin1: 'England',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: '35.676,139.650',
    name: 'Tokyo',
    admin1: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
  },
];

const STORAGE_UNIT_KEY = 'clearcast:unit';
const STORAGE_SAVED_KEY = 'clearcast:saved_locations';
const STORAGE_ACTIVE_KEY = 'clearcast:active_location';

function loadSavedLocations(): LocationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_KEY);
    if (!raw) return DEFAULT_LOCATIONS;
    const parsed = JSON.parse(raw) as LocationItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOCATIONS;
  } catch {
    return DEFAULT_LOCATIONS;
  }
}

function loadActiveLocation(saved: LocationItem[]): LocationItem {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (!raw) return saved[0];
    const parsed = JSON.parse(raw) as LocationItem;
    return parsed?.name ? parsed : saved[0];
  } catch {
    return saved[0];
  }
}

function loadTempUnit(): TempUnit {
  try {
    const raw = localStorage.getItem(STORAGE_UNIT_KEY);
    return raw === 'F' ? 'F' : 'C';
  } catch {
    return 'C';
  }
}

function getHeroAtmosphereClass(code: number, isDay: boolean): string {
  const { category } = describeWeatherCode(code);
  if (!isDay) {
    return 'from-slate-900/[0.04] via-white to-white';
  }
  switch (category) {
    case 'clear':
      return 'from-sky-500/[0.07] via-amber-400/[0.03] to-white';
    case 'partly-cloudy':
      return 'from-sky-500/[0.05] via-white to-white';
    case 'rain':
    case 'drizzle':
    case 'storm':
      return 'from-sky-700/[0.06] via-slate-500/[0.03] to-white';
    default:
      return 'from-slate-500/[0.05] via-white to-white';
  }
}

export default function App() {
  const [savedLocations, setSavedLocations] = useState<LocationItem[]>(loadSavedLocations);
  const [activeLocation, setActiveLocation] = useState<LocationItem>(() =>
    loadActiveLocation(loadSavedLocations())
  );
  const [unit, setUnit] = useState<TempUnit>(loadTempUnit);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  // Persist user preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_UNIT_KEY, unit);
    } catch {
      // Ignore storage quota errors
    }
  }, [unit]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(savedLocations));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedLocations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(activeLocation));
    } catch {
      // Ignore storage quota errors
    }
  }, [activeLocation]);

  // Fetch weather whenever activeLocation or reloadNonce changes
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchWeather(activeLocation.latitude, activeLocation.longitude, controller.signal)
      .then((data) => {
        setWeather(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setError('Unable to load the forecast right now. Please check your connection and try again.');
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeLocation.latitude, activeLocation.longitude, reloadNonce]);

  const handleSelectLocation = useCallback((loc: LocationItem) => {
    setLocationNotice(null);
    setActiveLocation(loc);
  }, []);

  const isCurrentSaved = savedLocations.some((l) => l.id === activeLocation.id);

  const handleToggleSaveLocation = () => {
    if (isCurrentSaved) {
      if (savedLocations.length <= 1) return;
      setSavedLocations((prev) => prev.filter((l) => l.id !== activeLocation.id));
    } else {
      setSavedLocations((prev) => [activeLocation, ...prev].slice(0, 8));
    }
  };

  const handleRemoveSaved = (id: string) => {
    if (savedLocations.length <= 1) return;
    setSavedLocations((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (activeLocation.id === id && next[0]) {
        setActiveLocation(next[0]);
      }
      return next;
    });
  };

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationNotice('Location access is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocodeLocation(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setActiveLocation(loc);
        } catch {
          setLocationNotice('Could not determine your city name.');
        } finally {
          setIsLocating(false);
        }
      },
      (geoErr) => {
        setIsLocating(false);
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setLocationNotice('Location permission was declined. Search for a city above instead.');
        } else {
          setLocationNotice('Unable to acquire your current position.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const cityRegion = [activeLocation.admin1, activeLocation.country]
    .filter(Boolean)
    .join(', ');

  const localTime = weather
    ? formatCityLocalTime(weather.utcOffsetSeconds)
    : null;
  const condition = weather
    ? describeWeatherCode(weather.current.weatherCode)
    : null;
  const todayDaily = weather?.daily[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-[#F5F7FA]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setReloadNonce((n) => n + 1);
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Clearcast
          </a>

          {/* Zone 2: City Search */}
          <div className="flex-1 flex justify-center min-w-0">
            <LocationSearch onSelectLocation={handleSelectLocation} />
          </div>

          {/* Zone 3: Primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-2 h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <LocateFixed
                size={15}
                className={isLocating ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {isLocating ? 'Locating...' : 'My Location'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Workspace Toolbar: Saved cities + Unit Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full"
            role="navigation"
            aria-label="Saved cities"
          >
            {savedLocations.map((loc) => {
              const isActive = loc.id === activeLocation.id;
              return (
                <div
                  key={loc.id}
                  className={`inline-flex items-center rounded-lg border text-xs font-medium transition-colors shrink-0 ${
                    isActive
                      ? 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className="px-3 py-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-600 rounded-lg"
                  >
                    {loc.name}
                  </button>
                  {savedLocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSaved(loc.id)}
                      aria-label={`Remove ${loc.name}`}
                      className="pr-2 pl-0.5 py-1.5 text-slate-400 hover:text-slate-700 rounded-r-lg focus-visible:outline-2 focus-visible:outline-sky-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              disabled={isLoading}
              aria-label="Refresh forecast"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'animate-spin' : ''}
                aria-hidden="true"
              />
            </button>

            <div
              className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg"
              role="group"
              aria-label="Temperature unit"
            >
              <button
                type="button"
                onClick={() => setUnit('C')}
                aria-pressed={unit === 'C'}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  unit === 'C'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => setUnit('F')}
                aria-pressed={unit === 'F'}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  unit === 'F'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                °F
              </button>
            </div>
          </div>
        </div>

        {/* Geolocation notice if applicable */}
        {locationNotice && (
          <div
            role="status"
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl"
          >
            <span>{locationNotice}</span>
            <button
              type="button"
              onClick={() => setLocationNotice(null)}
              aria-label="Dismiss notice"
              className="p-1 text-amber-700 hover:text-amber-950 rounded-md"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div
            role="alert"
            className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4"
          >
            <p className="text-base font-medium text-slate-900">{error}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Try Again
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !weather && (
          <div className="space-y-6 animate-pulse" aria-label="Loading forecast">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 h-[248px]" />
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 h-[220px]" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 h-[380px]" />
              <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 h-[380px]" />
            </div>
          </div>
        )}

        {/* Populated Forecast */}
        {weather && condition && localTime && !error && (
          <div className={`space-y-6 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
            {/* Hero Current Weather Card */}
            <section
              aria-label="Current weather conditions"
              className={`bg-gradient-to-br ${getHeroAtmosphereClass(
                weather.current.weatherCode,
                weather.current.isDay
              )} border border-slate-200/80 rounded-2xl p-6 sm:p-8`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Location, Current Temp, Condition */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
                        {activeLocation.name}
                      </h1>
                      <p className="text-sm text-slate-500 mt-1 tabular-nums">
                        {cityRegion && (
                          <>
                            <span>{cityRegion}</span>
                            <span aria-hidden="true"> · </span>
                          </>
                        )}
                        <span>{localTime.dateStr}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono text-slate-600">{localTime.timeStr}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSaveLocation}
                      disabled={isCurrentSaved && savedLocations.length <= 1}
                      aria-label={isCurrentSaved ? 'Remove from saved cities' : 'Save city'}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                        isCurrentSaved
                          ? 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100 disabled:opacity-50'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Bookmark
                        size={13}
                        className={isCurrentSaved ? 'fill-sky-600 text-sky-600' : ''}
                        aria-hidden="true"
                      />
                      <span>{isCurrentSaved ? 'Saved' : 'Save City'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                      <WeatherIcon
                        code={weather.current.weatherCode}
                        isDay={weather.current.isDay}
                        size={52}
                      />
                      <div className="text-6xl sm:text-7xl font-bold tracking-tight font-mono tabular-nums text-slate-900 leading-none">
                        {formatTemp(weather.current.temperature, unit)}°
                        <span className="text-3xl sm:text-4xl font-medium text-slate-400 ml-0.5">
                          {unit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-slate-900">
                        {condition.label}
                      </div>
                      <div className="text-sm text-slate-600 tabular-nums">
                        Feels like{' '}
                        <span className="font-mono font-medium text-slate-800">
                          {formatTemp(weather.current.apparentTemperature, unit)}°{unit}
                        </span>
                        {todayDaily && (
                          <>
                            <span aria-hidden="true"> · </span>
                            High{' '}
                            <span className="font-mono font-medium text-slate-800">
                              {formatTemp(todayDaily.tempMax, unit)}°
                            </span>
                            <span aria-hidden="true"> / </span>
                            Low{' '}
                            <span className="font-mono font-medium text-slate-800">
                              {formatTemp(todayDaily.tempMin, unit)}°
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: 2x2 Key Metrics separated cleanly with hairlines */}
                <dl className="lg:col-span-5 grid grid-cols-2 border-t lg:border-t-0 lg:border-l border-slate-200/80 pt-5 lg:pt-0 lg:pl-8 gap-x-6 gap-y-5">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Wind</dt>
                    <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                      {formatWindSpeed(weather.current.windSpeed, unit)}
                      <span className="ml-1.5 text-xs font-sans font-medium text-slate-500">
                        {formatCompassDirection(weather.current.windDirection)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Humidity</dt>
                    <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                      {weather.current.humidity}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Rain Chance Today</dt>
                    <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                      {todayDaily ? `${todayDaily.precipitationProbabilityMax}%` : '–'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Peak Wind</dt>
                    <dd className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                      {todayDaily ? formatWindSpeed(todayDaily.windSpeedMax, unit) : '–'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* 24-Hour Curve & Timeline */}
            <HourlyTimeline hourly={weather.hourly} unit={unit} />

            {/* Bottom 2-Column Split: 7-Day Outlook + Daylight & Atmosphere */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7">
                <DailyOutlook daily={weather.daily} unit={unit} />
              </div>
              <div className="lg:col-span-5">
                <DaylightCard
                  today={todayDaily}
                  current={weather.current}
                  minutesSinceMidnight={localTime.minutesSinceMidnight}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>Clearcast Weather</span>
        <span>Live meteorological data by Open-Meteo</span>
      </footer>
    </div>
  );
}
