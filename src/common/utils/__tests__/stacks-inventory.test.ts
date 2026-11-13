/** @jest-environment node */
import { execFileSync } from 'child_process';
import fs from 'fs';
import ts from 'typescript';

import inventory from '../../../../docs/behavior/stacks-inventory.json';

const { scan, scanBoundaries } = require('../../../../stacks-kit-migration/scan-boundaries.cjs');
function testTitles(file: string) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const titles: string[] = [];
  const root = (node: ts.Node): string | undefined =>
    ts.isIdentifier(node)
      ? node.text
      : ts.isCallExpression(node) || ts.isPropertyAccessExpression(node)
        ? root(node.expression)
        : undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ['it', 'test'].includes(root(node.expression) || '')) {
      const title = node.arguments[0];
      if (title && (ts.isStringLiteralLike(title) || ts.isTemplateExpression(title)))
        titles.push(title.getText(ast).slice(1, -1));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return titles;
}
it('inventories every runtime SDK value site with a boundary and an existing proof', () => {
  expect(inventory.sites.map(({ flow, proofs, ...site }) => site)).toEqual(scan());
  expect(inventory.boundaries.map(({ flow, proofs, ...site }) => site)).toEqual(scanBoundaries());
  const titles = new Map<string, string[]>();
  for (const site of [...inventory.sites, ...inventory.boundaries]) {
    expect(site.flow.length).toBeGreaterThan(20);
    expect(site.proofs.length).toBeGreaterThan(0);
    for (const proof of site.proofs) {
      expect(fs.existsSync(proof.file)).toBe(true);
      if (!titles.has(proof.file)) titles.set(proof.file, testTitles(proof.file));
      expect(titles.get(proof.file)!.some(title => title.includes(proof.test))).toBe(true);
    }
  }
});

it('maintainer inventory covers all SDK and wrapper imports with live proofs', () => {
  expect(() =>
    execFileSync(process.execPath, ['stacks-kit-migration/check-coverage.mjs', '--force'], {
      stdio: 'pipe',
    })
  ).not.toThrow();
});
