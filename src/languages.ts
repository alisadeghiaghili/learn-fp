/**
 * Language-agnostic core, concrete language examples.
 * Each concept maps to short, honest snippets in several languages so learners
 * see the idea in languages they may already use. Where a language has no native
 * construct for a concept (e.g. Clojure has no ADT/Maybe), the snippet shows the
 * idiomatic equivalent and says so — that comparison is part of the lesson.
 */

export type Lang = 'r' | 'py' | 'hs' | 'clj' | 'ex';

/** The full set of supported tracks, in display order. */
export const LANGS: Lang[] = ['r', 'py', 'hs', 'clj', 'ex'];

export const LANG_LABELS: Record<Lang, string> = {
  r: 'R',
  py: 'Python',
  hs: 'Haskell',
  clj: 'Clojure',
  ex: 'Elixir',
};

/** Code-fence language for rendering each track. */
const FENCE: Record<Lang, string> = { r: 'r', py: 'python', hs: 'haskell', clj: 'clojure', ex: 'elixir' };

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
      hs: 'double n = n * 2\n-- pure by default: same input -> same output\ndouble 5   -- 10',
      clj: '(defn double [n] (* n 2))\n(double 5)   ; 10  -- pure by default',
      ex: 'defmodule Math do\n  def double(n), do: n * 2\nend\nMath.double(5)   # 10',
    },
  },
  impure: {
    title: 'Impure functions',
    snippets: {
      r: 'count <- 0\ninc <- function() { count <<- count + 1; count }\ninc()  # 1\ninc()  # 2  <- depends on hidden state!',
      py: 'count = 0\ndef inc():\n    global count\n    count += 1\n    return count\ninc()  # 1\ninc()  # 2  <- depends on hidden state!',
      hs: '-- In Haskell, impurity is quarantined in IO (or a State monad):\nmain = do\n  c <- get\n  put (c + 1)',
      clj: '(def c (atom 0))\n(defn inc [] (swap! c inc))\n(inc)  ; 1\n(inc)  ; 2  ; depends on the atom',
      ex: 'defmodule Counter do\n  use Agent\n  def inc, do: Agent.update(__MODULE__, fn c -> c + 1 end)\nend',
    },
  },
  composition: {
    title: 'Composition',
    snippets: {
      r: 'inc <- function(x) x + 1\ndouble <- function(x) x * 2\ninc_double <- function(x) inc(double(x))\n# (inc . double) 5  ==  11',
      py: 'def inc(x): return x + 1\ndef double(x): return x * 2\n# (inc . double) 5  ==  11\nfrom functools import compose_left\ninc_double = compose_left(inc, double)',
      hs: 'inc x    = x + 1\ndouble x = x * 2\n\n(double . inc) 5   -- 11  (apply inc, then double)',
      clj: '((comp inc double) 5)   ; 11  ; inc(double(5))',
      ex: 'defmodule M do\n  def inc(x), do: x + 1\n  def double(x), do: x * 2\n  def inc_double(x), do: inc(double(x))\nend\nM.inc_double(5)   # 11',
    },
  },
  higherorder: {
    title: 'Higher-order functions',
    snippets: {
      r: 'apply <- function(f, x) f(x)   # a function that takes a function\napply(double, 5)  # 10',
      py: 'def apply(f, x):  # a function that takes a function\n    return f(x)\napply(double, 5)  # 10',
      hs: 'apply f x = f x\napply double 5   -- 10',
      clj: '(defn apply [f x] (f x))\n(apply double 5)  ; 10',
      ex: 'defmodule M do\n  def apply(f, x), do: f.(x)\nend\nM.apply(&Math.double/1, 5)   # 10',
    },
  },
  map: {
    title: 'map',
    snippets: {
      r: 'double <- function(n) n * 2\nmap(double, list(1, 2, 3))  # list(2, 4, 6)',
      py: 'def double(n): return n * 2\nlist(map(double, [1, 2, 3]))  # [2, 4, 6]',
      hs: 'double x = x * 2\nmap double [1,2,3]   -- [2,4,6]',
      clj: '(map double [1 2 3])   ; (2 4 6)',
      ex: 'defmodule M do\n  def double(n), do: n * 2\nend\nEnum.map([1, 2, 3], &M.double/1)   # [2, 4, 6]',
    },
  },
  filter: {
    title: 'filter',
    snippets: {
      r: 'is_even <- function(x) x %% 2 == 0\nFilter(is_even, list(1, 2, 3, 4))  # list(2, 4)',
      py: 'def is_even(x): return x % 2 == 0\nlist(filter(is_even, [1, 2, 3, 4]))  # [2, 4]',
      hs: 'filter even [1..4]   -- [2,4]',
      clj: '(filter even? [1 2 3 4])   ; (2 4)',
      ex: 'Enum.filter([1, 2, 3, 4], &even?/1)   # [2, 4]',
    },
  },
  fold: {
    title: 'fold / reduce',
    snippets: {
      r: 'add <- function(a, b) a + b\nReduce(add, list(1, 2, 3, 4))  # 10',
      py: 'from functools import reduce\ndef add(a, b): return a + b\nreduce(add, [1, 2, 3, 4])  # 10',
      hs: 'foldr (+) 0 [1..4]   -- 10',
      clj: '(reduce + [1 2 3 4])   ; 10',
      ex: 'Enum.reduce([1, 2, 3, 4], 0, fn a, b -> a + b end)   # 10',
    },
  },
  closure: {
    title: 'Closures',
    snippets: {
      r: 'adder <- function(n) function(x) x + n\nadd5 <- adder(5)\nadd5(10)  # 15   <- captured n = 5',
      py: 'def adder(n):\n    def add(x):\n        return x + n\n    return add\nadd5 = adder(5)\nadd5(10)  # 15   <- captured n = 5',
      hs: 'adder n = \\x -> x + n\nadd5 = adder 5\nadd5 10   -- 15  (captured n = 5)',
      clj: '(defn adder [n] #(+ % n))\n(def add5 (adder 5))\n(add5 10)   ; 15  (captured n = 5)',
      ex: 'defmodule M do\n  def adder(n), do: fn x -> x + n end\nend\nM.adder(5).(10)   # 15  (captured n = 5)',
    },
  },
  currying: {
    title: 'Currying',
    snippets: {
      r: 'add <- function(a) function(b) a + b\nadd(5)(3)  # 8   <- one arg at a time',
      py: 'def add(a):\n    def _add(b): return a + b\n    return _add\nadd(5)(3)  # 8   <- one arg at a time',
      hs: 'add a b = a + b\nadd5 = add 5      -- inherently curried\nadd5 3   -- 8',
      clj: '(defn add [a b] (+ a b))\n((partial add 5) 3)   ; 8  (partial application)',
      ex: 'defmodule M do\n  def add(a, b), do: a + b\nend\nadd5 = curry(&M.add/2, 5)\nadd5.(3)   # 8',
    },
  },
  patternmatching: {
    title: 'Pattern matching',
    snippets: {
      r: 'match(x, "a" = 1, "b" = 2, default = 0)',
      py: 'match x:          # Python 3.10+\n    case 1: return "one"\n    case 2: return "two"\n    case _: return "other"',
      hs: 'area (Circle r) = 3 * r * r\narea (Rect w h)  = w * h',
      clj: '; no native pattern matching — dispatch on a tag with cond\n(defn area [s]\n  (cond (= (:kind s) :circle) (* 3 (:r s) (:r s))\n        (= (:kind s) :rect)   (* (:w s) (:h s))))',
      ex: 'defmodule M do\n  def area(%Circle{r: r}), do: 3 * r * r\n  def area(%Rect{w: w, h: h}), do: w * h\nend',
    },
  },
  adt: {
    title: 'Algebraic data types',
    snippets: {
      r: 'shape <- list(kind = "circle", r = 3)  # tagged union\narea <- function(s)\n  switch(s$kind, circle = pi * s$r^2, rect = s$w * s$h)',
      py: 'from dataclasses import dataclass\n@dataclass\nclass Circle: r: float\n@dataclass\nclass Rect:  w: float; h: float\ndef area(s):\n    if isinstance(s, Circle): return 3.14159 * s.r ** 2\n    if isinstance(s, Rect):   return s.w * s.h',
      hs: 'data Shape = Circle Double | Rect Double Double',
      clj: '; no native ADT — use a tagged map (or defrecord)\n{:kind :circle :r 3}\n{:kind :rect :w 3 :h 4}',
      ex: 'defmodule Circle do\n  defstruct r: 0\nend\n%Circle{r: 3}   # tagged value (a struct)',
    },
  },
  maybe: {
    title: 'Maybe (optional value)',
    snippets: {
      r: '# NULL is the "no value"; map/filter lift over it\nsafe_div <- function(a, b) if (b == 0) NA else a / b\nsafe_div(1, 0)  # NA   <- no crash',
      py: 'from typing import Optional\ndef safe_div(a, b) -> Optional[float]:\n    return a / b if b else None\nsafe_div(1, 0)  # None   <- no crash',
      hs: 'safeDiv a b = if b == 0 then Nothing else Just (a / b)\nsafeDiv 1 0   -- Nothing',
      clj: '; no Maybe — use nil for absence\n(defn safe-div [a b] (when (not (= b 0)) (/ a b)))\n(safe-div 1 0)   ; nil',
      ex: 'defmodule M do\n  def safe_div(a, b), do: if b == 0, do: :error, else: {:ok, a / b}\nend\nM.safe_div(1, 0)   # :error',
    },
  },
  either: {
    title: 'Either (error handling)',
    snippets: {
      r: 'parse <- function(s) {\n  x <- as.numeric(s)\n  if (is.na(x)) list(ok = FALSE, err = "bad number")\n  else           list(ok = TRUE,  val = x)\n}',
      py: 'def parse(s):\n    try:\n        return {"ok": True, "val": float(s)}\n    except ValueError:\n        return {"ok": False, "err": "bad number"}',
      hs: 'type Parse = Either String Double\nparse s = if valid s then Right (read s) else Left "bad number"',
      clj: '; no Either — use a tagged vector [ok value]\n(defn parse [s]\n  (let [x (try (read-string s) (catch Exception _ nil))]\n    (if (number? x) [true x] [false "bad number"])))',
      ex: 'defmodule M do\n  def parse(s), do: case Integer.parse(s) do\n    {n, _} -> {:ok, n}\n    :error -> {:error, "bad number"}\n  end\nend',
    },
  },
  monad: {
    title: 'Monads (bind / flatMap)',
    snippets: {
      r: 'safe_div <- function(a, b) if (b == 0) NULL else a / b\n# chain with bind; a failure short-circuits the rest\nlibrary(magrittr)\nsafe_div(10, 2) %>% safe_div(0)',
      py: 'def safe_div(a, b):  # returns Optional\n    return a / b if b else None\nfrom functools import reduce\n# chain: None propagates without a crash',
      hs: 'do { x <- safeDiv 10 2\n     y <- safeDiv x 0   -- Nothing short-circuits\n     return y }',
      clj: '; no core monad — thread context with short-circuiting\n(def safe-div (fn [a b] (when (not (= b 0)) (/ a b))))\n(when (safe-div 10 2)\n  (safe-div (safe-div 10 2) 0))   ; nil',
      ex: 'defmodule M do\n  def chain do\n    with x <- M.safe_div(10, 2),\n         y <- M.safe_div(x, 0) do   # short-circuits on :error\n      y\n    end\n  end\nend',
    },
  },
  io: {
    title: 'IO (contained side effects)',
    snippets: {
      r: '# side effects happen at the program boundary\nmain <- function() {\n  line <- readLine()      # the IO\n  cat(strtoi(line) * 2)   # effect, kept at the edge\n}',
      py: '# side effects happen at the program boundary\ndef main():\n    line = input()          # the IO\n    print(int(line) * 2)    # effect, kept at the edge',
      hs: 'main = do\n  line <- getLine\n  putStrLn $ show (read line * 2)',
      clj: '; side effects live at the top level\n(.println System/out (* 2 (Integer. (read-line))))',
      ex: 'line = IO.get_line()\nIO.puts(Integer.parse(line) * 2)',
    },
  },
  laziness: {
    title: 'Lazy evaluation',
    snippets: {
      r: 'ones <- function(x = 1) { x; stopifnot() }  # lazy args\nforce_it <- function(x) x\nforce_it(ones())  # 1   <- evaluated once, on demand',
      py: 'def ones():   # generator = lazy\n    x = 1\n    while True:\n        yield x\n        x += 1\nfrom itertools import islice\nlist(islice(ones(), 5))  # [1, 2, 3, 4, 5]',
      hs: 'nats = [1..]                 -- infinite\nones = 1 : ones               -- infinite\ntake 5 (drop 3 nats)   -- [4,5,6,7,8]',
      clj: '(def nats (iterate inc 1))   ; infinite lazy seq\n(take 5 (drop 3 nats))   ; (4 5 6 7 8)',
      ex: 'Stream.iterate(1, &(&1 + 1)) |> Enum.take(5)   # [1,2,3,4,5]',
    },
  },
  recursion: {
    title: 'Recursion',
    snippets: {
      r: 'fact <- function(n) if (n <= 1) 1 else n * fact(n - 1)\nfact(5)  # 120',
      py: 'def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\nfact(5)  # 120',
      hs: 'fact n | n <= 1    = 1\n       | otherwise = n * fact (n - 1)\nfact 5   -- 120',
      clj: '(defn fact [n] (if (<= n 1) 1 (* n (fact (dec n)))))\n(fact 5)   ; 120',
      ex: 'defmodule M do\n  def fact(n) when n <= 1, do: 1\n  def fact(n), do: n * fact(n - 1)\nend\nM.fact(5)   # 120',
    },
  },
};

/** Return a formatted code block for a concept, optionally in a specific language. */
export function codeFor(topic: string, lang: Lang | null): string | null {
  const ex = EX[topic.trim().toLowerCase()];
  if (!ex) return null;
  const langs: Lang[] = lang ? [lang] : LANGS.filter((l) => ex.snippets[l]);
  const blocks = langs
    .filter((l) => ex.snippets[l])
    .map((l) => [`\`\`\`${FENCE[l]}`, ex.snippets[l] as string, '```'].join('\n'));
  if (!blocks.length) return null;
  return [`── ${ex.title} ──`, ...blocks].join('\n\n');
}

/** The topics that have at least one snippet. */
export const CONCEPT_TOPICS = Object.keys(EX);
