import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const agentsPath = join(repoRoot, "AGENTS.md");
const claudePath = join(repoRoot, "CLAUDE.md");

test("AGENTS.md exists and respects the 40-line budget", () => {
  assert.equal(existsSync(agentsPath), true, "AGENTS.md must exist at repo root");
  const content = readFileSync(agentsPath, "utf-8");
  const lines = content.trim().split("\n");
  assert.ok(lines.length <= 40, `AGENTS.md must be <= 40 lines (was ${lines.length})`);
});

test("AGENTS.md contains required spec sections and freedom clause on organized", () => {
  const content = readFileSync(agentsPath, "utf-8");
  assert.match(content, /npm run check/, "Must name npm run check as the one command");
  assert.match(content, /FLEET\.md/, "Must link FLEET.md");
  assert.match(content, /ECOSYSTEM\.md/, "Must reference ECOSYSTEM.md");
  assert.match(content, /organized/, "Freedom clause must explicitly name default branch 'organized'");
});

test("CLAUDE.md is demoted to a concise pointer to AGENTS.md", () => {
  assert.equal(existsSync(claudePath), true, "CLAUDE.md must exist at repo root");
  const content = readFileSync(claudePath, "utf-8");
  const lines = content.trim().split("\n");
  assert.ok(lines.length <= 2, `CLAUDE.md must be <= 2 lines (was ${lines.length})`);
  assert.match(content, /^@AGENTS\.md/, "CLAUDE.md must @-import AGENTS.md");
});

test("always-loaded context stays well under the 600-token budget", () => {
  const claudeContent = readFileSync(claudePath, "utf-8");
  const agentsContent = readFileSync(agentsPath, "utf-8");
  // Total eager context is CLAUDE.md + AGENTS.md
  const totalChars = claudeContent.length + agentsContent.length;
  const estimatedTokens = Math.round(totalChars / 4);
  assert.ok(estimatedTokens <= 600, `Estimated tokens must be <= 600 (was ${estimatedTokens})`);
});
