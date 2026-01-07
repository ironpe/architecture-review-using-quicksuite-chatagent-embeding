import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.property.test.ts'],
    exclude: ['node_modules'],
    testTimeout: 30000, // Property tests may take longer
  },
});
