'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

type ThemeOption = {
  value: string;
  label: string;
  icon: typeof Sun;
};

const OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Appearance control: Light / Dark / System. Backed by next-themes, which
 * toggles the `dark` class on <html>, persists the choice, and follows the OS
 * when set to System. Rendered as a compact segmented control so it fits inside
 * the General tab without taking a full section.
 */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: the resolved theme is only known on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? theme ?? 'system' : undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
            <Palette className="w-5 h-5 text-primary" />
            Appearance
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose how Scribe looks. System follows your macOS setting.
          </p>
        </div>

        <div className="inline-flex shrink-0 rounded-lg border border-border bg-secondary/60 p-1">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = active === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                aria-pressed={isActive}
                title={option.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
