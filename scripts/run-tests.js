const shell = require('shelljs');
try {
    // If the terminal supports color we want our commands to use it.
    if (require('chalk').supportsColor) {
        shell.env['FORCE_COLOR'] = 1;
    }
} catch (e) { }

// Watch mode.
if (process.argv.indexOf('watch') >= 0) {
    shell.exec('nyc --reporter html --reporter text-summary --extension .ts --include "{src,extensions}/**/*.ts" --exclude "{src,extensions}/**/*.spec.ts" mocha --reporter landing -r ts-node/register -r tsconfig-paths/register "{src,extensions}/**/*.spec.ts" && rimraf .nyc_output');
    return;
}

const nyc = 'nyc --check-coverage --lines 98 --functions 98 --branches 98 --statements 98 --reporter lcov --reporter text-summary --include "dist/**/*.js" --exclude "**/*.spec.js" ';
const mocha = 'mocha -r scripts/tsconfig-paths-test.js --forbid-only "dist/**/*.spec.js"';
// Exclude the sherlock-proxy extension in environments where Proxy is not available
const command = typeof Proxy === 'undefined'
    ? nyc + '--exclude "dist/sherlock-proxy/**" ' + mocha
    : nyc + mocha;

process.exit(shell.exec(command).code);
