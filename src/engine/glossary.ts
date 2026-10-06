/** Dense mental-model reference — `concepts` / `glossary` in the terminal. */

export interface Concept {
  id: string;
  title: string;
  body: string;
}

export const CONCEPTS: Concept[] = [
  {
    id: 'purity',
    title: 'Purity',
    body: 'A pure function depends only on its inputs and always returns the same output for the same inputs, with no side effects (no printing, no mutation, no time, no random).',
  },
  {
    id: 'side-effect',
    title: 'Side effects',
    body: 'Any observable change outside the function: mutating state, I/O, time, randomness. FP does not ban effects — it pushes them to the edges of the program so the middle stays pure and testable.',
  },
  {
    id: 'referential-transparency',
    title: 'Referential transparency',
    body: 'A name can be replaced by its value without changing program behavior. This is what makes reasoning, inlining, and caching safe.',
  },
  {
    id: 'composition',
    title: 'Composition',
    body: 'Building bigger functions by gluing small ones: (f ∘ g)(x) = f(g(x)). Small pure pieces compose into any pipeline, and each stays independently testable.',
  },
  {
    id: 'higher-order',
    title: 'Higher-order functions',
    body: 'Functions as first-class values: they can be passed as arguments, returned, and stored. map/filter/fold are built on this.',
  },
  {
    id: 'map',
    title: 'map',
    body: 'Apply a function to every element of a collection, producing a new collection of the same shape. Pure: input list in, new list out.',
  },
  {
    id: 'filter',
    title: 'filter',
    body: 'Keep only the elements that pass a predicate. Also a new, smaller list. Combined with map, most "loops" become data transformations.',
  },
  {
    id: 'fold',
    title: 'fold (reduce)',
    body: 'Collapse a list to a single value by threading an accumulator through it: fold(0, +, [1,2,3]) = 6. The universal "loop" for immutable code.',
  },
  {
    id: 'closure',
    title: 'Closures',
    body: 'A function that remembers the variables from where it was created. Closures let you carry state functionally (as captured values) instead of in globals.',
  },
  {
    id: 'currying',
    title: 'Currying',
    body: 'Transforming a multi-argument function into a chain of single-argument functions: add(5)(3). It powers partial application and composition.',
  },
  {
    id: 'adt',
    title: 'Algebraic data types (ADT)',
    body: 'A closed set of tagged values — sum types (either a or b) built from product types (tuples/records). They make invalid states unrepresentable.',
  },
  {
    id: 'pattern-matching',
    title: 'Pattern matching',
    body: 'Deconstruct a value by its shape and bind its parts: match x { Circle(r) => pi*r^2; Rect(w,h) => w*h }. Exhaustive matching makes code total.',
  },
  {
    id: 'maybe',
    title: 'Maybe',
    body: 'A value that might be absent: Just(v) or None. Instead of null, you carry the "no value" case explicitly and compute over it without exceptions.',
  },
  {
    id: 'either',
    title: 'Either',
    body: 'A value that is one of two things: Right(success) or Left(error). It threads failures through a computation without try/catch.',
  },
  {
    id: 'monad',
    title: 'Monads & bind',
    body: 'A way to thread a "context" (maybe, either, io, list) through a sequence of pure steps. bind (flatMap) chains them, short-circuiting on failure.',
  },
  {
    id: 'io',
    title: 'IO',
    body: 'Quarantine side effects: an IO action is a *description* of an effect, not the effect. Only the top-level runner executes it — so the rest of the code stays pure.',
  },
  {
    id: 'laziness',
    title: 'Laziness',
    body: 'Defer computation until a value is needed. Enables infinite structures (streams) and works on only as much as you take.',
  },
  {
    id: 'recursion',
    title: 'Recursion',
    body: 'The FP replacement for loops: a function calls itself on a smaller input until it hits a base case. With pure functions and tail calls, it scales.',
  },
  {
    id: 'total',
    title: 'Total functions',
    body: 'A total function returns a defined result for every input in its domain. Total functions + pattern matching = no runtime surprises.',
  },
  {
    id: 'immutability',
    title: 'Immutability',
    body: 'Values are not mutated; a "change" produces a new value. This is what makes sharing, reasoning, and parallelism safe.',
  },
  {
    id: 'expressive-power',
    title: 'Why it matters',
    body: 'Purity + composition + values-as-data make code predictable, testable, and parallel. The tools (monads, ADTs, streams) are just disciplined ways to keep that purity.',
  },
];

export const CONCEPT_IDS = CONCEPTS.map((c) => c.id) as readonly string[];

export function formatConcepts(): string {
  return CONCEPTS.map((c, i) => `${i + 1}. ${c.title}\n   ${c.body}`).join('\n\n');
}

export function findConcept(query: string): Concept | undefined {
  const q = query.trim().toLowerCase();
  return CONCEPTS.find((c) => c.id === q || c.title.toLowerCase().includes(q) || c.id.replace(/-/g, ' ') === q);
}
