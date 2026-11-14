import json
import os
import sqlite3
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional


class NoReScanClient:
    """
    Python client for NoReScan codebase memory layer.
    Supports direct local SQLite queries (zero network dependencies) or REST API.
    """

    def __init__(self, project_path: str = ".", api_url: Optional[str] = None):
        self.project_path = os.path.abspath(project_path)
        self.db_path = os.path.join(self.project_path, ".norescan", "norescan.db")
        self.api_url = api_url.rstrip("/") if api_url else None

    def _get_db(self) -> sqlite3.Connection:
        if not os.path.isfile(self.db_path):
            raise FileNotFoundError(
                f"norescan database not found at {self.db_path}. Run 'norescan init' and 'norescan scan' first."
            )
        conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def get_status(self) -> Dict[str, Any]:
        """Returns project memory index status."""
        if self.api_url:
            return self._fetch_api("/api/v1/status")

        with self._get_db() as conn:
            proj = conn.execute("SELECT * FROM projects LIMIT 1").fetchone()
            if not proj:
                return {"initialized": False}

            total_files = conn.execute("SELECT count(*) FROM files WHERE project_id = ?", (proj["id"],)).fetchone()[0]
            valid_analyses = conn.execute(
                "SELECT count(*) FROM analyses WHERE project_id = ? AND status = 'valid'", (proj["id"],)
            ).fetchone()[0]
            decisions_count = conn.execute(
                "SELECT count(*) FROM adr_records WHERE project_id = ?", (proj["id"],)
            ).fetchone()[0]

            return {
                "projectId": proj["id"],
                "projectName": proj["name"],
                "rootPath": proj["root_path"],
                "totalFiles": total_files,
                "validAnalyses": valid_analyses,
                "decisionsCount": decisions_count,
            }

    def get_hot_files(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Identifies the most load-bearing files in the project (highest in-degree)."""
        if self.api_url:
            return self._fetch_api("/api/v1/hot-files")[:limit]

        with self._get_db() as conn:
            proj = conn.execute("SELECT id FROM projects LIMIT 1").fetchone()
            if not proj:
                return []

            # In-degree: count how many files import this file
            query = """
                SELECT f.relative_path, count(d.id) as in_degree
                FROM files f
                JOIN dependencies d ON d.target_path = f.relative_path
                WHERE f.project_id = ?
                GROUP BY f.relative_path
                ORDER BY in_degree DESC
                LIMIT ?;
            """
            rows = conn.execute(query, (proj["id"], limit)).fetchall()
            return [{"relativePath": r["relative_path"], "inDegree": r["in_degree"]} for r in rows]

    def get_blast_radius(self, seed_files: List[str], max_depth: int = 10) -> List[str]:
        """Calculates upstream blast radius cone for specified seed files."""
        if self.api_url:
            res = self._post_api("/api/v1/blast-radius", {"files": seed_files, "maxDepth": max_depth})
            return res.get("blastCone", [])

        with self._get_db() as conn:
            proj = conn.execute("SELECT id FROM projects LIMIT 1").fetchone()
            if not proj:
                return []

            blast_cone = set()
            queue = [(f, 0) for f in seed_files]
            visited = set(seed_files)

            while queue:
                current_file, depth = queue.pop(0)
                if depth >= max_depth:
                    continue

                # Files that import current_file
                dependents = conn.execute(
                    """
                    SELECT f.relative_path
                    FROM dependencies d
                    JOIN files f ON f.id = d.source_file_id
                    WHERE d.target_path = ? AND d.project_id = ?
                    """,
                    (current_file, proj["id"]),
                ).fetchall()

                for row in dependents:
                    dep = row["relative_path"]
                    blast_cone.add(dep)
                    if dep not in visited:
                        visited.add(dep)
                        queue.append((dep, depth + 1))

            return list(blast_cone)

    def get_blast_radius_from_diff(self, diff_text: str, max_depth: int = 10) -> Dict[str, Any]:
        """Calculates blast radius directly from a git diff patch."""
        if self.api_url:
            return self._post_api("/api/v1/blast-radius", {"diff": diff_text, "maxDepth": max_depth})

        seed_files = []
        for line in diff_text.splitlines():
            if line.startswith("+++ b/") and not line.startswith("+++ b//dev/null"):
                seed_files.append(line[6:].strip())
            elif line.startswith("--- a/") and not line.startswith("--- a//dev/null"):
                seed_files.append(line[6:].strip())

        seed_files = list(set(seed_files))
        blast_cone = self.get_blast_radius(seed_files, max_depth)
        return {
            "seedFiles": seed_files,
            "blastCone": blast_cone,
            "totalAffected": len(blast_cone),
        }

    def get_decisions(self) -> List[Dict[str, Any]]:
        """Retrieves architectural decision records (ADRs)."""
        if self.api_url:
            return self._fetch_api("/api/v1/decisions")

        with self._get_db() as conn:
            proj = conn.execute("SELECT id FROM projects LIMIT 1").fetchone()
            if not proj:
                return []

            rows = conn.execute(
                "SELECT * FROM adr_records WHERE project_id = ? ORDER BY recorded_at DESC", (proj["id"],)
            ).fetchall()
            return [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "decision": r["decision"],
                    "rationale": r["rationale"],
                    "affectedFiles": json.loads(r["affected_files"] or "[]"),
                    "recordedAt": r["recorded_at"],
                }
                for r in rows
            ]

    def _fetch_api(self, endpoint: str) -> Any:
        url = f"{self.api_url}{endpoint}"
        req = urllib.request.Request(url, headers={"User-Agent": "norescan-Python-SDK/0.1.0"})
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _post_api(self, endpoint: str, data: Dict[str, Any]) -> Any:
        url = f"{self.api_url}{endpoint}"
        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "norescan-Python-SDK/0.1.0"},
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

