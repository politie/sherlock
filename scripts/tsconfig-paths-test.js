const { dirname, resolve } = require('path');
const { outDir } = require('./tsconfig.base.json').compilerOptions;
require('tsconfig-paths').register({
    baseUrl: resolve(dirname(module.filename), outDir),
    paths: require('../tsconfig.json').compilerOptions.paths,
});
