/**
 * Language-agnostic core, concrete language examples.
 * Each concept maps to short, honest snippets in R and Python so learners see the
 * idea in languages they may already use.
 */

export type Lang = 'r' | 'py';

export interface CodeExample {
  title: string;
  snippets: Partial<Record<Lang, string>>;
}

const EX: Record<string, CodeExample> = {
  pure: {
    title: 'Pure functions',
    snippets: {
      r: 'double <- function(n) n * 2\n# same input → same output, no side effects\ndouble(5)   # 10',
      py: 'def double(n):\n    return n * 2\n# same input -> same output, no side effects\ndouble(5)   # 10',
    },
  },
  impure: {
    title: 'Impure functions',
    snippets: {
      r: 'count <- 0\ninc <- function() { count <<- count + 1; count }\ninc()  # 1\ninc()  # 2  <- depends on hidden state!',
      py: 'count = 0\ndef inc():\n    global count\n    count += 1\n    return count\ninc()  # 1\ninc()  # 2  <- depends on hidden state!',
    },
  },
  composition: {
    title: 'Composition',
    snippets: {
      r: 'inc <- function(x) x + 1\ndouble <- function(x) x * 2\ninc_double <- function(x) inc(double(x))\n# (inc . double) 5  ==  11',
      py: 'def inc(x): return x + 1\ndef double(x): return x * 2\n# (inc . double) 5  ==  11\nfrom functools import compose_left\ninc_double = compose_left(inc, double)',
    },
  },
  higherorder: {
    title: 'Higher-order functions',
    snippets: {
      r: 'apply <- function(f, x) f(x)   # a function that takes a function\napply(double, 5)  # 10',
      py: 'def apply(f, x):  # a function that takes a function\n    return f(x)\napply(double, 5)  # 10',
    },
  },
  map: {
    title: 'map',
    snippets: {
      r: 'double <- function(n) n * 2\nmap(double, list(1, 2, 3))  # list(2, 4, 6)',
      py: 'def double(n): return n * 2\nlist(map(double, [1, 2, 3]))  # [2, 4, 6]',
    },
  },
  filter: {
    title: 'filter',
    snippets: {
      r: 'is_even <- function(x) x %% 2 == 0\nFilter(is_even, list(1, 2, 3, 4))  # list(2, 4)',
      py: 'def is_even(x): return x % 2 == 0\nlist(filter(is_even, [1, 2, 3, 4]))  # [2, 4]',
    },
  },
  fold: {
    title: 'fold / reduce',
    snippets: {
      r: 'add <- function(a, b) a + b\nReduce(add, list(1, 2, 3, 4))  # 10',
      py: 'from functools import reduce\ndef add(a, b): return a + b\nreduce(add, [1, 2, 3, 4])  # 10',
    },
  },
  closure: {
    title: 'Closures',
    snippets: {
      r: 'adder <- function(n) function(x) x + n\nadd5 <- adder(5)\nadd5(10)  # 15   <- captured n = 5',
      py: 'def adder(n):\n    def add(x):\n        return x + n\n    return add\nadd5 = adder(5)\nadd5(10)  # 15   <- captured n = 5',
    },
  },
  currying: {
    title: 'Currying',
    snippets: {
      r: 'add <- function(a) function(b) a + b\nadd(5)(3)  # 8   <- one arg at a time',
      py: 'def add(a):\n    def _add(b): return a + b\n    return _add\nadd(5)(3)  # 8   <- one arg at a time',
    },
  },
  patternmatching: {
    title: 'Pattern matching',
    snippets: {
      r: 'match(x, "a" = 1, "b" = 2, default = 0)',
      py: 'match x:          # Python 3.10+\n    case 1: return "one"\n    case 2: return "two"\n    case _: return "other"',
    },
  },
  adt: {
    title: 'Algebraic data types',
    snippets: {
      r: 'shape <- list(kind = "circle", r = 3)  # tagged union\narea <- function(s)\n  switch(s$kind, circle = pi * s$r^2, rect = s$w * s$h)',
      py: 'from dataclasses import dataclass\n@dataclass\nclass Circle: r: float\n@dataclass\nclass Rect:  w: float; h: float\ndef area(s):\n    if isinstance(s, Circle): return 3.14159 * s.r ** 2\n    if isinstance(s, Rect):   return s.w * s.h',
    },
  },
  maybe: {
    title: 'Maybe (optional value)',
    snippets: {
      r: '# NULL is the "no value"; map/filter lift over it\nsafe_div <- function(a, b) if (b == 0) NA else a / b\nsafe_div(1, 0)  # NA   <- no crash',
      py: 'from typing import Optional\ndef safe_div(a, b) -> Optional[float]:\n    return a / b if b else None\nsafe_div(1, 0)  # None   <- no crash',
    },
  },
  either: {
    title: 'Either (error handling)',
    snippets: {
      r: 'parse <- function(s) {\n  x <- as.numeric(s)\n  if (is.na(x)) list(ok = FALSE, err = "bad number")\n  else           list(ok = TRUE,  val = x)\n}',
      py: 'def parse(s):\n    try:\n        return {"ok": True, "val": float(s)}\n    except ValueError:\n        return {"ok": False, "err": "bad number"}',
    },
  },
  monad: {
    title: 'Monads (bind / flatMap)',
    snippets: {
      r: 'safe_div <- function(a, b) if (b == 0) NULL else a / b\n# chain with bind; a failure short-circuits the rest\nlibrary(magrittr)\nsafe_div(10, 2) %>% safe_div(0)',
      py: 'def safe_div(a, b):  # returns Optional\n    return a / b if b else None\nfrom functools import reduce\n# chain: None propagates without a crash',
    },
  },
  io: {
    title: 'IO (contained side effects)',
    snippets: {
      r: '# side effects happen at the program boundary\nmain <- function() {\n  line <- readLine()      # the IO\n  cat(strtoi(line) * 2)   # effect, kept at the edge\n}',
      py: '# side effects happen at the program boundary\ndef main():\n    line = input()          # the IO\n    print(int(line) * 2)    # effect, kept at the edge',
    },
  },
  laziness: {
    title: 'Lazy evaluation',
    snippets: {
      r: 'ones <- function(x = 1) { x; stopifnot() }  # lazy args\nforce_it <- function(x) x\nforce_it(ones())  # 1   <- evaluated once, on demand',
      py: 'def ones():   # generator = lazy\n    x = 1\n    while True:\n        yield x\n        x += 1\nfrom itertools import islice\nlist(islice(ones(), 5))  # [1, 2, 3, 4, 5]',
    },
  },
  recursion: {
    title: 'Recursion',
    snippets: {
      r: 'fact <- function(n) if (n <= 1) 1 else n * fact(n - 1)\nfact(5)  # 120',
      py: 'def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\nfact(5)  # 120',
    },
  },
};

/** Return a formatted code block for a concept, optionally in a specific language. */
export function codeFor(topic: string, lang: Lang | null): string | null {
  const key = topic.trim().toLowerCase();
  const ex = EX[key];
  if (!ex) return null;
  const lines: string[] = [`── ${ex.title} ──`];
  const langs: Lang[] = lang ? [lang] : (['r', 'py'] as const);
  for (const l of langs) {
    const snip = ex.snippets[l];
    if (!snip) continue;
    lines.push(l === 'r' ? '```r' : '```python');
    lines.push(snip);
    lines.push('```');
  }
  if (langs.length === 2) {
    // keep a blank separator between the two blocks
    return lines.join('\n').replace('```\n```', '```\n\n```');
  }
  return lines.join('\n');
}

export const CONCEPT_TOPICS = Object.keys(EX);
