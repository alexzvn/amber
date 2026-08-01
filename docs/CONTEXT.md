# Documentation

The published VitePress site for Amber.js (`docs/`) plus the agent-facing docs (`docs/agents/`) and the domain-documentation conventions (context map, glossaries, decision logs) that structure the whole repo's documentation.

## Language

### Published site

**Home page**:
The hero landing page rendered from `index.md`'s `layout: home` frontmatter — a hero block (name, text, tagline, image, action buttons) above a three-item features grid.
_Avoid_: index page, README

**Guide page**:
A tutorial or reference page under `docs/guide/` rendered from Markdown, typically with `outline: deep`; these are the pages the sidebar links to, as opposed to the site's home page.
_Avoid_: doc page

**Nav**:
The `themeConfig.nav` top bar of the published site — the Home / Docs links and social links shown on every page.
_Avoid_: header, menu bar

**Sidebar**:
The `themeConfig.sidebar` link tree — the grouped list (Getting Started, AmberJS Configuration, Amber Library, Others) shown alongside guide pages.
_Avoid_: table of contents, nav tree

**Code group**:
A VitePress markdown extension (`:::code-group`) that renders tabbed code blocks — used for install and dev commands shown for npm, yarn, pnpm, and bun.
_Avoid_: tabs

**Custom container**:
A VitePress markdown extension rendering `::: info`, `::: tip`, `::: warning`, `::: danger`, and `::: details` callout boxes inside guide pages.
_Avoid_: admonition, callout box

**srcExclude**:
The VitePress `srcExclude` entry that keeps `docs/agents/**` out of the published site — agent-facing docs are repo config, not published pages.
_Avoid_: ignore list

**Documate**:
The AI docs assistant for the published site, configured by `documate.json` — the config names the `docs/` root, the markdown glob to index, and the backend upload endpoint.
_Avoid_: chatbot, search

### Agent-facing docs

**Domain docs**:
`docs/agents/domain.md` — the rules for how engineering skills consume the repo's context map, per-context glossaries, and decision logs when exploring the codebase.
_Avoid_: docs-for-agents, README

**Context map**:
`CONTEXT-MAP.md` at the repo root — the index of bounded contexts, each with its package, its glossary file, and the location of its decision log.
_Avoid_: index of docs

**Glossary**:
A per-context `CONTEXT.md` file defining the vocabulary of one bounded context; created lazily the first time `/domain-modeling` resolves a term there.
_Avoid_: dictionary, terminology list

**ADR (decision log)**:
A numbered decision record in a `docs/adr/` directory — the root `docs/adr/` holds system-wide decisions spanning two or more contexts, while each package's `docs/adr/` holds decisions scoped to that single context.
_Avoid_: RFC, changelog entry

**Issue tracker**:
GitHub issues, operated exclusively through the `gh` CLI — the repo's single surface for issues and PRDs, including create, read, comment, label, and close operations.
_Avoid_: bug tracker, ticket system

**Triage label**:
One of the five canonical GitHub issue labels — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` — that encode an issue's triage state; skills refer to the roles, the tracker uses these label strings.
_Avoid_: status flag, priority tag

**Wayfinding map**:
A single GitHub issue labelled `wayfinder:map` holding the Notes / Decisions-so-far / Fog body; its tickets are child issues (labelled `wayfinder:<type>`), optionally gated by native issue dependencies, and its open, unblocked, unassigned children are the work frontier.
_Avoid_: epic, parent issue

**Frontier query**:
The query that selects the next wayfinding ticket to claim: the map's open children minus any with an open blocker or an assignee, first in map order.
_Avoid_: next-up, backlog query
