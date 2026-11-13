// Load the new standalone entry point without editing or emitting any pilot module.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'main-simulate.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const loaded = { exports: {} };
const localRequire = name => {
  if (name === './simulate') return require('./run.cjs');
  if (name.startsWith('../src/')) {
    return require('../tests/helpers/loadTypeScript.cjs').loadTypeScript(name.slice('../src/'.length) + '.ts');
  }
  return require(name);
};
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire);
module.exports = loaded.exports;
if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('Usage: node simulation/main-run.cjs');
  loaded.exports.deliverMain(__dirname);
}
