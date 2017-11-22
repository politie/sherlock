const shell = require('shelljs');
const cp = shell.cp, echo = shell.echo, sed = shell.sed;

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
    echo('*.spec.*').to(to + '.npmignore');
    sed('-i', '\"private\"\\: true', '\"private\": false', to + 'package.json')
});
