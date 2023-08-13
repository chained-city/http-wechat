import { defineConfig } from '@lough/build-cli';

export default defineConfig({
  external: ['@chained/http'],
  globals: { '@chained/http': 'chainedHttp' },
  terser: false,
  style: false,
  input: 'src/index.ts'
});
