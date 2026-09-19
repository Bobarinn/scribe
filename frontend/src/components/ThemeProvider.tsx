'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * App-wide theme provider. Toggles the `dark` class on <html> (Tailwind
 * `darkMode: 'class'`), follows the OS appearance by default, persists the
 * user's manual choice, and avoids a flash on load.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
