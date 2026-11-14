export interface DiagnosticError {
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  errorCode?: string;
  message: string;
  rawText: string;
  errorType: 'syntax' | 'import_not_found' | 'type_mismatch' | 'assertion_failure' | 'test_failure' | 'runtime' | 'unknown';
}

export class ErrorParser {
  /**
   * Parses raw compiler, linter, or test runner output into structured diagnostic error objects.
   */
  public static parseOutput(rawOutput: string): DiagnosticError[] {
    const errors: DiagnosticError[] = [];
    const lines = rawOutput.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. TypeScript compiler: file.ts(10,5): error TS1005: ';' expected.
      const tsPattern1 = /^([A-Za-z0-9_.\-\/\\]+\.[a-zA-Z0-9]+)\((\d+),(\d+)\):\s*error\s*(TS\d+)?:\s*(.*)/;
      const m1 = line.match(tsPattern1);
      if (m1) {
        const [, file, l, c, code, msg] = m1;
        errors.push({
          filePath: file.replace(/\\/g, '/'),
          lineNumber: parseInt(l, 10),
          columnNumber: parseInt(c, 10),
          errorCode: code || undefined,
          message: msg.trim(),
          rawText: line,
          errorType: msg.includes('Cannot find module')
            ? 'import_not_found'
            : msg.includes('expected') || msg.includes('Unexpected')
            ? 'syntax'
            : 'type_mismatch',
        });
        continue;
      }

      // 2. Standard TypeScript / Babel: file.ts:10:5 - error TS2307: ...
      const tsPattern2 = /^([A-Za-z0-9_.\-\/\\]+\.[a-zA-Z0-9]+):(\d+):(\d+)\s*-\s*error\s*(TS\d+)?:\s*(.*)/;
      const m2 = line.match(tsPattern2);
      if (m2) {
        const [, file, l, c, code, msg] = m2;
        errors.push({
          filePath: file.replace(/\\/g, '/'),
          lineNumber: parseInt(l, 10),
          columnNumber: parseInt(c, 10),
          errorCode: code || undefined,
          message: msg.trim(),
          rawText: line,
          errorType: msg.includes('Cannot find module') ? 'import_not_found' : 'type_mismatch',
        });
        continue;
      }

      // 3. Python Traceback: File "...", line 10, in ...
      const pyPattern = /File\s+"([^"]+)",\s+line\s+(\d+)/;
      const m3 = line.match(pyPattern);
      if (m3) {
        const file = m3[1].replace(/\\/g, '/');
        const l = parseInt(m3[2], 10);
        // Look ahead for the error message
        let errMsg = 'Python Exception';
        let errType: DiagnosticError['errorType'] = 'runtime';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].match(/^[A-Za-z]+Error:/)) {
            errMsg = lines[j].trim();
            if (errMsg.includes('ModuleNotFoundError') || errMsg.includes('ImportError')) {
              errType = 'import_not_found';
            } else if (errMsg.includes('SyntaxError')) {
              errType = 'syntax';
            } else if (errMsg.includes('AssertionError')) {
              errType = 'assertion_failure';
            }
            break;
          }
        }
        errors.push({
          filePath: file,
          lineNumber: l,
          message: errMsg,
          rawText: line,
          errorType: errType,
        });
        continue;
      }

      // 4. Vitest / Jest: FAIL path/to/file.test.ts > suite > test
      const vitestFail = /(?:FAIL|×)\s+([A-Za-z0-9_.\-\/\\]+\.(?:test|spec)\.[a-zA-Z0-9]+)(?:\s*>\s*(.*))?/;
      const m4 = line.match(vitestFail);
      if (m4) {
        errors.push({
          filePath: m4[1].replace(/\\/g, '/'),
          message: m4[2] ? `Test failed: ${m4[2].trim()}` : 'Test assertion failed',
          rawText: line,
          errorType: 'test_failure',
        });
        continue;
      }

      // 5. Uncaught standalone ModuleNotFoundError
      const moduleNotFound = /Cannot find module '([^']+)'|ModuleNotFoundError: No module named '([^']+)'/;
      const m5 = line.match(moduleNotFound);
      if (m5) {
        const mod = m5[1] || m5[2];
        errors.push({
          message: `Module not found: ${mod}`,
          rawText: line,
          errorType: 'import_not_found',
        });
      }
    }

    return errors;
  }
}

