# Cache Validation & Provenance

Every cached analysis has:
- `content_hash`: SHA-256 fingerprint of the source text when analyzed.
- `analyzer_version`: Version of the structural parser that produced the AST.
- `schema_version`: Version of the database analysis metadata schema.
- `status`: Either `valid` or `stale`.

A cached analysis is valid ONLY when:
1. Physical disk content SHA-256 matches `content_hash`.
2. `analyzer_version` matches the currently installed analyzer version.
3. `schema_version` matches the active database schema version.
4. No upstream public interface dependency was modified.
