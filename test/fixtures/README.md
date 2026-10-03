# Negative fixtures

Each `invalid-*` directory is a deliberately broken mini-marketplace that the
validator **must reject**. CI runs `node scripts/validate.mjs --test-fixtures`,
which validates every fixture and fails the build if any fixture unexpectedly
passes. This guards the validator itself against silently going lax.

| Fixture | Broken thing |
|---------|--------------|
| `invalid-marketplace-missing-name` | A `marketplace.json` plugin entry missing the required `name`. |
| `invalid-skill-missing-description` | A `SKILL.md` whose frontmatter omits `description`. |
| `invalid-skill-name-mismatch` | A `SKILL.md` whose frontmatter `name` does not match its folder. |
| `invalid-duplicate-skill-name` | Two plugins declaring a skill of the same name (would collide in the root `skills/` aggregation). |
| `invalid-plugin-readme-short` | A plugin folder whose `README.md` has fewer than 40 words. |
| `invalid-mcp-json` | A plugin `.mcp.json` with the server map at the top level, not under `mcpServers`. |
| `invalid-mcp-server-no-endpoint` | A `.mcp.json` server with neither a `command` nor a `url`. |
| `invalid-mcp-server-url-scheme` | A `.mcp.json` server whose `url` (`foo:bar`) is not an http(s) URL. |

Each fixture plugin carries a 40+ word `README.md`, so that it fails only for its own broken thing.

When you add a new validation rule, add a fixture that trips it.
