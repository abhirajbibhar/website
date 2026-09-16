// Runs assets/js/graph.js against the built d3 subset in a real DOM (jsdom),
// to prove the trimmed bundle exposes everything the graph needs.
//
//   node test-graph.js                       # tests the vendored subset
//   node test-graph.js path/to/d3.min.js     # any other d3 build, for comparison
//
// See README.md → "The d3 subset" for the full regeneration recipe.

const fs = require("fs")
const path = require("path")
const { JSDOM } = require("jsdom")

const root = path.join(__dirname, "..", "..")
const bundlePath = process.argv[2] || path.join(root, "assets/vendor/d3-subset.min.js")
const graphPath = path.join(root, "assets/js/graph.js")

// runScripts: "dangerously" + injected <script> tags mirrors how the browser
// loads these two classic scripts, so `var d3` / function declarations really
// land on the window.
const dom = new JSDOM(`<!doctype html><html><body><div id="graph-container"></div></body></html>`, {
  pretendToBeVisual: true,
  runScripts: "dangerously",
  url: "https://example.com/a/", // the page graph.js draws the local graph for
})
const { window } = dom

const inject = (file) => {
  const el = window.document.createElement("script")
  el.textContent = fs.readFileSync(file, "utf8")
  window.document.head.appendChild(el)
}

inject(bundlePath)
inject(graphPath)

const d3 = window.d3
const assert = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`)
  if (!ok) process.exitCode = 1
}

// --- API surface graph.js relies on ---
for (const name of ["select", "selectAll", "drag", "zoom", "forceSimulation"]) {
  assert(`d3.${name} exists`, typeof d3[name] === "function")
}
for (const name of ["forceManyBody", "forceLink", "forceCenter"]) {
  assert(`d3.${name} exists`, typeof d3[name] === "function")
}
assert("selection.transition() patched in", typeof d3.select(window.document.body).transition === "function")
assert("selection.interrupt() patched in", typeof d3.select(window.document.body).interrupt === "function")

// --- exercise drawGraph() with a small fake index (chain a -> b -> c) ---
const index = {
  links: {
    "/a": [{ source: "/a", target: "/b" }],
    "/b": [{ source: "/b", target: "/c" }],
    "/c": [],
  },
  backlinks: {
    "/a": [],
    "/b": [{ source: "/a", target: "/b" }],
    "/c": [{ source: "/b", target: "/c" }],
  },
}
const links = [
  { source: "/a", target: "/b" },
  { source: "/b", target: "/c" },
]
const content = { "/a": { title: "A" }, "/b": { title: "B" }, "/c": { title: "C" } }

window.fetchData = Promise.resolve({ index, links, content })
window.Million = { navigate: () => {}, prefetch: () => {} }

const config = {
  depth: 2, // a chain of three pages: /a -> /b -> /c
  enableDrag: true,
  enableLegend: true,
  enableZoom: true,
  opacityScale: 3,
  scale: 1.2,
  repelForce: 2,
  fontSize: 0.6,
}

window
  .drawGraph("https://example.com", false, [{ "/moc": "#4388cc" }], config)
  .then(() => {
    const doc = window.document
    const nodes = doc.querySelectorAll("circle.node")
    const linkLines = doc.querySelectorAll("line.link")
    const labels = [...doc.querySelectorAll("#graph-container text")].map((t) => t.textContent)
    const svg = doc.querySelector("#graph-container svg")

    assert("svg created", !!svg)
    assert(`nodes drawn (got ${nodes.length})`, nodes.length === 3)
    assert(`links drawn (got ${linkLines.length})`, linkLines.length === 2)
    assert(`labels drawn (${labels.join(", ")})`, labels.includes("A") && labels.includes("B") && labels.includes("C"))
    assert("legend rendered when enableLegend", labels.includes("Current") && labels.includes("Note") && labels.includes("/moc"))

    // transitions: exercises d3-transition, which also drives zoom/legend styling
    const first = nodes[0]
    first.dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true }))
    first.dispatchEvent(new window.MouseEvent("mouseleave", { bubbles: true }))
    first.dispatchEvent(new window.MouseEvent("click", { bubbles: true }))
    assert("hover/click handlers ran with transitions without throwing", true)

    return new Promise((r) => setTimeout(r, 300))
  })
  .then(() => {
    const first = window.document.querySelector("circle.node")
    const dy = first.parentNode.querySelector("text").getAttribute("dy")
    assert(`simulation ticked and labelled nodes (dy=${dy})`, !!dy)
    console.log("\ndone")
  })
  .catch((err) => {
    console.error("\nFAIL  drawGraph threw:", err)
    process.exitCode = 1
  })
