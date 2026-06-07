#!/usr/bin/env node
import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, 'dist/web');

// Ensure output dir exists
mkdirSync(OUT_DIR, { recursive: true });

// Copy HTML
cpSync(join(__dirname, 'src/web/client/index.html'), join(OUT_DIR, 'index.html'));

// Bundle React client
await build({
  entryPoints: ['src/web/client/main.jsx'],
  bundle:      true,
  outfile:     'dist/web/bundle.js',
  platform:    'browser',
  format:      'esm',
  jsx:         'automatic',
  define:      { 'process.env.NODE_ENV': '"production"' },
  minify:      false,
  logLevel:    'info',
});

console.log('Web client built → dist/web/');
