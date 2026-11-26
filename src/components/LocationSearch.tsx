import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { searchLocations } from '../services/weatherApi';
import type { LocationItem } from '../types/weather';

interface LocationSearchProps {
  onSelectLocation: (location: LocationItem) => void;
}

export function LocationSearch({ onSelectLocation }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: press "/" to focus search
  useEffect(() => {
    const handleGlobalKey = (e: globalThis.KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const matches = await searchLocations(trimmed, controller.signal);
        setResults(matches);
        setActiveIndex(matches.length > 0 ? 0 : -1);
        setIsOpen(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Search unavailable');
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (location: LocationItem) => {
    onSelectLocation(location);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3.5 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (results.length > 0 || query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search city or region..."
          aria-label="Search city or region"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full h-10 pl-10 pr-10 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-500 border border-transparent focus:border-sky-500/50 rounded-xl outline-none transition-colors"
        />
        {isLoading ? (
          <Loader2
            size={15}
            className="absolute right-3.5 text-slate-400 animate-spin"
            aria-hidden="true"
          />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-md focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block absolute right-3 text-[11px] font-mono text-slate-400 pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          {error ? (
            <div className="px-4 py-3 text-sm text-rose-600">{error}</div>
          ) : results.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No matching cities found for &ldquo;{query.trim()}&rdquo;
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {results.map((loc, idx) => {
                const subline = [loc.admin1, loc.country].filter(Boolean).join(', ');
                const isActive = idx === activeIndex;
                return (
                  <li key={`${loc.id}-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(loc)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-sky-50 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin
                          size={15}
                          className={isActive ? 'text-sky-600 shrink-0' : 'text-slate-400 shrink-0'}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{loc.name}</div>
                          {subline && (
                            <div className="text-xs text-slate-500 truncate">{subline}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                        {loc.latitude.toFixed(1)}°, {loc.longitude.toFixed(1)}°
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
