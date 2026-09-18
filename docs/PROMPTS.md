# Prompts

The assignment asks for the prompts used while building this project. The work was
iterative rather than a single generation, so what follows are the substantive prompts —
the ones that produced or reshaped a meaningful part of the codebase. Routine exchanges
(fixing a typo, reading a compiler error, agreeing on a commit message) are not reproduced.

Prompts originally written in Spanish are translated here.

## Working method

Architecture and design decisions were mine: the layering of the backend, the choice of the
standard library over a framework, the shape of the API, the error contract, and the
testing strategy. AI assistance was used for scaffolding, for generating code under
explicit constraints, and for review. Every step was verified by running the tests and the
application.

The clearest example is the prompt below: the visual direction, the reference, the
functional rework and the constraints were specified up front, including the requirement to
rewrite the tests that the change would invalidate. A prompt that asks to change the UI
without mentioning the tests is the one that leaves the repository broken.

## 1. UI redesign and functional rework

Turned a plain two-input form into a handheld calculator with a screen and a keypad.

```text
CONTEXT
I have a full-stack calculator application. The Go backend exposes
POST /api/v1/calculate/{operation} accepting {"a": number, "b": number} and returning
{"operation","a","b","result"}, or an error shaped as {"error":{"code","message"}}.
The operations are: add, subtract, multiply, divide, power, sqrt, percentage. sqrt is
unary and ignores "b".

The frontend is React 19 with TypeScript and Vite, tested with Vitest and Testing Library.
The UI today is a simple form: two text fields and a <select> for the operation. It works,
but it looks poor.

GOAL
Redesign the interface into an on-screen handheld calculator: a digital screen on top and a
keypad below. The user types numbers with the buttons, picks an operation, and pressing "="
shows the result on the same screen.

FUNCTIONAL BEHAVIOUR
- The screen shows what is being typed and, after "=", the result.
- Keypad: digits 0-9, decimal point, +/- to flip the sign, AC to clear everything, and the
  operations +, -, x, /, ^, %, square root, and "=".
- Flow: the user types the first number, presses an operation, types the second and presses
  "=". That calls the backend and shows the result on the screen, keeping it available as
  the first operand of the next operation.
- Square root is unary: it applies to whatever is on screen and calls the backend
  immediately, without waiting for "=".
- Percentage is binary and means "b percent of a", matching the backend: 200 % 15 = 30.
- Only one decimal point per number, and no redundant leading zeros.
- While a request is in flight the keypad is disabled.
- If the backend returns an error, show its message on (or just below) the screen, leaving
  the state ready to keep operating without a reload.
- If the network fails, show a generic message distinct from the backend's.

WHAT MUST NOT CHANGE
- The Go backend: do not change the API contract.
- src/api/calculator.ts: the HTTP client is reused as is.
- src/lib/validation.ts: parseOperand is reused to turn the screen text into a number.
Do not add UI, state or styling libraries: plain CSS, no new dependencies.

VISUAL STYLE
Inspired by this Dribbble shot: "Treats Fintech Mobile App" by Szymon Dziukiewicz
(https://dribbble.com/shots/27741685-Treats-Fintech-Mobile-App). Take only the visual
language from it (colours, shapes, borders, buttons), not the screen structure.

Exact palette:
  background cream  #FAF3E1
  near black        #0C0809
  deep purple       #47228C
  mid purple        #6B4BA3
  orange            #E38933
  sand              #D0C4A0
  plum              #463652
  cool grey         #ACB3B6

Suggested application:
- Page background in cream.
- The calculator body is a card with very rounded corners (24-32px) over the background,
  with a thin dark border and a soft, non-blurry shadow.
- The screen is a dark panel (#0C0809 or #463652) with cream digits, right-aligned, in a
  monospaced face at a generous size, with tabular figures. Above it, small and in cool
  grey, the pending operation.
- Digit keys: cream or sand background, near-black text, very rounded or circular corners.
- Operation keys: purple with cream text.
- The "=" key: orange, the most prominent of all.
- AC key: sand or plum, clearly distinct from the digits.
- Flat colours, no gradients. Short transitions on press (scale or tone), no long
  animations.
- A clearly visible :focus-visible state on every button.

RESPONSIVE
Mobile-first. On a phone the calculator takes the available width with comfortable margins
and the buttons keep at least a 44x44px touch target. On large screens it is centred with a
maximum width close to 380px, like a real device. No horizontal scroll at any size. Use CSS
Grid for the keypad.

ACCESSIBILITY
- Every key is a real <button> with an accessible name (aria-label where the symbol is not
  enough, for example "divide" instead of "/").
- The screen is a live region (aria-live) so a screen reader announces the result.
- Error messages go in an element with role="alert".
- The physical keyboard works too: digits, operators, Enter for "=", Escape for AC,
  Backspace to delete the last digit.

TESTS
The current tests in src/components/Calculator.test.tsx assume the old UI and will no
longer apply: rewrite them for the keypad, with Testing Library, querying by role and
accessible name (never by CSS class), and covering:
- typing a number, choosing an operation, typing another, pressing "=" and seeing the
  result on the screen;
- AC leaves the screen at 0;
- a backend error (division by zero) is shown to the user;
- the square root calls the backend with a single operand;
- the keypad is disabled while a request is in flight.
Mock the src/api/calculator.ts module: the tests must not touch the network.
The tests for validation.ts and calculator.ts must keep passing unchanged.

ACCEPTANCE CRITERIA
- npm test passes.
- npm run build compiles with no TypeScript errors.
- The calculator works against the real backend locally.
- No new dependencies were added.
- The code follows the style of the project: small components, comments only where they
  explain a decision, no business logic in the view.
```

## 2. Closing coverage gaps

Used after generating the first coverage report, rather than reporting a weak number.

```text
Here is the coverage report for both layers. Find the branches that no test exercises and
add tests that genuinely cover them, in the style already used in this repository:
table-driven tests in Go, and queries by role and accessible name in the frontend.

Do not add tests whose only purpose is to raise the percentage. If a file is uncovered
because it is pure wiring and is verified by running the application, leave it uncovered
and say so explicitly in the README instead of inflating the number.
```

## 3. Documentation

```text
Write the README for this repository, in English, aimed at someone who has never seen the
project and has to run and evaluate it.

Include: repository structure, requirements, how to run it with a single Docker command,
how to run frontend and backend separately for development, environment variables, the API
with runnable curl examples and a table of error codes with their HTTP status, how to run
the tests and generate coverage, and the coverage numbers actually obtained.

Two sections matter most: design decisions, each one stating why it was taken rather than
just what was done, and the assumptions taken where the assignment left room for
interpretation.

Use the real numbers from the coverage report, not estimates.
```
