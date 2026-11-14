import ts from 'typescript';
import { AstMetadata, ExportDefinition, ImportDefinition, RouteDefinition, SymbolDefinition } from '@code-cache/shared';

export function parseTypeScript(sourceText: string, fileName: string): { metadata: AstMetadata; summary: string } {
  const isJsx = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const imports: ImportDefinition[] = [];
  const exports: ExportDefinition[] = [];
  const symbols: SymbolDefinition[] = [];
  const routes: RouteDefinition[] = [];

  function visit(node: ts.Node) {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    // 1. Imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      const specifiers: string[] = [];
      let isTypeOnly = node.importClause?.isTypeOnly ?? false;

      if (node.importClause?.name) {
        specifiers.push(node.importClause.name.text);
      }
      if (node.importClause?.namedBindings) {
        if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            specifiers.push(el.name.text);
          }
        } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
        }
      }
      imports.push({
        source: moduleSpecifier,
        specifiers,
        isTypeOnly,
        isDynamic: false,
      });
    }

    // 2. Call expressions (dynamic imports, routes, etc.)
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText(sourceFile);
      // HTTP Route detection (e.g., app.get, router.post, route.delete)
      const routeMatch = text.match(/(?:app|router|fastify|server)\.(get|post|put|delete|patch|all)$/i);
      if (routeMatch && node.arguments.length > 0) {
        const method = routeMatch[1].toUpperCase() as RouteDefinition['method'];
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          routes.push({
            method,
            path: firstArg.text,
            handler: text,
          });
        }
      }
    }

    // 3. Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const isExported = hasExportModifier(node);
      const name = node.name.text;
      const signature = node.getText(sourceFile).split('{')[0].trim();
      symbols.push({ name, kind: 'function', line, signature, exported: isExported });
      if (isExported) {
        exports.push({ name, kind: 'function', signature });
      }
    }

    // 4. Classes
    if (ts.isClassDeclaration(node) && node.name) {
      const isExported = hasExportModifier(node);
      const name = node.name.text;
      symbols.push({ name, kind: 'class', line, exported: isExported });
      if (isExported) {
        exports.push({ name, kind: 'class' });
      }
    }

    // 5. Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      const isExported = hasExportModifier(node);
      const name = node.name.text;
      symbols.push({ name, kind: 'interface', line, exported: isExported });
      if (isExported) {
        exports.push({ name, kind: 'interface' });
      }
    }

    // 6. Type Aliases
    if (ts.isTypeAliasDeclaration(node)) {
      const isExported = hasExportModifier(node);
      const name = node.name.text;
      symbols.push({ name, kind: 'type', line, exported: isExported });
      if (isExported) {
        exports.push({ name, kind: 'type' });
      }
    }

    // 7. Variable Statements (const foo = () => {}, export const x = 1)
    if (ts.isVariableStatement(node)) {
      const isExported = hasExportModifier(node);
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const isFunc = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
          const kind = isFunc ? 'function' : 'variable';
          symbols.push({ name, kind, line, exported: isExported });
          if (isExported) {
            exports.push({ name, kind });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const summary = generateSummary(fileName, symbols, exports, routes, imports);
  return {
    metadata: {
      symbols,
      imports,
      exports,
      routes: routes.length > 0 ? routes : undefined,
    },
    summary,
  };
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function generateSummary(
  fileName: string,
  symbols: SymbolDefinition[],
  exports: ExportDefinition[],
  routes: RouteDefinition[],
  imports: ImportDefinition[]
): string {
  const parts: string[] = [];
  if (routes.length > 0) {
    parts.push(`Routes: ${routes.map((r) => `${r.method} ${r.path}`).join(', ')}`);
  }
  if (exports.length > 0) {
    parts.push(`Exports: ${exports.map((e) => `${e.kind} ${e.name}`).join(', ')}`);
  } else if (symbols.length > 0) {
    parts.push(`Symbols: ${symbols.slice(0, 5).map((s) => s.name).join(', ')}`);
  }
  if (imports.length > 0) {
    parts.push(`Imports from ${imports.length} modules`);
  }
  return parts.length > 0 ? parts.join(' | ') : `Source file ${fileName}`;
}

