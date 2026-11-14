import unittest
import tempfile
import os
import sqlite3
import json
from bugbrain.client import BugBrainClient

class TestBugBrainClient(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.bugbrain_dir = os.path.join(self.temp_dir, ".bugbrain")
        os.makedirs(self.bugbrain_dir)
        self.db_path = os.path.join(self.bugbrain_dir, "bugbrain.db")

        # Create mock SQLite database matching BugBrain schema
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                root_path TEXT NOT NULL,
                name TEXT NOT NULL,
                config_hash TEXT NOT NULL,
                sync_enabled INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE files (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                language TEXT,
                file_size INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE dependencies (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                source_file_id TEXT NOT NULL,
                target_path TEXT NOT NULL,
                target_file_id TEXT,
                dependency_type TEXT NOT NULL,
                confidence REAL NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE analyses (
                id TEXT PRIMARY KEY,
                file_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                summary TEXT,
                ast_tree TEXT,
                exports TEXT,
                imports TEXT,
                routes TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE adr_records (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                decision TEXT NOT NULL,
                rationale TEXT NOT NULL,
                affected_files TEXT,
                recorded_at TEXT NOT NULL
            );
        """)

        # Insert project
        conn.execute("INSERT INTO projects VALUES ('p1', '/mock', 'mock-proj', 'h1', 0, '2026-01-01', '2026-01-01');")
        # Insert files
        conn.execute("INSERT INTO files VALUES ('f1', 'p1', 'src/db.py', 'h_db', 'python', 100, 1, 'analyzed', '2026-01-01', '2026-01-01');")
        conn.execute("INSERT INTO files VALUES ('f2', 'p1', 'src/service.py', 'h_svc', 'python', 200, 1, 'analyzed', '2026-01-01', '2026-01-01');")
        conn.execute("INSERT INTO files VALUES ('f3', 'p1', 'src/controller.py', 'h_ctrl', 'python', 300, 1, 'analyzed', '2026-01-01', '2026-01-01');")

        # Dependencies: controller -> service -> db
        conn.execute("INSERT INTO dependencies VALUES ('d1', 'p1', 'f3', 'src/service.py', 'f2', 'import', 1.0, '2026-01-01');")
        conn.execute("INSERT INTO dependencies VALUES ('d2', 'p1', 'f2', 'src/db.py', 'f1', 'import', 1.0, '2026-01-01');")

        # ADR
        conn.execute("INSERT INTO adr_records VALUES ('adr1', 'p1', 'Use SQLAlchemy', 'Use ORM', 'Maintainability', '[\"src/db.py\"]', '2026-01-01');")

        conn.commit()
        conn.close()

        self.client = BugBrainClient(self.temp_dir)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_get_status(self):
        status = self.client.get_status()
        self.assertEqual(status["projectName"], "mock-proj")
        self.assertEqual(status["totalFiles"], 3)
        self.assertEqual(status["decisionsCount"], 1)

    def test_get_hot_files(self):
        hot = self.client.get_hot_files()
        self.assertTrue(len(hot) > 0)
        # db.py and service.py are imported
        paths = [h["relativePath"] for h in hot]
        self.assertIn("src/db.py", paths)

    def test_get_blast_radius(self):
        blast = self.client.get_blast_radius(["src/db.py"])
        # Modifying db.py affects service.py and controller.py
        self.assertIn("src/service.py", blast)
        self.assertIn("src/controller.py", blast)

    def test_get_blast_radius_from_diff(self):
        diff = """diff --git a/src/db.py b/src/db.py
--- a/src/db.py
+++ b/src/db.py
@@ -1,1 +1,2 @@
+def new_query(): pass"""
        result = self.client.get_blast_radius_from_diff(diff)
        self.assertIn("src/db.py", result["seedFiles"])
        self.assertIn("src/service.py", result["blastCone"])

if __name__ == "__main__":
    unittest.main()
