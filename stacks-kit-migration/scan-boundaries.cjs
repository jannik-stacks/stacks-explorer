const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const sdkPattern = /^(?:@stacks\/|@leather\.io\/|bns-v2-sdk$|c32check$)/;
function sources(root = 'src') {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .flatMap(entry => {
      const file = path.posix.join(root, entry.name);
      if (/__tests__|__snapshots__|\/fixtures|\/test-utils/.test(file)) return [];
      return entry.isDirectory() ? sources(file) : /(?<!\.d)\.tsx?$/.test(file) ? [file] : [];
    })
    .sort();
}
function runtimeImports(ast) {
  const imports = new Map();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !sdkPattern.test(statement.moduleSpecifier.text))
      continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name)
      imports.set(clause.name.text, { package: statement.moduleSpecifier.text, symbol: 'default' });
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings))
      imports.set(bindings.name.text, { package: statement.moduleSpecifier.text, symbol: '*' });
    for (const item of bindings?.elements ?? []) {
      if (!item.isTypeOnly)
        imports.set(item.name.text, {
          package: statement.moduleSpecifier.text,
          symbol: item.propertyName?.text ?? item.name.text,
        });
    }
  }
  return imports;
}
function scan(root = 'src') {
  const sites = [];
  for (const file of sources(root)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!/@stacks\/|@leather\.io\/|bns-v2-sdk|c32check/.test(source)) continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const emitted = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        jsx: ts.JsxEmit.Preserve,
      },
    }).outputText;
    const live = runtimeImports(ts.createSourceFile(file, emitted, ts.ScriptTarget.Latest, true));
    const imports = runtimeImports(ast);
    function record(node, meta, expression) {
      const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      sites.push({
        file,
        line: position.line + 1,
        column: position.character + 1,
        ...meta,
        expression,
      });
    }
    function walk(node) {
      if (
        ts.isExportDeclaration(node) &&
        !node.isTypeOnly &&
        node.moduleSpecifier &&
        sdkPattern.test(node.moduleSpecifier.text)
      )
        record(
          node,
          { package: node.moduleSpecifier.text, symbol: 're-export' },
          node.getText(ast)
        );
      if (
        ts.isImportDeclaration(node) ||
        ts.isTypeNode(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)
      )
        return;
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          node.expression.getText(ast) === 'require') &&
        ts.isStringLiteral(node.arguments[0]) &&
        sdkPattern.test(node.arguments[0].text)
      ) {
        record(node, { package: node.arguments[0].text, symbol: 'module' }, node.getText(ast));
      }
      if (ts.isIdentifier(node) && live.has(node.text) && imports.has(node.text)) {
        const parent = node.parent;
        const isName =
          (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
          ((ts.isPropertyAssignment(parent) ||
            ts.isPropertyDeclaration(parent) ||
            ts.isEnumMember(parent) ||
            ts.isVariableDeclaration(parent) ||
            ts.isParameter(parent) ||
            ts.isFunctionDeclaration(parent)) &&
            parent.name === node);
        if (!isName) {
          let expression = parent;
          if (ts.isPropertyAccessExpression(expression)) expression = expression.parent;
          record(
            node,
            imports.get(node.text),
            expression.getText(ast).replace(/\s+/g, ' ').slice(0, 240)
          );
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
  }
  return sites;
}
module.exports = { scan, sources };
if (require.main === module)
  process.stdout.write(
    JSON.stringify(process.argv.includes('--boundaries') ? scanBoundaries() : scan(), null, 2) +
      '\n'
  );

function scanBoundaries(root = 'src') {
  const sites = [];
  for (const file of sources(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function walk(node) {
      if (ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
        return;
      let kind;
      if (
        ts.isCallExpression(node) &&
        /^(?:(?:window|globalThis)\.)?(localStorage|sessionStorage)\.(getItem|setItem|removeItem)$/.test(
          node.expression.getText(ast)
        )
      )
        kind = 'browser-storage';
      if (
        ts.isCallExpression(node) &&
        /^set(Added|Removed)CustomNetworksCookie$/.test(node.expression.getText(ast))
      )
        kind = 'network-cookie';
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'networkId')
        kind = 'chain-id-use';
      if (
        ts.isCallExpression(node) &&
        /^(callApiWithErrorHandling|(?:apiClient|client)\.(GET|POST))$/.test(
          node.expression.getText(ast)
        )
      )
        kind = 'retained-request';
      if (
        ts.isIdentifier(node) &&
        /mnemonic|encrypt|decrypt|serializeTransaction|deserializeTransaction/i.test(node.text)
      )
        kind = 'secret-or-stored-transaction';
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(ast) === 'href' &&
        /tokenId/.test(node.getText(ast))
      )
        kind = 'nft-link';
      if (
        file.endsWith('/NftAvatar.tsx') &&
        ts.isPropertyAssignment(node) &&
        node.name.getText(ast) === 'tokenId'
      )
        kind = 'nft-metadata-id';
      if (
        file.endsWith('/useNftMetadata.ts') &&
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'getNftMetadataQueryKey'
      )
        kind = 'nft-metadata-key';
      if (
        /useBulkTokenMetadata|useFeeEstimates/.test(file) &&
        ts.isPropertyAssignment(node) &&
        node.name.getText(ast) === 'queryKey'
      )
        kind = 'derived-cache-key';
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'parseReadOnlyResponse')
        kind = 'read-only-display';
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'handleContractLogHex')
        kind = 'contract-log-display';
      if (
        file.endsWith('/hooks/useUser.ts') &&
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'setUserData'
      )
        kind = 'wallet-state';
      if (
        file.endsWith('/GlobalContextProvider.tsx') &&
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 'JSON.parse' &&
        /NetworksCookie/.test(node.getText(ast))
      )
        kind = 'network-cookie-load';
      if (kind) {
        const position = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        const route = ts.isCallExpression(node)
          ? node.arguments.find(arg => ts.isStringLiteral(arg) && arg.text.startsWith('/'))?.text
          : undefined;
        sites.push({
          file,
          line: position.line + 1,
          kind,
          expression: node.getText(ast).replace(/\s+/g, ' ').slice(0, 240),
          ...(route ? { route } : {}),
        });
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
  }
  return sites;
}
module.exports.scanBoundaries = scanBoundaries;
