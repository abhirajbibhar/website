// Entry point for the slim d3 build used by assets/js/graph.js.
//
// Only the modules that file actually touches are re-exported. Importing
// d3-transition is also required for its side effect: it patches the selection
// prototype with .transition() / .interrupt(), which graph.js relies on.
//
// Module versions match d3 6.7.0's own dependency ranges, so behaviour is
// identical to the full d3 6.7.0 bundle it replaces.

export {
  select,
  selectAll,
  create,
  creator,
  local,
  matcher,
  namespace,
  namespaces,
  pointer,
  pointers,
  style,
  window,
} from "d3-selection"

export { transition, active, interrupt } from "d3-transition"

export { drag, dragDisable, dragEnable } from "d3-drag"

export { zoom, zoomIdentity, zoomTransform } from "d3-zoom"

export { forceSimulation, forceManyBody, forceLink, forceCenter } from "d3-force"
