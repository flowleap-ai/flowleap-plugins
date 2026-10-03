# FlowLeap Plugin Marketplace

The curated, free-to-install plugin marketplace for **FlowLeap Patent AI**. This
public monorepo is the FlowLeap app's default, pre-trusted plugin marketplace:
installing anything published here skips the "plugins can run code" trust prompt,
because FlowLeap curates every entry through pull-request review.

Everything ships as **one plugin** — [`flowleap`](plugins/flowleap) — so a
single install brings the complete 32-skill set:

- **Data-access skills** (`flowleap-*`) — drive the FlowLeap CLI and backend
  facade: auth, provider keys, EPO/USPTO/OPS search, academic & non-patent
  literature, legal references, citations, PATSTAT portfolio analytics, and
  the unified `/v1/tools` facade.
- **Recipes** (`recipe-*`) — end-to-end workflows: prior-art search,
  freedom-to-operate, patent landscape, claim analysis, patent-to-report,
  academic literature review, and verified-data HTML dashboards
  (`recipe-custom-dashboard`).
- **Personas** (`persona-*`) — patent attorney, IP analyst, researcher, and
  startup-founder roles.

## Install

In Claude Code, run:

```
/plugin marketplace add flowleap-ai/flowleap-plugins
/plugin install flowleap@flowleap-plugins
```

For other agents (Cursor, Codex, and more), use the `npx skills` CLI:

```
npx skills add flowleap-ai/flowleap-plugins
```

The skills use FlowLeap CLI commands in a terminal, and the FlowLeap connector
tools of the same name in a chat client. So the same skills work in the
FlowLeap IDE, Claude Code, and any agent with the CLI available.

The `flowleap` plugin also ships the FlowLeap connector config
([`plugins/flowleap/.mcp.json`](plugins/flowleap/.mcp.json)): one HTTP MCP
server, `flowleap`, at the hosted MCP server `https://api.flowleap.co/mcp`
(OAuth sign-in). In Claude Code, the plugin starts this server. In claude.ai
and Cowork, the directory bundle carries this config, so the Connectors tab of
the pack shows FlowLeap. The plugin README
([`plugins/flowleap/README.md`](plugins/flowleap/README.md)) describes the
pack for the plugin directory listing.

## Free forever

