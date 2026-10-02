/**
 * client/src/context/index.ts
 * React context barrel.
 *
 * This project uses TanStack Query (React Query) for server state, which
 * eliminates the need for most Context providers. Global UI state lives in
 * hooks (see src/hooks/) rather than Context objects.
 *
 * Add new Context providers here as the app grows, for example:
 *   - ThemeContext (light / dark / system)
 *   - LocaleContext (language / currency formatting)
 *   - FeatureFlagContext (A/B tests, gradual rollouts)
 *
 * Example of how to add a new context:
 *
 *   // src/context/theme-context.tsx
 *   export const ThemeContext = createContext<ThemeContextValue>(defaultValue);
 *   export function ThemeProvider({ children }: { children: React.ReactNode }) { ... }
 *   export function useTheme() { return useContext(ThemeContext); }
 *
 *   // src/context/index.ts (here)
 *   export { ThemeProvider, useTheme } from './theme-context';
 */

// No context providers yet — see hooks/ for all global state.
export {};
