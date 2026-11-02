#!/usr/bin/env node
// Drift check: every shipped SKILL.md must be byte-identical to its canonical
// copy in flowleap-cli at the pinned ref recorded in sync.json. Canonical skills
// live upstream; this repo is a synced distribution. Editing shipped skills/
// content directly (instead of re-syncing) makes this check fail.
//
// Scope: this check ONLY iterates the skills listed in sync.json. Third-party
// submissions (a new skill folder in an existing pack, or a whole new pack) are
// not in that list, so they are never drift-checked — by construction. That is
// the coexistence rule that lets curated third-party skills live beside the
// synced set. See CONTRIBUTING.md ("Why your new skill will not break the drift
// check"). The only thing that trips this check is editing an already-synced
// SKILL.md.
//
// Usage:
//   node scripts/check-drift.mjs                 compare shipped skills to the pinned ref
//   node scripts/check-drift.mjs --require-network   treat "can't reach the source" as a failure (CI)
//
// The pinned source is fetched over HTTPS from raw.githubusercontent.com, so no
// git clone or checkout is needed. Offline (no network), the check skips with a
// warning and exits 0 so the local validator stays runnable without a network —
// unless --require-network is passed, which CI uses to guarantee drift is really
// checked. Zero runtime dependencies (Node 20+ global fetch).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function rawUrl(source, ref, path) {
	return `https://raw.githubusercontent.com/${source}/${ref}/${path}`;
}

/** True for errors that mean "no network" rather than "the file is wrong". */
function isNetworkError(err) {
	if (!(err instanceof Error)) {
		return false;
	}
	const code = err.cause?.code ?? err.code;
	// fetch() rejects with a TypeError ("fetch failed") whose cause carries the
	// DNS/connection errno when the host is unreachable.
	return err.name === 'TypeError' || [
		'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH',
	].includes(code);
}

async function main() {
	const args = process.argv.slice(2);
	const requireNetwork = args.includes('--require-network');

	const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'sync.json'), 'utf8'));
	const { source, ref, sourceSkillsDir = 'skills', skills } = manifest;
	if (!source || !ref || !Array.isArray(skills)) {
		console.error("sync.json: must define 'source', 'ref', and a 'skills' array");
		process.exit(1);
	}

	console.log(`Checking ${skills.length} shipped skills against ${source}@${ref} ...`);

	const drift = [];
	for (const { name, plugin, dir = 'skills' } of skills) {
		const localPath = join(REPO_ROOT, 'plugins', plugin, dir, name, 'SKILL.md');
		const url = rawUrl(source, ref, `${sourceSkillsDir}/${name}/SKILL.md`);

		let local;
		try {
			local = readFileSync(localPath, 'utf8');
		} catch {
			drift.push(`${plugin}/${name}: shipped SKILL.md is missing at ${localPath}`);
			continue;
		}

		let res;
		try {
			res = await fetch(url);
		} catch (err) {
			if (isNetworkError(err) && !requireNetwork) {
				console.warn(`SKIP (offline): could not reach ${source}@${ref} — drift NOT checked. Pass --require-network in CI.`);
				process.exit(0);
			}
			console.error(`Failed to fetch ${url}: ${err.message}`);
			process.exit(1);
		}
		if (!res.ok) {
			drift.push(`${plugin}/${name}: source ${url} returned HTTP ${res.status} (skill missing from ${source}@${ref}?)`);
			continue;
		}
		const remote = await res.text();
		if (remote !== local) {
			drift.push(`${plugin}/${name}: shipped SKILL.md differs from ${source}@${ref} — re-sync from the canonical source (do not hand-edit)`);
		}
	}

	if (drift.length > 0) {
		console.error(`\nDrift check FAILED with ${drift.length} issue(s):`);
		for (const d of drift) {
			console.error(`  - ${d}`);
		}
		console.error(`\nTo fix: re-copy the affected skills from ${source}@${ref}, or bump 'ref' in sync.json and re-sync all skills. See README "Publishing flow".`);
		process.exit(1);
	}
	console.log(`Drift check passed: all ${skills.length} shipped skills match ${source}@${ref}.`);
}

main();
