import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.property.test.ts'],
    exclude: ['node_modules'],
    testTimeout: 30000, // Property tests may take longer
  },
});
