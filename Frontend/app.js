const API = "https://localhost:7013/api/solver";

const methods = {
  bisection: { label: "Bisection Method", endpoint: "bisection", type: "iter", fields: ["Xi", "Xu", "Error"], needsEq: true, hint: "f(Xi)*f(Xu) < 0" },
  falseposition: { label: "False Position Method", endpoint: "falseposition", type: "iter", fields: ["Xi", "Xu", "Error"], needsEq: true, hint: "f(Xi)*f(Xu) < 0" },
  newton: { label: "Newton Method", endpoint: "newton", type: "iter", fields: ["Xi", "Error"], needsEq: true, needsDer: true, hint: "f'(x) must not be zero" },
  fixedpoint: { label: "Fixed Point Method", endpoint: "fixedpoint", type: "iter", fields: ["Xi", "Error"], needsEq: true, hint: "Use g(x)" },
  gauss: { label: "Gauss Elimination", endpoint: "gauss", type: "linear", fields: ["A11","A12","A13","A14","A21","A22","A23","A24","A31","A32","A33","A34"], hint: "[A|b] 3x4" },
  lu: { label: "LU Decomposition", endpoint: "lu", type: "linear", fields: ["A11","A12","A13","A14","A21","A22","A23","A24","A31","A32","A33","A34"], hint: "det(A) != 0" },
  cramer: { label: "Cramer's Rule", endpoint: "cramer", type: "linear", fields: ["A11","A12","A13","A14","A21","A22","A23","A24","A31","A32","A33","A34"], hint: "det(A) != 0" }
};

let current = "bisection";
let lastRows = [];
let lastLinear = {};

const plot = { expr: "", xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
const pan = { active: false, sx: 0, sy: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };

const tabs = document.getElementById("tabs");
const dynamicFields = document.getElementById("dynamicFields");
const equationField = document.getElementById("equationField");
const derivativeField = document.getElementById("derivativeField");
const equationInput = document.getElementById("equation");
const derivativeInput = document.getElementById("derivative");
const msg = document.getElementById("msg");
const hint = document.getElementById("hint");
const badge = document.getElementById("badge");
const summary = document.getElementById("summary");
const thead = document.querySelector("#resultTable thead");
const tbody = document.querySelector("#resultTable tbody");
const chartCard = document.getElementById("chartCard");
const canvas = document.getElementById("plot");
const ctx = canvas.getContext("2d");
const toast = document.getElementById("toast");
const solveBtn = document.getElementById("solveBtn");
const themeDark = document.getElementById("themeDark");
const themeLight = document.getElementById("themeLight");
const actionsBar = document.querySelector(".actions");
const csvBtn = document.getElementById("csvBtn");

themeDark.onclick = () => setTheme("dark");
themeLight.onclick = () => setTheme("light");

document.getElementById("pdfBtn").onclick = exportPDF;
document.getElementById("clearBtn").onclick = clearAll;
document.getElementById("sampleBtn").onclick = fillSampleData;
document.getElementById("copyBtn").onclick = copyResult;
document.getElementById("csvBtn").onclick = csvDownload;
document.getElementById("zoomInBtn").onclick = () => zoom(0.85);
document.getElementById("zoomOutBtn").onclick = () => zoom(1.18);
document.getElementById("resetPlotBtn").onclick = resetPlot;
solveBtn.onclick = solve;

canvas.style.cursor = "grab";
canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.9 : 1.12); }, { passive: false });

canvas.addEventListener("mousedown", (e) => {
  pan.active = true;
  canvas.style.cursor = "grabbing";
  pan.sx = e.offsetX; pan.sy = e.offsetY;
  pan.xMin = plot.xMin; pan.xMax = plot.xMax;
  pan.yMin = plot.yMin; pan.yMax = plot.yMax;
});

canvas.addEventListener("mousemove", (e) => {
  if (!pan.active) return;
  const W = canvas.width, H = canvas.height;
  const dx = e.offsetX - pan.sx;
  const dy = e.offsetY - pan.sy;
  const xr = pan.xMax - pan.xMin;
  const yr = pan.yMax - pan.yMin;
  plot.xMin = pan.xMin - (dx / W) * xr;
  plot.xMax = pan.xMax - (dx / W) * xr;
  plot.yMin = pan.yMin + (dy / H) * yr;
  plot.yMax = pan.yMax + (dy / H) * yr;
  redrawPlot();
});

