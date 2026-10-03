#!/usr/bin/env node
// Validates the FlowLeap Plugin Marketplace: the root marketplace.json (the
// format the FlowLeap app reads), the optional Claude Code marketplace.json,
// every plugin manifest, and every SKILL.md frontmatter.
//
// Usage:
//   node scripts/validate.mjs [rootDir]     validate a marketplace repo (default: repo root)
//   node scripts/validate.mjs --test-fixtures   assert every test/fixtures/invalid-* repo FAILS
//
// Zero runtime dependencies so CI needs no install step.

import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Recognised single-plugin manifest locations, in the app's detection order. */
const PLUGIN_MANIFESTS = [
	'.plugin/plugin.json',
	'.claude-plugin/plugin.json',
	'plugin.json',
];

/** Minimum word count of a plugin folder's README.md (Anthropic directory rule). */
const MIN_README_WORDS = 40;

/** MCP server transports Claude Code accepts in a plugin's .mcp.json. */
const MCP_SERVER_TYPES = ['stdio', 'http', 'sse', 'ws'];

/**
 * Parse the top-level scalar keys of a YAML frontmatter block. Only the flat
 * `key: value` pairs are needed here (name, description); nested/indented lines
 * are intentionally ignored.
 */
function parseFrontmatter(text) {
	if (!text.startsWith('---')) {
		return undefined;
	}
	const end = text.indexOf('\n---', 3);
	if (end === -1) {
		return undefined;
	}
	const block = text.slice(text.indexOf('\n') + 1, end);
	const out = {};
	for (const line of block.split('\n')) {
		if (!line || /^\s/.test(line)) {
			continue; // skip blank and nested (indented) lines
		}
		const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
		if (!m) {
			continue;
		}
		let value = m[2].trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		out[m[1]] = value;
	}
	return out;
}

function readJson(path, errors, label) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch (err) {
		errors.push(`${label}: not valid JSON (${err.message})`);
		return undefined;
	}
}

