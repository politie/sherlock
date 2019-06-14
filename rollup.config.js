import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';

const libs = ['sherlock', 'sherlock-proxy', 'sherlock-rxjs', 'sherlock-utils'];

const oldVersion = process.version.startsWith('v8');

export default [].concat.apply([], libs.map(lib => {
    const pkg = require(`./dist/${lib}/package.json`);
    return [
        // browser-friendly UMD build
        {
            input: `dist/${lib}/index.js`,
            output: {
                file: `dist/${lib}/${pkg.browser}`,
                format: 'umd',
                name: pascal(lib),
                sourcemap: true,
                globals: {
                    '@politie/sherlock': 'Sherlock',
                    'rxjs': 'Rx',
                },
            },
            external: [
                '@politie/sherlock',
                'rxjs',
            ],
            plugins: [
                sourcemaps(),
                commonjs(),
                resolve(),
                ...(oldVersion ? [] : [require('rollup-plugin-visualizer')({ filename: `dist/stats/${lib}.umd.html` })]),
            ],
        },

        // CommonJS (for Node) and ES module (for bundlers) build.
        {
            input: `dist/${lib}/index.js`,
            external: ['@politie/sherlock', 'tslib', 'rxjs'],
            output: [
                { sourcemap: true, file: `dist/${lib}/${pkg.main}`, format: 'cjs' },
                { sourcemap: true, file: `dist/${lib}/${pkg.module}`, format: 'es' },
            ],
            plugins: [
                sourcemaps(),
                resolve(),
                ...(oldVersion ? [] : [require('rollup-plugin-visualizer')({ filename: `dist/stats/${lib}.html` })]),
            ],
        },
    ];
}));

function pascal(name) {
    const parts = name.split('-');
    return parts.map(part => part[0].toUpperCase() + part.substr(1)).join('');
}
