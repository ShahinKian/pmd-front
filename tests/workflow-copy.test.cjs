const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, require: name => dependencies[name],
  });
  return exports;
}
const source = { id: 'source', description: 'description', nodes: [
  { id: 'a', key: 'start', metadataJson: '{"designer":{"position":{"x":12,"y":24}}}', subWorkflowDefinitionId: null },
  { id: 'b', key: 'end', subWorkflowDefinitionId: 'other' },
], transitions: [{ id: 'edge', fromNodeId: 'a', toNodeId: 'b', name: 'next', outcome: 'yes', priority: 2 }] };
function setup(definition = source, fail = false) {
  const calls = [];
  const apiClient = { get: async () => ({ data: definition }), post: async (url, body) => {
    calls.push({ url, body });
    if (fail && url.endsWith('/transitions')) throw Error('network');
    return { data: { id: url === '/workflows' ? 'copy' : `new-${body.key}` } };
  } };
  return { ...load('lib/workflows/copy.ts', { '@/lib/http/client': { apiClient } }), calls };
}
test('copies metadata and remaps edges without activation or assignments', async () => {
  const { copyWorkflow, calls } = setup();
  assert.equal(await copyWorkflow('source', ' New '), 'copy');
  assert.equal(calls[0].body.name, 'New');
  assert.equal(calls[1].body.id, undefined);
  assert.equal(calls[1].body.metadataJson, source.nodes[0].metadataJson);
  assert.equal(calls[2].body.subWorkflowDefinitionId, 'other');
  assert.equal(calls[3].body.fromNodeId, 'new-start');
  assert.equal(calls[3].body.toNodeId, 'new-end');
  assert.equal(calls[3].body.outcome, 'yes');
  assert.equal(calls.length, 4);
});
test('invalid edges and empty names do not create drafts', async () => {
  const { copyWorkflow, calls } = setup({ ...source, transitions: [{ fromNodeId: 'missing', toNodeId: 'b' }] });
  await assert.rejects(copyWorkflow('source', 'New'));
  await assert.rejects(copyWorkflow('source', ' '));
  assert.equal(calls.length, 0);
});
test('partial failure exposes the created draft for recovery', async () => {
  const { copyWorkflow, WorkflowCopyError } = setup(source, true);
  await assert.rejects(copyWorkflow('source', 'New'), error => error instanceof WorkflowCopyError && error.workflowId === 'copy');
});
test('Persian search normalizes Arabic letters, diacritics and spacing', () => {
  const { normalizeSearch } = load('lib/base-info/search.ts');
  assert.equal(normalizeSearch('  علي كريمي  '), normalizeSearch('علی کریمی'));
  assert.equal(normalizeSearch('عَلِی'), normalizeSearch('علی'));
});
