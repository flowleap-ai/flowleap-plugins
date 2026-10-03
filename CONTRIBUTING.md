# Contributing a skill to the FlowLeap Marketplace

Thank you for wanting to add a skill. This marketplace is **curated**: you
propose a skill by opening a pull request, and the FlowLeap team reviews it and
merges the good ones. There is no automatic publishing — a human reads every
submission — so you do not need to worry about breaking anything. The worst that
happens is we ask for a change.

This guide is written so that **you do not need to be a programmer** to follow
it. If you are a patent professional working through an AI coding agent (Claude
Code, Cursor, the FlowLeap app, or similar), you can hand this whole page to your
agent and say "help me follow these steps." Everything here is copy-paste-able.

- [What a skill is](#what-a-skill-is)
- [What makes a skill good](#what-makes-a-skill-good-the-review-bar)
- [The five rules every skill must follow](#the-five-rules-every-skill-must-follow)
- [Step by step: fork, add, pull request](#step-by-step)
- [Checking your work before you submit](#checking-your-work-before-you-submit)
- [Why your new skill will not break the drift check](#why-your-new-skill-will-not-break-the-drift-check)

---

## What a skill is

A **skill** is a short written playbook that teaches an AI agent how to do one
patent task well — for example, "run a freedom-to-operate search" or "turn an
office action into a draft response." When the skill is installed, a patent
professional can ask their agent to do that task in plain language, and the agent
follows the steps you wrote.

A skill is a single folder with one file inside it:

```
skills/
  my-skill-name/
    SKILL.md
```

`SKILL.md` is a plain-text file with two parts:

1. A short **frontmatter** header at the very top, fenced by `---` lines. It
   carries the skill's `name` and its `description`.
2. The **body** below it: the instructions your agent will follow, in Markdown.

Here is the smallest possible example:

```markdown
---
name: my-skill-name
description: One sentence saying what this does. Trigger when the user asks the agent to do X, review Y, or check Z.
---

# My Skill Name

You are helping with <task>. Do it like this:

\`\`\`bash
flowleap patent search --query "example" --limit 10
\`\`\`

Done when <a clear finish line the agent can check>.
```

A **pack** is a bundle of related skills that ship together (for example the
`recipes` pack). You can add your skill to an existing pack, or propose a brand
new pack. Both are explained in the [step-by-step](#step-by-step) section.

A ready-to-copy starter lives in [`template/SKILL.md`](template/SKILL.md) — it is
an annotated version of the example above.

---

## What makes a skill good (the review bar)

When we review your pull request we ask three questions:

1. **Is it genuinely useful to a patent professional?** It should capture a real
   workflow an attorney, analyst, researcher, or founder would actually run — not
   a toy example.
2. **Does it add something we do not already have?** We do not merge a skill that
   duplicates an existing one without a clear improvement. Look through the
   [existing skills](plugins/) first. Extending or sharpening an existing
   workflow is welcome; re-doing it is not.
3. **Is the craft sound?** Clear steps, a checkable finish line, no information
   that will go stale — see the rules below.

---

## The five rules every skill must follow

These are the things our automatic checker and our reviewers look for. Follow all
five and your skill will pass.

### 1. The frontmatter `name` must match the folder name

If your folder is `skills/patent-term-check/`, then the frontmatter must say
`name: patent-term-check`. Exactly the same text. This is the single most common
mistake, and the checker will reject a mismatch.

### 2. The `description` must say what it does **and** when to use it

The description is the only thing the agent reads to decide whether to reach for
your skill, so it has to do two jobs in one or two sentences: say what the skill
does, and say when to trigger it. End it with a **"Trigger when…"** clause that
names the situations that should invoke it.

Good:

> `description: Freedom-to-operate clearance for a product. Trigger when the user asks whether a product infringes, wants an FTO search, or needs to clear a design before launch.`

Too vague (do not do this):

> `description: Helps with patents.`

### 3. Skills must drive the **FlowLeap CLI**, never in-app tool names

This is what lets the same skill work everywhere — in the FlowLeap app, in Claude
Code, in Cursor, and in any agent that has the FlowLeap CLI installed. Your steps
must call the **`flowleap` command-line tool** (or the public backend it talks
to), and **never** the FlowLeap app's internal, typed tool names.

Do this — real CLI commands:

```bash
flowleap patent search --query "wireless charging inductive" --limit 20
flowleap ops claims EP3456789
flowleap --json summary EP3456789
```

Never do this — those `snake_case` names are the app's private in-editor tools
and do not exist for other agents:

```
search_patents(...)        # ✗ in-app tool name — not portable
get_claims(...)            # ✗ do not reference these
analyze_claim(...)         # ✗
```

If you are not sure a command exists, run `flowleap --help` (and
`flowleap <group> --help`) to see the real commands, or install the
[FlowLeap CLI](https://github.com/flowleap-ai/flowleap-cli) and try it. Every
command you put in a skill should be one you actually ran.

### 4. Cross-references to other skills must be optional

Your skill may mention another skill (for example, "for a deeper run, use
`recipe-prior-art-search`"). That is fine, but write it so it still makes sense if
that other skill is **not installed**. Phrase it as a suggestion, not a
dependency: "if the full recipe pack is installed, …" rather than "now run the
prior-art recipe." A reader who only installed your skill must never hit a dead
end.

### 5. No information that will go out of date

Skills are long-lived. Do not put anything in the body that rots:

- No version numbers ("as of CLI v0.3.1…"), no dates, no "new in this release."
- No "currently," "recently," or counts that change ("we now have 22 skills").
- No pricing, quotas, or deadlines.

Write completion criteria the agent can actually check — "Done when every live
patent has a legal-status verdict" — not fuzzy ones like "Done when you have
enough results."

---

## Step by step

You will fork the repository, add your skill folder, and open a pull request.
Three steps. If you are working through an AI agent, it can run the terminal
commands for you.

### Step 1 — Fork this repository

On GitHub, click **Fork** at the top right of
[`flowleap-plugins`](https://github.com/flowleap-ai/flowleap-plugins). That
gives you your own copy to work in. Then get it onto your computer:

```bash
git clone https://github.com/<your-username>/flowleap-plugins
cd flowleap-plugins
git checkout -b add-my-skill
```

### Step 2 — Add your skill folder

You have two choices.

**A. Add a skill to an existing pack** (the easy path). Pick the pack that fits:

- `plugins/personas/` — role primers ("act as a patent attorney").
- `plugins/recipes/` — end-to-end workflows ("run an FTO search start to finish").
- `plugins/flowleap-tools/` — thin wrappers around one CLI capability.

Create a new folder for your skill under that pack's `skills/` directory and put
your `SKILL.md` in it. Copy the starter to begin:

```bash
mkdir -p plugins/recipes/skills/my-skill-name
cp template/SKILL.md plugins/recipes/skills/my-skill-name/SKILL.md
```

Then edit that new file. **Do not edit any of the existing `SKILL.md` files** —
those are synced from an upstream source and editing them will fail CI (see
[why](#why-your-new-skill-will-not-break-the-drift-check)). Adding a brand new
folder is always safe.

**B. Propose a new pack** (for a set of related skills that do not fit the packs
above). Create the pack directory with a manifest and your skills:

```bash
mkdir -p plugins/my-pack/.claude-plugin
mkdir -p plugins/my-pack/skills/my-skill-name
cp template/SKILL.md plugins/my-pack/skills/my-skill-name/SKILL.md
```

Create `plugins/my-pack/.claude-plugin/plugin.json`:

```json
{
	"name": "my-pack",
	"description": "One sentence describing what this pack of skills is for.",
	"version": "1.0.0"
}
```

The `name` here must match the folder (`my-pack`). Then register the pack in the
**two** marketplace index files so both the FlowLeap app and Claude Code can see
it. Add the same entry to each.

In `marketplace.json` (the `plugins` array):

```json
{
	"name": "my-pack",
	"description": "One sentence describing what this pack of skills is for.",
	"version": "1.0.0",
	"source": "my-pack"
}
```

In `.claude-plugin/marketplace.json` (the `plugins` array):

```json
{
	"name": "my-pack",
	"source": "./plugins/my-pack",
	"description": "One sentence describing what this pack of skills is for."
}
```

Keep the two descriptions identical — the checker makes sure both files list the
same packs.

Give the pack a `plugins/my-pack/README.md` of 40 words or more that says what
the pack does and how to install it. The checker rejects a pack without one.

> **The `flowleap` pack ships the FlowLeap connector config.** Its
> `plugins/flowleap/.mcp.json` points to the hosted MCP server
> (`https://api.flowleap.co/mcp`), so its skills also work in claude.ai and
> Cowork. A new pack does not need its own `.mcp.json`: write your skill steps
> with `flowleap` CLI commands, as rule 3 says.

> **The root `skills/` folder is optional for you.** It contains symlinks that let
> the `npx skills` command find skills; a maintainer will add one for your skill
> during review. You do not need to create symlinks yourself.

### Step 3 — Open your pull request

Commit and push:

```bash
git add .
git commit -m "Add my-skill-name skill"
git push origin add-my-skill
```

Then open the pull request on GitHub. A template appears with three short
questions — please answer them, they are exactly what the reviewer needs:

1. What patent workflow does this skill help with, and who is it for?
2. Which `flowleap` commands does it use, and did you run them yourself?
3. What does a good result look like when the skill runs?

That's it. CI runs automatically on your pull request (even though it comes from
your fork), a maintainer reviews it, and if it looks good we merge it. Merging is
what publishes it to everyone.

---

## Checking your work before you submit

You can run the exact same check CI runs, on your own machine, before you open the
pull request. You need [Node.js](https://nodejs.org) version 20 or newer (nothing
else to install — the checker has no dependencies):

```bash
npm run validate
```

If it prints `Marketplace validation passed.` you are good. If it finds a
problem, it prints a plain-English line telling you what to fix — for example:

```
  - plugin 'recipes': skill 'my-skill-name' frontmatter name 'my-skill' must match its folder
```

Fix what it names and run it again. (If you are curious, `npm test` also runs the
negative test fixtures, and `npm run check-drift` verifies the synced skills — see
below — but `npm run validate` is the one that checks your new skill.)

---

## Why your new skill will not break the drift check

You may notice CI has a step called the **drift check**. Here is what it does and
why it will not get in your way.

Most of the skills already in this repo are **synced copies** of skills authored
in [flowleap-cli](https://github.com/flowleap-ai/flowleap-cli) — that upstream
project is their source of truth. The drift check makes sure nobody hand-edits
those synced copies here; it compares each one, byte for byte, against the
upstream original. The exact list of synced skills lives in
[`sync.json`](sync.json).

**The drift check only looks at the skills listed in `sync.json`.** Your new
skill is not in that list, so the drift check never examines it. This is the
coexistence rule for third-party submissions:

- **A brand new skill folder** (whether in an existing pack or a new pack) is
  never drift-checked. Add as many as you like.
- **A brand new pack** is entirely outside the synced set — safe by construction.
- **Editing an existing, synced `SKILL.md`** is the one thing that *will* fail the
  drift check, because that file must stay identical to its upstream source. So
  never edit those files. If you think a synced skill needs a change, say so in
  your pull request and a maintainer will make the change upstream.

In short: **add new folders, never edit existing skill files, and the drift check
stays green.**

---

## Questions

Open an issue on
[flowleap-plugins](https://github.com/flowleap-ai/flowleap-plugins/issues) if
anything here is unclear. We would rather answer a question than have you guess.
