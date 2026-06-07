#!/usr/bin/env node
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/axion.js',
  platform: 'node',
  format: 'esm',
  target: 'node18',
  jsx: 'automatic',
  // platform:node auto-externalises node built-ins; packages:external keeps
  // npm deps external so they resolve from wherever axion is installed.
  packages: 'external',
  alias: {
    // Ink's optional devtools file imports this at the top level — stub it out
    'react-devtools-core': './src/stubs/react-devtools-core.js',
  },
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});

console.log('Build complete → dist/axion.js');
