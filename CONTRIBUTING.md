# Contributing

Thanks for helping keep this list accurate. Two kinds of contributions are
welcome: corrections and additions. Corrections get priority.

## Priority: corrections about competitors

Two of the tools listed here (Theneo and Elva) are made by the maintainers.
That creates an obvious risk that every other tool is described a little
less well than it deserves. If you work on, or use, one of the other tools
and a description here is wrong, out of date, or unfair, open a PR or an
issue. **Competitor corrections get priority review** and will be merged on
the strength of a link to the vendor's documentation. You do not need to be
polite about it.

## Entry format

Every tool entry in the root README and in `comparisons/` follows the same
shape:

```
- [Tool name](https://vendor.example/) — One neutral sentence saying what it is and what it is best at.
```

Rules for the sentence:

- Neutral and specific. "Open-source API client that stores collections as
  plain-text files in your repo" is good. "Powerful, modern API client" is
  not.
- No marketing adjectives. If a word would look at home on a pricing page,
  leave it out.
- One claim you can back with a link to the vendor's docs.
- Tools made by the maintainers carry the tag `(ours)` at the end of the
  line. Nothing else gets a tag.

## Adding a tool

1. Add it to the right category in `README.md`, alphabetically.
2. Add a row and a "Tool notes" entry to the matching file in `comparisons/`,
   filling every column of the summary table. If you cannot confirm a fact in
   the vendor's own documentation, leave it out rather than guessing.
3. If the tool consumes an OpenAPI document, an example under `examples/` that
   runs against `specs/demo-api.yaml` is strongly preferred. See the next
   section.

We list tools that are generally available and documented. We do not list
tools that require a sales call to try, unless a free tier or trial exists
and is documented.

## Adding an example

Each example directory is self-contained and must run on a clean machine
with the exact commands in its README. Include:

- A one-line **What this shows** at the top.
- Exact install and run commands with pinned versions.
- An **Expected output** section containing real output you captured, trimmed
  but not edited.
- A **Notes** section recording what worked cleanly and what needed
  hand-editing.
- A `.env.example` if any key is needed. Never commit a real credential.
- For hosted tools where code cannot express the flow, a stepwise walkthrough
  with `![step](images/step-N.png)` placeholders and a maintainer comment at
  each slot.

Do not invent benchmark numbers, timings, or test results. Write
`[MEASURE: what to measure]` and let a maintainer measure it.

Add a row to `examples/README.md` and, if the example is runnable, a job to
`.github/workflows/ci.yml`.

## Changing the demo spec

`specs/demo-api.yaml` is shared by every example. See `specs/README.md`
before touching it. In particular, do not fix the deliberate description gaps.

## Review

- Corrections about a tool the maintainers do not make: reviewed first,
  usually within a few days.
- Additions: reviewed in order.
- Anything that adds a superlative to a maintainers' product: declined.

By contributing you agree that your contribution is licensed under the MIT
license in `LICENSE`.
