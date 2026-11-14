import { CausalGraphData } from './cartographer.js';

export function renderDashboardHtml(projectName: string, graphData: CausalGraphData): string {
  const jsonGraph = JSON.stringify(graphData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>norescan — Causal Graph & Blast Radius Cartographer</title>
  <style>
    :root {
      --bg-dark: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent-teal: #14b8a6;
      --accent-cyan: #06b6d4;
      --accent-orange: #f97316;
      --accent-red: #ef4444;
      --accent-green: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    header {
      background: #0b1120;
      border-bottom: 1px solid var(--card-border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--accent-teal), var(--accent-cyan));
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #000;
      font-size: 16px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: var(--accent-teal);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-left: 8px;
    }
    .tags {
      display: flex;
      gap: 8px;
    }
    .tag {
      background: rgba(20, 184, 166, 0.12);
      border: 1px solid rgba(20, 184, 166, 0.3);
      color: #5eead4;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 500;
    }
    main {
      flex: 1;
      display: grid;
      grid-template-columns: 320px 1fr 340px;
      overflow: hidden;
    }
    .sidebar {
      background: #0d1322;
      border-right: 1px solid var(--card-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }
    .sidebar-right {
      background: #0d1322;
      border-left: 1px solid var(--card-border);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 14px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.02);
      padding: 8px;
      border-radius: 4px;
    }
    .stat-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--accent-cyan);
    }
    .stat-lbl {
      font-size: 11px;
      color: var(--text-muted);
    }
    .hot-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 280px;
      overflow-y: auto;
    }
    .hot-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(20, 184, 166, 0.05);
      border: 1px solid rgba(20, 184, 166, 0.15);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    .hot-item:hover {
      background: rgba(20, 184, 166, 0.15);
      border-color: var(--accent-teal);
    }
    .hot-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
    }
    .badge {
      background: var(--accent-teal);
      color: #000;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      margin-left: 8px;
    }
    .diff-textarea {
      width: 100%;
      height: 140px;
      background: #090e1a;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      color: #38bdf8;
      font-family: monospace;
      font-size: 11px;
      padding: 8px;
      resize: vertical;
    }
    .btn {
      background: linear-gradient(135deg, #0d9488, #0891b2);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      width: 100%;
      margin-top: 8px;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: #1e293b;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .btn-secondary:hover { background: #334155; color: white; }
    .blast-results {
      margin-top: 10px;
      font-size: 12px;
      display: none;
    }
    .blast-cone-item {
      padding: 4px 8px;
      margin: 4px 0;
      background: rgba(249, 115, 22, 0.1);
      border-left: 3px solid var(--accent-orange);
      font-family: monospace;
      font-size: 11px;
    }
    #viewport {
      position: relative;
      background: #070a12;
      overflow: hidden;
      cursor: grab;
    }
    #viewport:active { cursor: grabbing; }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .legend {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      gap: 16px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-hot { background: var(--accent-cyan); box-shadow: 0 0 6px var(--accent-cyan); }
    .dot-blast { background: var(--accent-orange); box-shadow: 0 0 6px var(--accent-orange); }
    .dot-selected { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
    .dot-normal { background: #475569; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-logo">B</div>
      <div>
        <span class="brand-title">norescan</span>
        <span class="brand-sub">Causal Cartographer</span>
      </div>
    </div>
    <div class="tags">
      <span class="tag">Persistent Memory</span>
      <span class="tag">Smart Indexing</span>
      <span class="tag">MCP Integration</span>
      <span class="tag">Incremental Analysis</span>
      <span class="tag">Cross-Agent</span>
    </div>
  </header>

  <main>
    <!-- Left Sidebar: Project stats & hot files -->
    <div class="sidebar">
      <div>
        <h2 style="font-size: 14px; color: var(--accent-teal); margin-bottom: 4px;">CARTOGRAPHER</h2>
        <h1 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Causal graph</h1>
        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
          Every file and every import. Click a node to see its neighbors. Paste a diff to see the blast radius — the upstream cone of files that would be affected if the change introduced a regression.
        </p>
      </div>

      <div class="card">
        <div class="card-title">Graph Stats</div>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-val" id="stat-files">0</div>
            <div class="stat-lbl">Files</div>
          </div>
          <div class="stat-box">
            <div class="stat-val" id="stat-edges">0</div>
            <div class="stat-lbl">Edges</div>
          </div>
          <div class="stat-box">
            <div class="stat-val" id="stat-hot">0</div>
            <div class="stat-lbl">Hot Files</div>
          </div>
          <div class="stat-box">
            <div class="stat-val" id="stat-density">0</div>
            <div class="stat-lbl">Density</div>
          </div>
        </div>
      </div>

      <div class="card" style="flex: 1; display: flex; flex-direction: column;">
        <div class="card-title">
          <span>Hot Files</span>
          <span style="font-size: 10px; color: var(--accent-teal);">Highest In-Degree</span>
        </div>
        <div class="hot-list" id="hot-list"></div>
      </div>
    </div>

    <!-- Center Canvas: Interactive Causal Graph -->
    <div id="viewport">
      <canvas id="graph-canvas"></canvas>
      <div class="legend">
        <div class="legend-item"><div class="dot dot-hot"></div> Hot File (High In-degree)</div>
        <div class="legend-item"><div class="dot dot-blast"></div> Blast Cone (Dependent)</div>
        <div class="legend-item"><div class="dot dot-selected"></div> Seed / Selected</div>
        <div class="legend-item"><div class="dot dot-normal"></div> Standard File</div>
      </div>
    </div>

    <!-- Right Sidebar: Blast a diff & impact analysis -->
    <div class="sidebar-right">
      <div class="card">
        <div class="card-title">
          <span>Blast a Diff</span>
          <span style="color: var(--accent-orange); font-size: 10px;">Impact Analysis</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4; margin-bottom: 8px;">
          Paste a git diff below, and norescan highlights every file that depends on the changed files — the "blast cone" of potential breakage.
        </p>
        <textarea id="diff-input" class="diff-textarea" placeholder="Paste 'git diff' output here..."></textarea>
        <button id="btn-blast" class="btn">💥 Blast Diff</button>
        <button id="btn-example" class="btn btn-secondary">Try Example Diff</button>
      </div>

      <div id="blast-results-card" class="card blast-results">
        <div class="card-title" style="color: var(--accent-orange);">
          <span>Blast Radius Cone</span>
          <span id="blast-count-badge" class="badge" style="background: var(--accent-orange); color: white;">0</span>
        </div>
        <div id="blast-cone-list" style="max-height: 300px; overflow-y: auto;"></div>
      </div>
    </div>
  </main>

  <script>
    const data = ${jsonGraph};

    // Update Stats
    document.getElementById('stat-files').textContent = data.stats.totalFiles;
    document.getElementById('stat-edges').textContent = data.stats.totalEdges;
    document.getElementById('stat-hot').textContent = data.stats.hotFilesCount;
    document.getElementById('stat-density').textContent = data.stats.density;

    // Render Hot Files
    const hotList = document.getElementById('hot-list');
    data.hotFiles.forEach(h => {
      const div = document.createElement('div');
      div.className = 'hot-item';
      div.innerHTML = \`<span class="hot-name" title="\${h.relativePath}">\${h.relativePath}</span><span class="badge">\${h.inDegree}</span>\`;
      div.onclick = () => selectNode(h.relativePath);
      hotList.appendChild(div);
    });

    // Canvas Force Graph Simulation
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    const viewport = document.getElementById('viewport');

    let width = viewport.clientWidth;
    let height = viewport.clientHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      canvas.width = width;
      canvas.height = height;
    });

    // Initialize node positions
    const nodeMap = new Map();
    const nodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 200;
      const node = {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: n.isHot ? 10 + Math.min(10, n.inDegree * 2) : 6,
      };
      nodeMap.set(node.id, node);
      return node;
    });

    const links = data.edges.map(e => ({
      source: nodeMap.get(e.source) || e.source,
      target: nodeMap.get(e.target) || e.target,
    })).filter(l => l.source && l.target && typeof l.source === 'object');

    let selectedNodeId = null;
    let blastSeedIds = new Set();
    let blastConeIds = new Set();

    function selectNode(id) {
      selectedNodeId = id;
      blastSeedIds = new Set([id]);
      blastConeIds = new Set();

      // Find direct and transitive dependents
      const queue = [id];
      while (queue.length > 0) {
        const curr = queue.shift();
        links.forEach(l => {
          if (l.target.id === curr && !blastConeIds.has(l.source.id) && l.source.id !== id) {
            blastConeIds.add(l.source.id);
            queue.push(l.source.id);
          }
        });
      }

      showBlastResults(Array.from(blastConeIds), [id]);
    }

    function showBlastResults(affected, seeds) {
      const card = document.getElementById('blast-results-card');
      const count = document.getElementById('blast-count-badge');
      const list = document.getElementById('blast-cone-list');
      card.style.display = 'block';
      count.textContent = affected.length;
      list.innerHTML = '';

      if (affected.length === 0) {
        list.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">No upstream dependents affected. Safe leaf file!</div>';
        return;
      }

      affected.forEach(file => {
        const item = document.createElement('div');
        item.className = 'blast-cone-item';
        item.textContent = file;
        list.appendChild(item);
      });
    }

    // Force simulation step
    function step() {
      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 250) {
            const force = (250 - dist) / dist * 0.05;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // Link attraction
      links.forEach(l => {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.005;
        l.source.vx += dx * force;
        l.source.vy += dy * force;
        l.target.vx -= dx * force;
        l.target.vy -= dy * force;
      });

      // Center gravity & damping
      nodes.forEach(n => {
        n.vx += (width / 2 - n.x) * 0.001;
        n.vy += (height / 2 - n.y) * 0.001;
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.85;
        n.vy *= 0.85;
      });
    }

    function render() {
      step();
      ctx.clearRect(0, 0, width, height);

      // Draw links
      links.forEach(l => {
        const isBlast = blastSeedIds.has(l.target.id) || blastConeIds.has(l.target.id);
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        ctx.strokeStyle = isBlast ? 'rgba(249, 115, 22, 0.7)' : 'rgba(71, 85, 105, 0.3)';
        ctx.lineWidth = isBlast ? 2 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

        if (blastSeedIds.has(n.id)) {
          ctx.fillStyle = '#10b981'; // Green seed
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
        } else if (blastConeIds.has(n.id)) {
          ctx.fillStyle = '#f97316'; // Orange blast
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12;
        } else if (n.isHot) {
          ctx.fillStyle = '#06b6d4'; // Cyan hot
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#334155';
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        if (n.isHot || blastSeedIds.has(n.id) || blastConeIds.has(n.id)) {
          ctx.fillStyle = '#f8fafc';
          ctx.font = '10px monospace';
          ctx.fillText(n.label, n.x + n.radius + 4, n.y + 3);
        }
      });

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    // Blast Diff Button Handler
    document.getElementById('btn-blast').onclick = () => {
      const text = document.getElementById('diff-input').value;
      if (!text.trim()) return;

      const lines = text.split('\\n');
      const seeds = [];
      lines.forEach(l => {
        const m = l.match(/^[+\\-]{3} [ab]\\/(.+)$/);
        if (m && m[1] !== '/dev/null') seeds.push(m[1].trim());
      });

      if (seeds.length === 0) {
        alert('No changed files detected in diff');
        return;
      }

      blastSeedIds = new Set(seeds);
      blastConeIds = new Set();
      const queue = [...seeds];
      while (queue.length > 0) {
        const curr = queue.shift();
        links.forEach(l => {
          if (l.target.id === curr && !blastConeIds.has(l.source.id) && !blastSeedIds.has(l.source.id)) {
            blastConeIds.add(l.source.id);
            queue.push(l.source.id);
          }
        });
      }

      showBlastResults(Array.from(blastConeIds), seeds);
    };

    // Example diff
    document.getElementById('btn-example').onclick = () => {
      if (data.hotFiles.length > 0) {
        const hot = data.hotFiles[0].relativePath;
        document.getElementById('diff-input').value = \`diff --git a/\${hot} b/\${hot}\\n--- a/\${hot}\\n+++ b/\${hot}\\n@@ -1,5 +1,6 @@\\n+// Breaking signature modification\\n- export function login()\\n+ export function login(options: AuthOptions)\`;
        document.getElementById('btn-blast').click();
      }
    };
  </script>
</body>
</html>`;
}

