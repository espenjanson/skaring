// Load source modules using the project's existing TypeScript dependency without emitting files.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const cache = new Map()
function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, '../../src', relativePath)
  if (cache.has(filename)) return cache.get(filename).exports
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  const loaded = { exports: {} }
  cache.set(filename, loaded)
  const localRequire = name => {
    if (!name.startsWith('.')) throw new Error(`Unexpected runtime dependency: ${name}`)
    return loadTypeScript(path.relative(path.resolve(__dirname, '../../src'), path.resolve(path.dirname(filename), name + '.ts')))
  }
  new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire)
  return loaded.exports
}

module.exports = { loadTypeScript }