window.addEventListener("mouseup", () => {
  pan.active = false;
  canvas.style.cursor = "grab";
});

function setTheme(mode) {
  document.body.dataset.theme = mode;
  themeDark.classList.toggle("active", mode === "dark");
  themeLight.classList.toggle("active", mode === "light");
  redrawPlot();
}

function t(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
}

function setBadge(ok, txt) {
  badge.className = "badge " + (ok ? "ok" : "bad");
  badge.textContent = txt;
}

function clearBadge() {
  badge.className = "badge";
  badge.textContent = "";
}

function initTabs() {
  Object.keys(methods).forEach((k) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.textContent = methods[k].label;
    b.dataset.key = k;
    b.onclick = () => { current = k; renderForm(); };
    tabs.appendChild(b);
  });
  renderForm();
  setTheme("dark");
}

function renderForm() {
  [...tabs.children].forEach((x) => x.classList.toggle("active", x.dataset.key === current));
  const m = methods[current];

  equationField.style.display = m.needsEq ? "block" : "none";
  derivativeField.style.display = m.needsDer ? "block" : "none";
  chartCard.style.display = m.needsEq ? "block" : "none";
  hint.textContent = m.hint || "";
  dynamicFields.innerHTML = "";

  const isLinear = m.type === "linear";
  csvBtn.style.display = isLinear ? "none" : "";
  actionsBar.classList.toggle("no-csv", isLinear);

  if (m.type === "linear") {
    dynamicFields.innerHTML = `
      <div class="matrix-shell"><div class="matrix-panel">
      <p class="matrix-title">Augmented Matrix [A | b]</p>
      ${[1,2,3].map(r => `
      <div class="matrix-row">
        <span class="bracket">[</span>
        <input id="A${r}1" type="number" step="any" />
        <input id="A${r}2" type="number" step="any" />
        <input id="A${r}3" type="number" step="any" />
        <span class="bar">|</span><span class="b-tag">b${r}</span>
        <input id="A${r}4" class="b-col" type="number" step="any" />
        <span class="bracket">]</span>
      </div>`).join("")}
      </div></div>`;
  } else {
    m.fields.forEach((f) => {
      const d = document.createElement("div");
      d.className = "field";
      d.innerHTML = `<label>${f}</label><input id="${f}" type="number" step="any" />`;
      dynamicFields.appendChild(d);
    });
  }

  clearOutput();
  resetPlot();
}

function payload() {
  const m = methods[current], p = {};
  if (m.needsEq) p.Equation = equationInput.value.trim();
  if (m.needsDer) p.Derivative = derivativeInput.value.trim();
  m.fields.forEach((f) => p[f] = Number(document.getElementById(f).value));
  if (current === "fixedpoint" && !("Xu" in p)) p.Xu = 0;
  return p;
}

function validate(m, p) {
  if (m.needsEq && !p.Equation) return "Equation is required";
  if (m.needsDer && !p.Derivative) return "Derivative is required";
  for (const f of m.fields) if (Number.isNaN(p[f])) return `${f} is required`;
  if ("Error" in p && p.Error <= 0) return "Error must be > 0";
  return "";
}

