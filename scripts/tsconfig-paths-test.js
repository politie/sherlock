const path = require('path');
const outDir = require('./tsconfig.base.json').compilerOptions.outDir;
require('tsconfig-paths').register({
    baseUrl: path.resolve(path.dirname(module.filename), outDir),
    paths: require('../tsconfig.json').compilerOptions.paths,
});
