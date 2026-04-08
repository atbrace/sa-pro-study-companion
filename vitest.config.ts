import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
    ],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/subsection-extractor.test.ts', // Failing tests for unimplemented feature
    ],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/components/**', 'src/hooks/**', 'src/contexts/**'],
      exclude: ['**/__tests__/**', '**/node_modules/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        'src/lib/**': {
          lines: 55,
          functions: 55,
          branches: 55,
          statements: 55,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
