// Compile only the new clinical adapter; existing simulation modules stay read-only.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'clinical-simulate.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const loaded = { exports: {} };
const localRequire = name => {
  if (name === './simulate') return require('./run.cjs');
  if (name === './main-simulate') return require('./main-run.cjs');
  if (name.startsWith('../src/')) return require('../tests/helpers/loadTypeScript.cjs').loadTypeScript(name.slice('../src/'.length) + '.ts');
  return require(name);
};
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire);
module.exports = loaded.exports;
if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('Usage: node simulation/clinical-run.cjs');
  loaded.exports.deliverClinical(__dirname);
}
