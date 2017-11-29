const shell = require('shelljs');
const version = require('../package.json').version;
const cp = shell.cp, echo = shell.echo, sed = shell.sed;

shell.mkdir('-p', 'dist/stats');

const dirs = {
    'dist/sherlock/': '',
    'dist/sherlock-proxy/': 'extensions/sherlock-proxy/',
    'dist/sherlock-rxjs/': 'extensions/sherlock-rxjs/',
};

Object.keys(dirs).forEach(to => {
    const from = dirs[to];
    cp('LICENSE', to);
    cp(from + 'README.md', to);
    cp(from + 'package.json', to);
    sed('-i', '\"private\"\\: true', '\"private\": false', to + 'package.json');
    sed('-i', '0.0.0-PLACEHOLDER', version, to + 'package.json');
});
