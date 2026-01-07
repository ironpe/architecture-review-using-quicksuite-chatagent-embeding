import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/lambda.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/lambda.js',
  sourcemap: true,
  external: ['@aws-sdk/*'],
});

console.log('MCP Server Lambda built successfully');
