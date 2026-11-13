// Compile the standalone tool in memory using the project's existing compiler.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.join(__dirname, 'simulate.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const loaded = { exports: {} };
const localRequire = name => name.startsWith('../src/')
  ? require('../tests/helpers/loadTypeScript.cjs').loadTypeScript(name.slice('../src/'.length) + '.ts')
  : require(name);
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire);
module.exports = loaded.exports;
if (require.main === module) {
  if (process.argv.length !== 4 || process.argv[2] !== '--sigma') {
    throw new Error('Usage: node simulation/run.cjs --sigma <selected standard deviation>');
  }
  const sigma = Number(process.argv[3]);
  if (!Number.isFinite(sigma) || sigma < 0) throw new Error('Sigma must be finite and nonnegative');
  loaded.exports.deliver(__dirname, sigma);
}
