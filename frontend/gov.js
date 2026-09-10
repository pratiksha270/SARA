/* ================================================================
   gov.js  —  SARA Government Dashboard
   Fixes:
   1. Routes tab fully implemented (drag-drop, CSV/JSON import,
      manual edge add, clear, save, Dijkstra test, table, preview)
   2. Allocations tab fully implemented (populate table, filters,
      CSV download)
   3. Publish Snapshot handler added
   4. colorMode select now actually changes route coloring
   5. window.allocations kept in sync so tab-switch redraw works
   6. drawNetwork guards against missing positions (no crash)
   7. api.js reference removed from gov.html (API lives here)
   8. init() wrapped in try/catch with user-friendly fallback
   ================================================================ */

/* ---------------- API helpers ---------------- */
const API = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
    return r.json();
  },
  async post(url, body = null) {
    const r = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : null
    });
    if (!r.ok) throw new Error(`POST ${url} → ${r.status}`);
    return r.json();
  }
};

/* ---------------- Tabs ---------------- */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tabpane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

    if (btn.dataset.tab === "overview" && window.allocations?.length) {
      drawNetwork(window.allocations);
    }
    if (btn.dataset.tab === "routes") drawRoutesPreview();
  };
});

/* ---------------- State ---------------- */
let allocations = [];
window.allocations = allocations;          // FIX #5 — keep window ref in sync
let summary      = null;
let chart        = null;

/* edges array lives in routes tab */
let edges = [];                            // { from, to, distKm }

/* ================================================================
   OVERVIEW: KPIs + Bar Chart
   ================================================================ */
function setKpis(s) {
  document.getElementById("kpi-req").textContent   = s?.totalRequested   ?? 0;
  document.getElementById("kpi-alloc").textContent = s?.totalAllocated   ?? 0;
  document.getElementById("kpi-cov").textContent   = (s?.coveragePct ?? 0) + "%";
}

