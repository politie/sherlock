import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import visualizer from 'rollup-plugin-visualizer';

const libs = ['sherlock', 'sherlock-proxy', 'sherlock-rxjs'];

export default [].concat.apply([], libs.map(lib => {
    const pkg = require(`./dist/${lib}/package.json`);
    return [
        // browser-friendly UMD build
        {
            input: `dist/${lib}/index.js`,
            output: { file: `dist/${lib}/${pkg.browser}`, format: 'umd' },
            external: [
                '@politie/informant',
                '@politie/sherlock',
                'rxjs/Observable',
            ],
            globals: {
                '@politie/informant': 'informant',
                '@politie/sherlock': 'sherlock',
                'rxjs/Observable': 'Rx',
            },
            name: lib,
            sourcemap: true,
            plugins: [
                sourcemaps(),
                commonjs(),
                resolve(),
                visualizer({ filename: `dist/stats/${lib}.umd.html` }),
            ],
        },

        // CommonJS (for Node) and ES module (for bundlers) build.
        {
            input: `dist/${lib}/index.js`,
            external: ['@politie/informant', '@politie/sherlock', 'tslib', 'rxjs/Observable'],
            output: [
                { file: `dist/${lib}/${pkg.main}`, format: 'cjs' },
                { file: `dist/${lib}/${pkg.module}`, format: 'es' },
            ],
            sourcemap: true,
            plugins: [
                sourcemaps(),
                resolve(),
                visualizer({ filename: `dist/stats/${lib}.html` }),
            ],
        },
    ];
}));