function isDir(path) {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/** Resolve a plugin's directory from marketplace `pluginRoot` + `source`. */
function resolveSource(root, pluginRoot, source) {
	const parts = [root];
	if (pluginRoot) {
		parts.push(pluginRoot);
	}
	parts.push(source);
	return join(...parts);
}

function findManifest(pluginDir) {
	for (const rel of PLUGIN_MANIFESTS) {
		const p = join(pluginDir, rel);
		if (existsSync(p)) {
			return p;
		}
	}
	return undefined;
}

/**
 * Validate a plugin directory: its manifest and all of its skills. `seenSkills`
 * maps a skill name to the plugin that first declared it, so duplicate skill
 * names across packs (which would collide in the root skills/ aggregation and
 * confuse `npx skills`) are rejected.
 */
function validatePlugin(pluginDir, declaredName, errors, seenSkills) {
	const label = `plugin '${declaredName}'`;
	const manifestPath = findManifest(pluginDir);
	if (!manifestPath) {
		errors.push(`${label}: no plugin manifest found under ${pluginDir} (expected one of ${PLUGIN_MANIFESTS.join(', ')})`);
		return;
	}
	const manifest = readJson(manifestPath, errors, `${label} manifest`);
	if (manifest) {
		if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
			errors.push(`${label}: manifest is missing a non-empty 'name'`);
		} else if (manifest.name !== basename(pluginDir)) {
			errors.push(`${label}: manifest name '${manifest.name}' must match the plugin folder '${basename(pluginDir)}'`);
		}
		if (typeof manifest.description !== 'string' || !manifest.description.trim()) {
			errors.push(`${label}: manifest is missing a non-empty 'description'`);
		}
		if (manifest.version !== undefined && typeof manifest.version !== 'string') {
			errors.push(`${label}: manifest 'version' must be a string when present`);
		}
	}

	// Anthropic's plugin directory requires a README of 40+ words inside the
	// plugin folder itself (the repo-root README does not count).
	const readmePath = join(pluginDir, 'README.md');
	if (!existsSync(readmePath)) {
		errors.push(`${label}: no README.md in the plugin folder (${pluginDir})`);
	} else {
		const words = readFileSync(readmePath, 'utf8').split(/\s+/).filter(Boolean).length;
		if (words < MIN_README_WORDS) {
			errors.push(`${label}: README.md has ${words} words; it must have ${MIN_README_WORDS} or more`);
		}
	}

	// An MCP config (.mcp.json at the plugin root) is optional; when present it
	// must parse and wrap its servers in an `mcpServers` object, each server
	// being stdio (`command`) or remote (`url`). A remote url must be http(s)
	// (ws(s) for a `ws` server): URL.canParse alone accepts "foo:bar".
	const mcpPath = join(pluginDir, '.mcp.json');
	if (existsSync(mcpPath)) {
		const mcp = readJson(mcpPath, errors, `${label} .mcp.json`);
		if (mcp !== undefined) {
			const servers = mcp?.mcpServers;
			if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
				errors.push(`${label}: .mcp.json must have an 'mcpServers' object`);
			} else {
				for (const [name, cfg] of Object.entries(servers)) {
					const where = `${label}: .mcp.json server '${name}'`;
					if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
						errors.push(`${where} must be an object`);
						continue;
					}
					if (cfg.type !== undefined && !MCP_SERVER_TYPES.includes(cfg.type)) {
						errors.push(`${where} 'type' must be one of ${MCP_SERVER_TYPES.join(', ')} (got '${cfg.type}')`);
					}
					if (typeof cfg.command !== 'string' && typeof cfg.url !== 'string') {
						errors.push(`${where} needs a 'command' (stdio) or a 'url' (remote)`);
					} else if (typeof cfg.url === 'string') {
						const schemes = cfg.type === 'ws' ? ['ws:', 'wss:'] : ['http:', 'https:'];
						let protocol;
						try {
							protocol = new URL(cfg.url).protocol;
						} catch {
							protocol = undefined;
						}
						if (!schemes.includes(protocol)) {
							errors.push(`${where} url '${cfg.url}' must be an absolute ${schemes.map(s => s.slice(0, -1)).join('/')} URL`);
						}
					}
				}
			}
		}
	}

	const skillsDir = join(pluginDir, 'skills');
	if (!isDir(skillsDir)) {
		return; // a plugin may legitimately ship commands/agents only
	}
	for (const entry of readdirSync(skillsDir)) {
		const skillDir = join(skillsDir, entry);
		if (!isDir(skillDir)) {
			continue;
		}
		const skillMd = join(skillDir, 'SKILL.md');
		if (!existsSync(skillMd)) {
			errors.push(`${label}: skill folder '${entry}' has no SKILL.md`);
			continue;
		}
		const fm = parseFrontmatter(readFileSync(skillMd, 'utf8'));
		if (!fm) {
			errors.push(`${label}: skill '${entry}' SKILL.md has no YAML frontmatter block`);
			continue;
		}
		if (!fm.name || !fm.name.trim()) {
			errors.push(`${label}: skill '${entry}' frontmatter is missing 'name'`);
		} else if (fm.name !== entry) {
			errors.push(`${label}: skill '${entry}' frontmatter name '${fm.name}' must match its folder`);
		}
		if (!fm.description || !fm.description.trim()) {
			errors.push(`${label}: skill '${entry}' frontmatter is missing 'description'`);
		}
		if (seenSkills) {
			const prior = seenSkills.get(entry);
			if (prior !== undefined && prior !== declaredName) {
				errors.push(`${label}: skill '${entry}' duplicates a skill of the same name in plugin '${prior}' — skill names must be unique across packs`);
			} else {
				seenSkills.set(entry, declaredName);
			}
		}
	}
}

/**
 * Validate one marketplace repository rooted at `root`. Returns a list of
 * human-readable errors (empty means valid).
 */
