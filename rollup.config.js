import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/index.js',
  output: {
    file: './dist/custom-element.min.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [terser({ keep_fnames: /EffectRunner$|^[A-Z]/ })],
};
