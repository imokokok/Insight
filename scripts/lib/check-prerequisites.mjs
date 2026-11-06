// Build-artifact prerequisites for the parallel check runner.
//
// Some checks read an artifact that another script produces. `knip`, `lint`, or
// `typecheck` never care, but `rwa:execution-profiles` imports `sdk/dist/index.js`
// and fails with `ERR_MODULE_NOT_FOUND` if the SDK build has not finished. With
// bounded parallelism that race is real, not a flake: a caller that omits the
// pre-build fails intermittently depending on scheduling.
//
// Declaring the edge here (sourced from package.json's `checkPrerequisites`) lets
// the scheduler run producers first for every caller, instead of relying on one
// npm script string to remember the `&&` prefix.

/**
 * Return the prerequisites that must finish before `requested` may start, in a
 * depth-first order (dependencies of dependencies first). Prerequisites that are
 * already requested are skipped; a cycle is an error rather than a silent drop.
 */
export function resolvePrerequisiteOrder(requested, graph) {
  const order = [];
  const planned = new Set(requested);
  const stack = new Set();

  const visit = (name) => {
    if (stack.has(name)) {
      throw new Error(`Cyclic check prerequisite involving ${name}`);
    }
    stack.add(name);
    for (const prerequisite of graph[name] ?? []) {
      if (planned.has(prerequisite)) continue;
      visit(prerequisite);
      planned.add(prerequisite);
      order.push(prerequisite);
    }
    stack.delete(name);
  };

  for (const name of requested) visit(name);
  return order;
}
