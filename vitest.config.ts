import { defineConfig } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

// Dedicated vitest config — deliberately does NOT load the TanStack Start /
// Nitro plugins from vite.config.ts (those pull a full SSR build graph that's
// unnecessary and slow for unit tests). We only need the `@/*` path alias.
export default defineConfig({
    plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] })],
    test: {
        environment: 'node',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
})