async function solve() {
  msg.textContent = "";
  clearOutput();

  const m = methods[current], p = payload(), v = validate(m, p);
  if (v) { msg.textContent = v; setBadge(false, "Invalid input"); return; }

  solveBtn.disabled = true;
  solveBtn.textContent = "Solving...";

  try {
    const r = await fetch(`${API}/${m.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");

    if (m.type === "linear") renderLinear(data);
    else renderIter(data);

    if (m.needsEq) fitPlot(equationInput.value.trim());

    setBadge(true, "Success");
    t("Solved");
  } catch (e) {
    msg.textContent = e.message;
    setBadge(false, "Error");
    t("Failed");
  } finally {
    solveBtn.disabled = false;
    solveBtn.textContent = "Solve";
  }
}

function fillSampleData() {
  const sample = {
    bisection: { Equation: "x*x-4", Xi: 0, Xu: 5, Error: 0.001 },
    falseposition: { Equation: "x*x-4", Xi: 0, Xu: 5, Error: 0.001 },
    newton: { Equation: "x*x-4", Derivative: "2*x", Xi: 3, Error: 0.001 },
    fixedpoint: { Equation: "(x+4/x)/2", Xi: 3, Error: 0.001 },
    gauss: { A11:2,A12:1,A13:-1,A14:8,A21:-3,A22:-1,A23:2,A24:-11,A31:-2,A32:1,A33:2,A34:-3 },
    lu: { A11:2,A12:1,A13:-1,A14:8,A21:-3,A22:-1,A23:2,A24:-11,A31:-2,A32:1,A33:2,A34:-3 },
    cramer: { A11:2,A12:1,A13:-1,A14:8,A21:-3,A22:-1,A23:2,A24:-11,A31:-2,A32:1,A33:2,A34:-3 }
  }[current];

  if (sample.Equation) equationInput.value = sample.Equation;
  if (sample.Derivative) derivativeInput.value = sample.Derivative;

  methods[current].fields.forEach((f) => {
    const input = document.getElementById(f);
    if (input && sample[f] !== undefined) input.value = sample[f];
  });

  t("Sample Data Loaded");
}

function renderLinear(obj) {
  lastLinear = obj;
  lastRows = [];
  const keys = Object.keys(obj);
  thead.innerHTML = `<tr>${keys.map(k => `<th>${k}</th>`).join("")}</tr>`;
  tbody.innerHTML = `<tr>${keys.map(k => `<td>${fmt(obj[k])}</td>`).join("")}</tr>`;
  summary.textContent = "Linear system solved.";
}

function renderIter(arr) {
  lastRows = arr;
  lastLinear = {};

  const rows = arr.map((r, i) => ({ No: i + 1, ...r }));
  let keys = ["No", ...new Set(rows.flatMap(o => Object.keys(o)).filter(k => k !== "No"))];

  if (current !== "newton") keys = keys.filter(k => k !== "Fdx" && k !== "f'(x)");
  if (keys.includes("Fdx") && keys.includes("f'(x)")) keys = keys.filter(k => k !== "Fdx");

  thead.innerHTML = `<tr>${keys.map(k => `<th>${k}</th>`).join("")}</tr>`;
  tbody.innerHTML = rows.map(r => `<tr>${keys.map(k => `<td>${cell(k, r[k])}</td>`).join("")}</tr>`).join("");
  summary.textContent = `Iterations: ${arr.length} | Root ≈ ${fmt(arr[arr.length - 1].XR ?? 0)}`;
}

function cell(k, v) {
  if (k === "No") return String(Number(v));
  return typeof v === "number" ? fmt(v) : (v ?? "");
}

function copyResult() {
  const header = [...thead.querySelectorAll("th")].map(x => x.textContent).join("\t");
  const rows = [...tbody.querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.textContent).join("\t")).join("\n");
  const txt = [summary.textContent, header, rows].filter(Boolean).join("\n");
  if (!txt) return t("No data");
  navigator.clipboard.writeText(txt).then(() => t("Copied"));
}

function csvDownload() {
  let lines = [];
  if (lastRows.length) {
    const rows = lastRows.map((r, i) => ({ No: i + 1, ...r }));
    let keys = ["No", ...new Set(rows.flatMap(o => Object.keys(o)).filter(k => k !== "No"))];
    if (current !== "newton") keys = keys.filter(k => k !== "Fdx" && k !== "f'(x)");
    lines.push(keys.join(","));
    rows.forEach(r => lines.push(keys.map(k => JSON.stringify(r[k] ?? "")).join(",")));
  } else if (Object.keys(lastLinear).length) {
    const keys = Object.keys(lastLinear);
    lines.push(keys.join(","));
    lines.push(keys.map(k => lastLinear[k]).join(","));
  } else return t("No data");

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `numerical_${current}.csv`;
  a.click();
}

function exportPDF() {
  const m = methods[current];
  const isLinear = m.type === "linear";

  let inputsHtml = "";
  if (isLinear) {
    const g = (id) => document.getElementById(id)?.value ?? "";
    inputsHtml = `
      <h3>Input Matrix [A|b]</h3>
      <table>
        <thead>
          <tr>
            <th>A11</th><th>A12</th><th>A13</th><th>b1</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>${g("A11")}</td><td>${g("A12")}</td><td>${g("A13")}</td><td>${g("A14")}</td></tr>
          <tr><td>${g("A21")}</td><td>${g("A22")}</td><td>${g("A23")}</td><td>${g("A24")}</td></tr>
          <tr><td>${g("A31")}</td><td>${g("A32")}</td><td>${g("A33")}</td><td>${g("A34")}</td></tr>
        </tbody>
      </table>
    `;
  } else {
    const eq = equationInput.value || "-";
    const der = derivativeInput.value || "-";
    const vals = m.fields.map(f => `<li><strong>${f}:</strong> ${document.getElementById(f)?.value ?? "-"}</li>`).join("");
    inputsHtml = `
      <h3>Inputs</h3>
      <ul>
        <li><strong>Equation / g(x):</strong> ${eq}</li>
        ${m.needsDer ? `<li><strong>Derivative:</strong> ${der}</li>` : ""}
        ${vals}
      </ul>
    `;
  }

  const tableHtml = document.getElementById("resultTable").outerHTML;
  const summaryText = summary.textContent || "";

  const html = `
  <html>
  <head>
    <title>Numerical Solver Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 18px; color: #111; }
      h1,h2,h3 { margin: 0 0 10px; }
      .meta { margin-bottom: 14px; color: #444; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; }
      th, td { border: 1px solid #999; padding: 7px; text-align: center; }
      th { background: #f2f2f2; }
      ul { margin: 8px 0 18px 20px; }
      .section { margin-top: 16px; }
    </style>
  </head>
  <body>
    <h1>Numerical Solver Report</h1>
    <div class="meta"><strong>Method:</strong> ${m.label}</div>

    <div class="section">
      ${inputsHtml}
    </div>

    <div class="section">
      <h3>Result</h3>
      ${summaryText ? `<p><strong>Summary:</strong> ${summaryText}</p>` : ""}
      ${tableHtml}
    </div>
  </body>
  </html>`;

  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

function clearOutput() {
  thead.innerHTML = "";
  tbody.innerHTML = "";
  summary.textContent = "";
  clearBadge();
}

function clearAll() {
  equationInput.value = "";
  derivativeInput.value = "";
  msg.textContent = "";
  [...dynamicFields.querySelectorAll("input")].forEach(x => x.value = "");
  clearOutput();
  resetPlot();
}

function fmt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : "";
}

/* Plot */
function resetPlot() {
  plot.xMin = -6; plot.xMax = 6; plot.yMin = -6; plot.yMax = 6;
  plot.expr = equationInput.value.trim() || "";
  drawAxes();
}

function zoom(f) {
  const cx = (plot.xMin + plot.xMax) / 2;
  const cy = (plot.yMin + plot.yMax) / 2;
  const hx = ((plot.xMax - plot.xMin) / 2) * f;
  const hy = ((plot.yMax - plot.yMin) / 2) * f;
  plot.xMin = cx - hx; plot.xMax = cx + hx;
  plot.yMin = cy - hy; plot.yMax = cy + hy;
  redrawPlot();
}

function redrawPlot() {
  if (!plot.expr) return drawAxes();
  drawFunction(plot.expr);
}

function fitPlot(expr) {
  plot.expr = expr;
  const f = compile(expr);
  if (!f) return drawAxes();

  let xMin = -6, xMax = 6;
  const xi = Number(document.getElementById("Xi")?.value);
  const xu = Number(document.getElementById("Xu")?.value);

  if (Number.isFinite(xi) && Number.isFinite(xu) && xi !== xu) {
    const lo = Math.min(xi, xu), hi = Math.max(xi, xu), pad = Math.max(1, (hi - lo) * 0.5);
    xMin = lo - pad; xMax = hi + pad;
  }

  const s = sample(f, xMin, xMax, 1400);
  const finite = s.ys.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return drawAxes();

  let yMin = q(finite, 0.05), yMax = q(finite, 0.95);
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || Math.abs(yMax - yMin) < 1e-9) { yMin = -6; yMax = 6; }
  const pad = (yMax - yMin) * 0.2;
  yMin -= pad; yMax += pad;

  plot.xMin = xMin; plot.xMax = xMax; plot.yMin = yMin; plot.yMax = yMax;
  drawFunction(expr);
}

function compile(expr) {
  try { return new Function("x", `return ${expr.replace(/\^/g, "**")};`); }
  catch { return null; }
}

function sample(f, xMin, xMax, n) {
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + (i / n) * (xMax - xMin);
    let y = NaN;
    try { y = f(x); } catch {}
    xs.push(x); ys.push(Number.isFinite(y) ? y : NaN);
  }
  return { xs, ys };
}

function drawAxes() {
  drawAxesGrid(plot.xMin, plot.xMax, plot.yMin, plot.yMax);
}

function drawFunction(expr) {
  const f = compile(expr);
  if (!f) return drawAxes();

  const { xMin, xMax, yMin, yMax } = plot;
  drawAxesGrid(xMin, xMax, yMin, yMax);

  const W = canvas.width, H = canvas.height;
  const px = x => ((x - xMin) / (xMax - xMin)) * W;
  const py = y => H - ((y - yMin) / (yMax - yMin)) * H;
  const s = sample(f, xMin, xMax, 1700);

  ctx.save();
  ctx.strokeStyle = "#2d7fff";
  ctx.lineWidth = 2.6;
  ctx.beginPath();

  let started = false, prev = null;
  for (let i = 0; i < s.xs.length; i++) {
    const y = s.ys[i];
    if (!Number.isFinite(y)) { started = false; prev = null; continue; }
    const X = px(s.xs[i]), Y = py(y);
    if (prev !== null && Math.abs(Y - prev) > H * 0.35) started = false;
    if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
    prev = Y;
  }
  ctx.stroke();

  if (lastRows.length) {
    const xr = lastRows[lastRows.length - 1].XR;
    if (Number.isFinite(xr) && xr >= xMin && xr <= xMax) {
      let yr = NaN;
      try { yr = f(xr); } catch {}
      if (Number.isFinite(yr)) {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(px(xr), py(yr), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawAxesGrid(xMin, xMax, yMin, yMax) {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const px = x => ((x - xMin) / (xMax - xMin)) * W;
  const py = y => H - ((y - yMin) / (yMax - yMin)) * H;
  const sx = nice((xMax - xMin) / 10), sy = nice((yMax - yMin) / 8);

  ctx.save();
  ctx.strokeStyle = "rgba(130,150,190,.25)";
  ctx.lineWidth = 1;

  for (let x = Math.ceil(xMin / sx) * sx; x <= xMax; x += sx) {
    const X = px(x);
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
  }
  for (let y = Math.ceil(yMin / sy) * sy; y <= yMax; y += sy) {
    const Y = py(y);
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
  }

  ctx.strokeStyle = "rgba(220,230,255,.75)";
  ctx.lineWidth = 1.5;
  if (0 >= xMin && 0 <= xMax) {
    const X0 = px(0);
    ctx.beginPath(); ctx.moveTo(X0, 0); ctx.lineTo(X0, H); ctx.stroke();
  }
  if (0 >= yMin && 0 <= yMax) {
    const Y0 = py(0);
    ctx.beginPath(); ctx.moveTo(0, Y0); ctx.lineTo(W, Y0); ctx.stroke();
  }

  ctx.font = "12px Segoe UI";
  ctx.fillStyle = "rgba(200,215,245,.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = Math.ceil(xMin / sx) * sx; x <= xMax; x += sx) {
    if (Math.abs(x) < 1e-9) continue;
    ctx.fillText(clean(x), px(x), (0 >= yMin && 0 <= yMax) ? py(0) + 6 : H - 16);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = Math.ceil(yMin / sy) * sy; y <= yMax; y += sy) {
    if (Math.abs(y) < 1e-9) continue;
    ctx.fillText(clean(y), (0 >= xMin && 0 <= xMax) ? px(0) - 6 : 34, py(y));
  }

  ctx.restore();
}

function q(a, p) {
  const i = (a.length - 1) * p;
  const b = Math.floor(i), r = i - b;
  return a[b + 1] !== undefined ? a[b] + r * (a[b + 1] - a[b]) : a[b];
}

function nice(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  if (n <= 1) return 1 * p;
  if (n <= 2) return 2 * p;
  if (n <= 5) return 5 * p;
  return 10 * p;
}

function clean(v) {
  return Number(v.toFixed(6)).toString();
}

initTabs();
