import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/custom-element.js',
  output: {
    file: './dist/custom-element.min.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [terser()],
};