function buildBarChart(s) {
  const ctx = document.getElementById("barChart");
  if (chart) chart.destroy();
  if (!s?.byResourceRequested) return;
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(s.byResourceRequested),
      datasets: [
        {
          label: "Requested",
          data: Object.values(s.byResourceRequested),
          backgroundColor: "rgba(37,99,235,0.7)"
        },
        {
          label: "Allocated",
          data: Object.values(s.byResourceAllocated || {}),
          backgroundColor: "rgba(34,197,94,0.7)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ================================================================
   OVERVIEW: Route-network canvas
   FIX #4 — colorMode is now honoured
   FIX #6 — guard against missing positions
   ================================================================ */

/* Resource colour palette for colorMode=resource */
const RESOURCE_COLORS = [
  "#2563eb","#f97316","#22c55e","#a855f7",
  "#ec4899","#14b8a6","#f59e0b","#ef4444"
];

function drawNetwork(rows) {
  const wrap   = document.querySelector("#tab-overview .map-wrap").getBoundingClientRect();
  const canvas = document.getElementById("routeCanvas");
  const dpr    = window.devicePixelRatio || 1;
  const W      = wrap.width;
  const H      = wrap.height;

  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (!rows || rows.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui";
    ctx.fillText("No allocation data yet. Click Run Allocation.", 20, H / 2);
    return;
  }

  /* ---- Extract node sets ---- */
  const warehouses = new Set();
  const reliefs    = new Set();
  const midCities  = new Set();

  rows.forEach(a => {
    if (a.sourceCity) warehouses.add(a.sourceCity);
    if (a.destCity)   reliefs.add(a.destCity);
    (a.path || []).forEach(c => midCities.add(c));
  });

  /* ---- Assign positions ---- */
  const pos    = {};
  const leftX  = W * 0.14;
  const rightX = W * 0.86;
  const centerX= W * 0.50;

  const gap = (n) => Math.min(80, (H - 80) / Math.max(n, 1));

  [...warehouses].forEach((c, i) => {
    pos[c] = [leftX,  60 + i * gap(warehouses.size)];
  });
  [...reliefs].forEach((c, i) => {
    pos[c] = [rightX, 60 + i * gap(reliefs.size)];
  });

  let mi = 0;
  [...midCities].forEach(c => {
    if (!pos[c]) {
      pos[c] = [centerX, 60 + mi * gap(midCities.size)];
      mi++;
    }
  });

  /* ---- Color mode ---- */
  const colorMode = document.getElementById("colorMode").value;
  const resourceList = [...new Set(rows.map(a => a.resource).filter(Boolean))];
  const resourceColor = {};
  resourceList.forEach((r, i) => { resourceColor[r] = RESOURCE_COLORS[i % RESOURCE_COLORS.length]; });

  /* ---- Helpers ---- */
  function drawLabel(x, y, t) {
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "11px system-ui";
    ctx.fillText(t, x + 10, y - 5);
    ctx.restore();
  }

  function drawWarehouse(x, y, t) {
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x - 7, y - 7, 14, 14);
    drawLabel(x, y, t);
  }

  function drawRelief(x, y, t) {
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x - 7, y + 7);
    ctx.lineTo(x + 7, y + 7);
    ctx.closePath();
    ctx.fill();
    drawLabel(x, y, t);
  }

  function drawCity(x, y, t) {
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(x, y, t);
  }

  function drawArrow(a, b, color) {
    if (!a || !b) return;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const l   = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - l * Math.cos(ang - Math.PI / 6), b[1] - l * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(b[0] - l * Math.cos(ang + Math.PI / 6), b[1] - l * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  /* ---- Draw routes ---- */
  rows.forEach(a => {
    const p = a.path || [];
    if (p.length < 2) return;

    // FIX #6 — skip if any node has no position
    if (p.some(c => !pos[c])) return;

    const color =
      colorMode === "resource"
        ? (resourceColor[a.resource] || "#94a3b8")
        : a.status === "Met"     ? "#22c55e"
        : a.status === "Partial" ? "#f59e0b"
                                 : "#ef4444";

    ctx.strokeStyle = color;
    ctx.lineWidth   = Math.max(1.5, (a.allocated || 0) / 50);
    ctx.beginPath();
    ctx.moveTo(...pos[p[0]]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(...pos[p[i]]);
    ctx.stroke();

    drawArrow(pos[p[p.length - 2]], pos[p[p.length - 1]], color);

    const midPt = pos[p[Math.floor(p.length / 2)]];
    if (a.distanceKm && midPt) {
      ctx.fillStyle = "#374151";
      ctx.font = "10px system-ui";
      ctx.fillText(`${Number(a.distanceKm).toFixed(0)} km`, midPt[0] + 4, midPt[1] - 4);
    }
  });

  /* ---- Draw nodes (on top) ---- */
  const allNodes = new Set([...warehouses, ...reliefs, ...midCities]);
  allNodes.forEach(c => {
    if (!pos[c]) return;
    if (warehouses.has(c))  drawWarehouse(...pos[c], c);
    else if (reliefs.has(c)) drawRelief(...pos[c], c);
    else drawCity(...pos[c], c);
  });
}

/* Redraw when color mode changes */
document.getElementById("colorMode").addEventListener("change", () => {
  if (window.allocations?.length) drawNetwork(window.allocations);
});

/* ================================================================
   RUN ALLOCATION
   ================================================================ */
document.getElementById("runBtn").onclick = async () => {
  const msg = document.getElementById("msg");
  msg.textContent = "Running allocation…";
  try {
    const data = await API.post("http://127.0.0.1:5000/admin/allocate?pretty=1");
    if (data.error) { alert(data.error); msg.textContent = "Error."; return; }

    allocations       = data.allocations || [];
    window.allocations = allocations;      // FIX #5

    summary = data.summary || {};
    setKpis(summary);
    buildBarChart(summary);
    drawNetwork(allocations);
    populateAllocTable(allocations);

    msg.textContent = "Done — allocation complete.";
  } catch (e) {
    msg.textContent = "Failed: " + e.message;
  }
};

/* ================================================================
   PUBLISH SNAPSHOT  — FIX #3
   ================================================================ */
document.getElementById("publishBtn").onclick = async () => {
  try {
    const data = await API.post("http://127.0.0.1:5000/admin/publish");
    alert(data.message || "Snapshot published successfully.");
  } catch (e) {
    alert("Publish failed: " + e.message);
  }
};

/* ================================================================
   ROUTES TAB  — FIX #1 (fully implemented)
   ================================================================ */

/* ---- Local Dijkstra ---- */
function dijkstra(edgeList, start, end) {
  const graph = {};
  edgeList.forEach(({ from, to, distKm }) => {
    if (!graph[from]) graph[from] = [];
    if (!graph[to])   graph[to]   = [];
    graph[from].push({ node: to,   dist: distKm });
    graph[to].push  ({ node: from, dist: distKm });
  });

  const dist = {};
  const prev = {};
  const visited = new Set();
  const nodes = new Set(edgeList.flatMap(e => [e.from, e.to]));

  nodes.forEach(n => { dist[n] = Infinity; prev[n] = null; });
  dist[start] = 0;

  while (true) {
    let u = null;
    nodes.forEach(n => {
      if (!visited.has(n) && (u === null || dist[n] < dist[u])) u = n;
    });
    if (u === null || dist[u] === Infinity || u === end) break;
    visited.add(u);
    (graph[u] || []).forEach(({ node: v, dist: d }) => {
      const alt = dist[u] + d;
      if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    });
  }

  if (dist[end] === Infinity) return null;
  const path = [];
  for (let cur = end; cur; cur = prev[cur]) path.unshift(cur);
  return { path, totalKm: dist[end] };
}

/* ---- Routes Preview Canvas ---- */
function drawRoutesPreview() {
  const wrap   = document.querySelector("#tab-routes .map-wrap").getBoundingClientRect();
  const canvas = document.getElementById("cv");
  const dpr    = window.devicePixelRatio || 1;
  const W      = wrap.width;
  const H      = wrap.height;

  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  if (!edges.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui";
    ctx.fillText("No edges yet. Import a CSV or add manually.", 20, H / 2);
    return;
  }

  /* Collect unique cities and assign positions in a circle */
  const cities = [...new Set(edges.flatMap(e => [e.from, e.to]))];
  const pos    = {};
  const cx     = W / 2;
  const cy     = H / 2;
  const r      = Math.min(W, H) * 0.36;

  cities.forEach((c, i) => {
    const angle = (2 * Math.PI * i) / cities.length - Math.PI / 2;
    pos[c] = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  /* Draw edges */
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth   = 1.5;
  edges.forEach(({ from, to, distKm }) => {
    if (!pos[from] || !pos[to]) return;
    ctx.beginPath();
    ctx.moveTo(...pos[from]);
    ctx.lineTo(...pos[to]);
    ctx.stroke();

    const mx = (pos[from][0] + pos[to][0]) / 2;
    const my = (pos[from][1] + pos[to][1]) / 2;
    ctx.fillStyle = "#6b7280";
    ctx.font = "9px system-ui";
    ctx.fillText(Number(distKm).toFixed(0), mx + 3, my - 3);
  });

  /* Draw nodes */
  cities.forEach(c => {
    const [x, y] = pos[c];
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "11px system-ui";
    ctx.fillText(c, x + 7, y + 4);
  });
}

/* ---- Sync dropdowns for Dijkstra ---- */
function refreshCityDropdowns() {
  const cities = [...new Set(edges.flatMap(e => [e.from, e.to]))];
  ["spStart", "spEnd"].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = cities.map(c => `<option value="${c}">${c}</option>`).join("");
    if (cities.includes(cur)) sel.value = cur;
  });
}

/* ---- Update routes table ---- */
function refreshRoutesTable() {
  const tbody = document.getElementById("tbl");
  document.getElementById("count").textContent = edges.length;
  tbody.innerHTML = edges.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e.from}</td>
      <td>${e.to}</td>
      <td>${Number(e.distKm).toFixed(1)} km</td>
      <td><button onclick="removeEdge(${i})" style="font-size:0.78rem;padding:0.15rem 0.5rem;">✕</button></td>
    </tr>`).join("");
}

window.removeEdge = function(i) {
  edges.splice(i, 1);
  refreshRoutesTable();
  refreshCityDropdowns();
  drawRoutesPreview();
};

/* ---- Drag-and-drop / file picker ---- */
const dz   = document.getElementById("dz");
const filePicker = document.getElementById("file");

dz.onclick = () => filePicker.click();

dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("dragover"); });
dz.addEventListener("dragleave", ()  => dz.classList.remove("dragover"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

filePicker.addEventListener("change", e => handleFile(e.target.files[0]));

let pendingRows = [];

function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ({ target: { result } }) => {
    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(result);
        pendingRows = (Array.isArray(parsed) ? parsed : parsed.routes || [])
          .map(r => ({ from: r.From || r.from, to: r.To || r.to, distKm: parseFloat(r.DistanceKm ?? r.distanceKm ?? r.distance ?? 0) }))
          .filter(r => r.from && r.to);
      } else {
        const csv = Papa.parse(result, { header: true, skipEmptyLines: true });
        pendingRows = csv.data.map(r => ({
          from: (r.From || r.from || "").trim(),
          to:   (r.To   || r.to   || "").trim(),
          distKm: parseFloat(r.DistanceKm ?? r.distanceKm ?? r.distance ?? 0)
        })).filter(r => r.from && r.to);
      }
      dz.textContent = `✓ ${pendingRows.length} rows loaded from "${file.name}" — click Add loaded rows.`;
      document.getElementById("btn-add").disabled = pendingRows.length === 0;
    } catch (err) {
      dz.textContent = "Parse error: " + err.message;
    }
  };
  reader.readAsText(file);
}

/* Add loaded rows */
document.getElementById("btn-add").onclick = () => {
  edges.push(...pendingRows);
  pendingRows = [];
  document.getElementById("btn-add").disabled = true;
  dz.textContent = "Drop routes.csv/.json here or click to select";
  refreshRoutesTable();
  refreshCityDropdowns();
  drawRoutesPreview();
};

/* Manual add edge */
document.getElementById("btn-add-edge").onclick = () => {
  const from   = document.getElementById("fromCity").value.trim();
  const to     = document.getElementById("toCity").value.trim();
  const distKm = parseFloat(document.getElementById("dist").value);

  if (!from || !to)      { alert("Please enter both city names."); return; }
  if (isNaN(distKm) || distKm <= 0) { alert("Enter a valid distance."); return; }

  edges.push({ from, to, distKm });
  document.getElementById("fromCity").value = "";
  document.getElementById("toCity").value   = "";
  document.getElementById("dist").value     = "";

  refreshRoutesTable();
  refreshCityDropdowns();
  drawRoutesPreview();
};

/* Clear all edges */
document.getElementById("btn-clear").onclick = () => {
  if (!edges.length || confirm("Clear all unsaved edges?")) {
    edges = [];
    refreshRoutesTable();
    refreshCityDropdowns();
    drawRoutesPreview();
  }
};

/* Save edges to server */
document.getElementById("btn-save").onclick = async () => {
  if (!edges.length) { alert("No edges to save."); return; }
  try {
    const data = await API.post("http://127.0.0.1:5000/admin/routes", { routes: edges });
    alert(data.message || `Saved ${edges.length} edges to server.`);
  } catch (e) {
    alert("Save failed: " + e.message);
  }
};

/* Dijkstra test */
document.getElementById("btn-test").onclick = () => {
  const start = document.getElementById("spStart").value;
  const end   = document.getElementById("spEnd").value;
  const out   = document.getElementById("spOut");

  if (!start || !end)     { out.textContent = "Select both cities."; return; }
  if (start === end)      { out.textContent = "Start and end must be different."; return; }

  const result = dijkstra(edges, start, end);
  out.textContent = result
    ? `Path: ${result.path.join(" → ")}  |  Total: ${result.totalKm.toFixed(1)} km`
    : `No path found between ${start} and ${end}.`;
};

/* ================================================================
   ALLOCATIONS TAB  — FIX #2 (fully implemented)
   ================================================================ */

function populateAllocTable(rows) {
  const tbody = document.querySelector("#alloc tbody");
  tbody.innerHTML = rows.map(a => `
    <tr>
      <td>${a.sourceType  || ""}</td>
      <td>${a.source      || a.sourceCity || ""}</td>
      <td>${a.destType    || ""}</td>
      <td>${a.destination || a.destCity   || ""}</td>
      <td>${a.resource    || ""}</td>
      <td>${a.allocated   ?? ""}</td>
      <td><span class="status ${statusClass(a.status)}">${a.status || ""}</span></td>
      <td>${a.distanceKm != null ? Number(a.distanceKm).toFixed(1) : ""}</td>
    </tr>`).join("");

  /* Populate filter dropdowns */
  const cities = [...new Set(rows.map(a => a.source || a.sourceCity).filter(Boolean))];
  const areas  = [...new Set(rows.map(a => a.destination || a.destCity).filter(Boolean))];

  const fCity = document.getElementById("fCity");
  const fArea = document.getElementById("fArea");

  fCity.innerHTML = `<option value="">All</option>` + cities.map(c => `<option>${c}</option>`).join("");
  fArea.innerHTML = `<option value="">All</option>` + areas.map(a => `<option>${a}</option>`).join("");
}

function statusClass(s) {
  if (!s) return "";
  const l = s.toLowerCase();
  if (l === "met")     return "met";
  if (l === "partial") return "partial";
  return "unmet";
}

function filterAllocTable() {
  const city = document.getElementById("fCity").value;
  const area = document.getElementById("fArea").value;
  const filtered = allocations.filter(a => {
    const src  = a.source      || a.sourceCity   || "";
    const dest = a.destination || a.destCity      || "";
    return (!city || src === city) && (!area || dest === area);
  });
  const tbody = document.querySelector("#alloc tbody");
  tbody.innerHTML = filtered.map(a => `
    <tr>
      <td>${a.sourceType  || ""}</td>
      <td>${a.source      || a.sourceCity || ""}</td>
      <td>${a.destType    || ""}</td>
      <td>${a.destination || a.destCity   || ""}</td>
      <td>${a.resource    || ""}</td>
      <td>${a.allocated   ?? ""}</td>
      <td><span class="status ${statusClass(a.status)}">${a.status || ""}</span></td>
      <td>${a.distanceKm != null ? Number(a.distanceKm).toFixed(1) : ""}</td>
    </tr>`).join("");
}

document.getElementById("fCity").addEventListener("change", filterAllocTable);
document.getElementById("fArea").addEventListener("change", filterAllocTable);

/* Download CSV */
document.getElementById("downloadBtn").onclick = () => {
  const headers = ["SourceType","Source","DestType","Destination","Resource","Allocated","Status","DistanceKm"];
  const rows    = allocations.map(a => [
    a.sourceType  || "",
    a.source      || a.sourceCity   || "",
    a.destType    || "",
    a.destination || a.destCity     || "",
    a.resource    || "",
    a.allocated   ?? "",
    a.status      || "",
    a.distanceKm  != null ? Number(a.distanceKm).toFixed(1) : ""
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));

  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "allocations.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ================================================================
   INIT  — FIX #8: try/catch with graceful fallback
   ================================================================ */
(async function init() {
  const msg = document.getElementById("msg");
  try {
    const data = await API.get("http://127.0.0.1:5000/public/allocations");

    allocations        = data.allocations || [];
    window.allocations = allocations;      // FIX #5

    summary = data.summary || {};
    setKpis(summary);
    if (Object.keys(summary).length) buildBarChart(summary);
    drawNetwork(allocations);
    populateAllocTable(allocations);

    msg.textContent = allocations.length
      ? `Loaded ${allocations.length} allocations.`
      : "No allocations yet — click Run Allocation.";
  } catch (e) {
    msg.textContent = "Could not reach server. Click Run Allocation when ready.";
    setKpis({});
    drawNetwork([]);
  }

  window.addEventListener("resize", () => {
    if (document.getElementById("tab-overview").classList.contains("active")) {
      drawNetwork(window.allocations || []);
    }
    if (document.getElementById("tab-routes").classList.contains("active")) {
      drawRoutesPreview();
    }
  });
})();
