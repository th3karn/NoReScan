<!-- norescan:ANTIGRAVITY:START -->
## NoReScan Persistent Memory & Auto-Healing Protocol

1. **Before Coding Tasks:**
   - Retrieve task context using MCP (`get_task_context`) or CLI (`norescan context "<task>"`).
   - Use `inspect_file_memory` to check a file's AST, exports, and functions directly from memory without repetitive file reading.

2. **When Creating or Editing Files:**
   - Immediately notify NoReScan memory by calling `remember_file(path)` or running `norescan remember <path>`.
   - This instantly indexes exports, imports, and AST in real-time, preventing redundant re-analysis across the conversation.

3. **When Tests or Builds Fail:**
   - Call `diagnose_and_fix(autoFix: true)` or run `norescan fix` to automatically parse errors, locate the root cause file via dependency blast radius, and apply verified fixes.

4. **After Completing Work:**
   - Record architectural decisions using `record_decision`.
<!-- norescan:ANTIGRAVITY:END -->
