const ts = require('@rollup/plugin-typescript');
const nodeResolve = require('@rollup/plugin-node-resolve');

module.exports = [
  {
    input: 'src/index.ts',
    external: ['@minecraft/server', '@minecraft/server-ui', '@mine-scripters/minecraft-script-dialogue'],
    output: [
      {
        file: 'dist/MinecraftEventDrivenForm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [ts(), nodeResolve()],
  },
];