function validateMarketplace(root) {
	const errors = [];

	const marketplacePath = join(root, 'marketplace.json');
	if (!existsSync(marketplacePath)) {
		errors.push(`marketplace.json: not found at repo root (${root})`);
		return errors;
	}
	const marketplace = readJson(marketplacePath, errors, 'marketplace.json');
	if (!marketplace) {
		return errors;
	}
	if (!Array.isArray(marketplace.plugins)) {
		errors.push("marketplace.json: 'plugins' must be an array");
		return errors;
	}
	const pluginRoot = marketplace.metadata?.pluginRoot;
	if (pluginRoot !== undefined && typeof pluginRoot !== 'string') {
		errors.push("marketplace.json: metadata.pluginRoot must be a string when present");
	}

	const rootPluginNames = new Set();
	const seenSkills = new Map();
	for (const [i, p] of marketplace.plugins.entries()) {
		const where = `marketplace.json plugins[${i}]`;
		if (typeof p.name !== 'string' || !p.name.trim()) {
			errors.push(`${where}: missing a non-empty 'name'`);
			continue;
		}
		rootPluginNames.add(p.name);
		if (typeof p.description !== 'string' || !p.description.trim()) {
			errors.push(`${where} ('${p.name}'): missing a non-empty 'description'`);
		}
		if (typeof p.version !== 'string' || !p.version.trim()) {
			errors.push(`${where} ('${p.name}'): missing a non-empty 'version'`);
		}
		if (typeof p.source !== 'string' || !p.source.trim()) {
			errors.push(`${where} ('${p.name}'): 'source' must be a non-empty relative path string`);
			continue;
		}
		const pluginDir = resolveSource(root, typeof pluginRoot === 'string' ? pluginRoot : undefined, p.source);
		if (!isDir(pluginDir)) {
			errors.push(`${where} ('${p.name}'): source directory does not exist: ${pluginDir}`);
			continue;
		}
		validatePlugin(pluginDir, p.name, errors, seenSkills);
	}

	// Optional Claude Code marketplace must stay consistent with the root index.
	const claudePath = join(root, '.claude-plugin', 'marketplace.json');
	if (existsSync(claudePath)) {
		const claude = readJson(claudePath, errors, '.claude-plugin/marketplace.json');
		if (claude) {
			if (typeof claude.name !== 'string' || !claude.name.trim()) {
				errors.push(".claude-plugin/marketplace.json: missing a non-empty 'name'");
			}
			if (!Array.isArray(claude.plugins)) {
				errors.push(".claude-plugin/marketplace.json: 'plugins' must be an array");
			} else {
				const claudeNames = new Set(claude.plugins.map(p => p && p.name).filter(Boolean));
				for (const name of rootPluginNames) {
					if (!claudeNames.has(name)) {
						errors.push(`.claude-plugin/marketplace.json: missing plugin '${name}' present in root marketplace.json`);
					}
				}
				for (const name of claudeNames) {
					if (!rootPluginNames.has(name)) {
						errors.push(`.claude-plugin/marketplace.json: plugin '${name}' is not present in root marketplace.json`);
					}
				}
			}
		}
	}

	// The root skills/ aggregation (for `npx skills`) must resolve to real SKILL.md files.
	const rootSkillsDir = join(root, 'skills');
	if (isDir(rootSkillsDir)) {
		for (const entry of readdirSync(rootSkillsDir)) {
			const target = join(rootSkillsDir, entry);
			let resolved;
			try {
				resolved = realpathSync(target);
			} catch {
				errors.push(`skills/${entry}: dangling symlink or unreadable aggregation entry`);
				continue;
			}
			if (!isDir(resolved)) {
				continue;
			}
			if (!existsSync(join(resolved, 'SKILL.md'))) {
				errors.push(`skills/${entry}: aggregation entry has no SKILL.md`);
			}
		}
	}

	return errors;
}

function main() {
	const args = process.argv.slice(2);

	if (args.includes('--test-fixtures')) {
		const fixturesRoot = join(REPO_ROOT, 'test', 'fixtures');
		const invalid = existsSync(fixturesRoot)
			? readdirSync(fixturesRoot).filter(d => d.startsWith('invalid-') && isDir(join(fixturesRoot, d)))
			: [];
		if (invalid.length === 0) {
			console.error('No invalid-* fixtures found under test/fixtures/');
			process.exit(1);
		}
		let ok = true;
		for (const name of invalid) {
			const errors = validateMarketplace(join(fixturesRoot, name));
			if (errors.length === 0) {
				console.error(`FAIL  ${name}: expected validation to fail, but it passed`);
				ok = false;
			} else {
				console.log(`ok    ${name}: correctly rejected (${errors[0]})`);
			}
		}
		process.exit(ok ? 0 : 1);
	}

	const root = args[0] ? join(process.cwd(), args[0]) : REPO_ROOT;
	const errors = validateMarketplace(root);
	if (errors.length > 0) {
		console.error(`Marketplace validation FAILED with ${errors.length} error(s):`);
		for (const e of errors) {
			console.error(`  - ${e}`);
		}
		process.exit(1);
	}
	console.log('Marketplace validation passed.');
}

main();
