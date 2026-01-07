import * as esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find all Lambda handler files
const handlersDir = './src/handlers';
const handlers = readdirSync(handlersDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => join(handlersDir, file));

// Build each handler as a separate bundle
await esbuild.build({
  entryPoints: handlers,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'dist/handlers',
  outExtension: { '.js': '.js' },
  sourcemap: true,
  external: [
    '@aws-sdk/*',
  ],
});

console.log('Lambda handlers built successfully');