Per [ADR 0006](https://github.com/abdullahatrash/flowleap-agent-v2/blob/main/docs/adr/0006-curated-free-marketplace-v1.md),
everything in this repository is **free and public, permanently**. Nothing here
can later become paid content. Premium/Pro packs, if they ever exist, must ship
over a separate authenticated channel — never by locking down anything in this
repo. Do not add content here that is intended to become paid.

## Repository layout

```
marketplace.json                     # marketplace index the FlowLeap app reads (root, checked first)
.claude-plugin/marketplace.json      # same index in Claude Code CLI format (kept in sync by CI)
plugins/
  flowleap/                          # THE plugin (single plugin root)
    .claude-plugin/plugin.json       #   Claude plugin manifest → loads in FlowLeap app + Claude Code
    .mcp.json                        #   FlowLeap connector config (HTTP MCP server → api.flowleap.co/mcp)
    README.md                        #   plugin README (40+ words; read by the plugin directory)
    skills/                          #   all 32 skills: flowleap-*, recipe-*, persona-*
skills/                              # aggregation for the `npx skills` CLI (symlinks — see below)
scripts/validate.mjs                 # zero-dependency CI validator
test/fixtures/                       # deliberately broken marketplaces the validator must reject
```

## Three consumers, one copy in this repo

The canonical skill content is authored upstream in flowleap-cli (see
[below](#canonical-source-this-repo-is-a-synced-distribution)); within **this**
repo the synced copy lives **once**, under
`plugins/flowleap/skills/<name>/SKILL.md`. Three different tools consume it:

1. **FlowLeap app.** Reads the root `marketplace.json` (Open Plugin format),
   resolves each plugin's `source` directory, and loads its Claude-format
   manifest and skills. This repo is wired as the app's sole default
   marketplace, pre-seeded as trusted.
2. **Claude Code CLI.** `claude plugin marketplace add flowleap-ai/flowleap-plugins`
   reads `.claude-plugin/marketplace.json` and each plugin's
   `.claude-plugin/plugin.json`. Authoring plugins in the Claude manifest format
   is what makes the same packs usable outside the IDE.
3. **`npx skills` CLI** ([vercel-labs/skills](https://github.com/vercel-labs/skills)),
   which installs `SKILL.md` folders into 70+ agents (Claude Code, Cursor,
   Codex, …). It discovers skills in a repo's root `skills/` directory at shallow
   depth (`skills/<name>/SKILL.md`) — it does **not** descend into per-plugin
   `plugins/*/skills/` trees. So the root `skills/` directory here is an
   aggregation layer: each entry is a **relative symlink** to the canonical skill
   under `plugins/flowleap/skills/`. Symlinks (not copies) keep a single source
   of truth with no drift; git preserves them and the `npx skills` walker follows
   them.

   ```
   npx skills add flowleap-ai/flowleap-plugins --list   # lists all 32 skills
   npx skills add flowleap-ai/flowleap-plugins          # installs them into your agent
   ```

> In a terminal, these skills call the **FlowLeap CLI** (`flowleap patent search`,
> `flowleap ops claims`, …). In a chat client, they call the FlowLeap connector
> tools named in their connector table. That is what makes them multi-harness.
> Install the [FlowLeap CLI](https://github.com/flowleap-ai/flowleap-cli) to use
> them in a terminal outside the FlowLeap app.

## Canonical source: this repo is a synced distribution

The **skill content is authored upstream in
[flowleap-cli](https://github.com/flowleap-ai/flowleap-cli)** — that is the
single source of truth for every `SKILL.md`. This marketplace ships **byte-for-byte
copies** of a pinned flowleap-cli release. The pin lives in
[`sync.json`](sync.json): the source repo, the release `ref` (a git tag), and the
list of skills each pack ships.

`scripts/check-drift.mjs` enforces this. On every PR, CI fetches each shipped
`SKILL.md` from flowleap-cli at the pinned `ref` and **fails if any copy differs**.
So a PR that hand-edits `plugins/*/skills/**/SKILL.md` (rather than re-syncing from
the canonical source) will not pass CI. Fix skill content upstream, cut a
flowleap-cli release, then re-sync here.

### Updating skills (two steps)

1. **Bump the pin.** Set `ref` in `sync.json` to the new flowleap-cli tag (and add
   or remove entries in its `skills` list if the set of shipped skills changed).
2. **Re-copy, byte-for-byte.** For each skill, copy the upstream file verbatim, e.g.:

   ```
   REF=$(node -p "require('./sync.json').ref")
   git -C ../flowleap-cli show "$REF:skills/<name>/SKILL.md" \
     > plugins/<plugin>/skills/<name>/SKILL.md
   npm run check-drift        # must pass (skips gracefully with no network)
   ```

Then open a PR. CI re-runs the drift check against the new pin.

## Publishing = opening a pull request

There is no separate publish step. **Merging to `main` publishes.** To add or
change a pack:

1. Re-sync skill content from the pinned flowleap-cli release (see above) — do
   **not** hand-edit `SKILL.md` files, or the drift check will fail.
2. Register any new plugin in `marketplace.json` **and**
   `.claude-plugin/marketplace.json` (CI checks the two stay consistent).
3. If it ships new skills, add matching relative symlinks under `skills/`.
4. Open a PR. CI validates every manifest, every `SKILL.md`, and that no skill has
   drifted from the pinned source. Review is the curation gate; history and
   rollback are ordinary git operations.

Installed apps pick up merged changes on the marketplace's normal refresh
cadence (fetches cached ~8h; plugins auto-update ~24h).

## Contributing a skill

Outside contributors are welcome to propose skills — FlowLeap reviews and merges
them (curated, not an open publish pipeline). The submission recipe, written in
plain language for patent professionals (including those working through an AI
agent), lives in [CONTRIBUTING.md](CONTRIBUTING.md), with a copy-paste starter in
[`template/SKILL.md`](template/SKILL.md). A new skill folder — is never touched by the drift check (which only covers the
`sync.json` set), so third-party skills coexist with the synced ones.

## Validation

`scripts/validate.mjs` (no dependencies) checks:

- `marketplace.json`: every plugin has a non-empty `name`, `description`,
  `version`, and a `source` directory that exists and carries a plugin manifest.
- `.claude-plugin/marketplace.json`: present, well-formed, and lists exactly the
  same plugins as the root index.
- Each plugin manifest: `name` matches its folder; `description` present.
- Each plugin folder: a `README.md` of 40+ words; a `.mcp.json`, when present,
  parses and has an `mcpServers` object; each server has a `command` or an
  http(s) `url`, and a `type`, when present, is `stdio`, `http`, `sse`, or `ws`.
- Each `SKILL.md`: frontmatter `name` matches its folder and `description` is
  present.
- The root `skills/` aggregation: every entry resolves to a real `SKILL.md`.

`scripts/check-drift.mjs` (no dependencies) additionally checks that every shipped
`SKILL.md` is byte-identical to its canonical copy in flowleap-cli at the `ref`
pinned in `sync.json`.

```
npm run validate            # validate this repo (must pass)
npm run validate:fixtures   # every test/fixtures/invalid-* repo must FAIL
npm test                    # both of the above
npm run check-drift         # shipped skills match the pinned source (skips offline)
npm run check-drift:ci      # same, but a missing network is a hard failure
```

CI runs the validator, the negative fixtures, and the drift check on every PR and
push to `main`. The drift check needs network (GitHub Actions has it); run
locally it skips gracefully with a warning when offline.
