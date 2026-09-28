#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url));
const CHECKER = resolve(FIXTURES_DIR, "..", "check_prompt.mjs");
const GOOD_DIR = resolve(FIXTURES_DIR, "good");
const ALL_LIMITS = "camera,lighting,photo-texture,palette-count";
const CREATE_A = readFileSync(resolve(GOOD_DIR, "example_poster.txt"), "utf8");
const CREATE_B = readFileSync(resolve(GOOD_DIR, "hwabo_formatB.txt"), "utf8");
const VERBATIM = "Use the supplied prompt exactly: cinematic portrait, no extra people, preserve the original wording.";
const EDIT = "Change only the mug from blue to red; preserve the subject, framing, lighting, and background.";

function run(args, input = undefined) {
  const child = spawnSync(process.execPath, [CHECKER, ...args], { input, encoding: "utf8" });
  assert.equal(child.error, undefined, child.error?.message);
  let output;
  try { output = JSON.parse(child.stdout); }
  catch (error) { throw new Error(`checker did not emit JSON: ${error.message}\n${child.stdout}\n${child.stderr}`); }
  return { exit: child.status, output, stdout: child.stdout, stderr: child.stderr };
}

function codes(result) {
  return result.output.errors?.map((item) => item.code) ?? result.output.results?.flatMap((row) => row.errors.map((item) => item.code)) ?? [];
}

function assertSkips(result, expectedCodes, reason, message) {
  const observed = [...result.output.skipped].sort((a, b) => a.code.localeCompare(b.code));
  const expected = expectedCodes.map((code) => ({ code, reason })).sort((a, b) => a.code.localeCompare(b.code));
  assert.deepEqual(observed, expected, message ?? result.stdout);
  assert.equal(new Set(observed.map((item) => item.code)).size, observed.length, "each rule has exactly one skip reason");
}

function assertPass(result, message) {
  assert.equal(result.exit, 0, message ?? result.stdout);
  assert.equal(result.output.ok, true, message ?? result.stdout);
  assert.equal(codes(result).length, 0, message ?? result.stdout);
}

// Legacy surface: the full fixture suite remains the 27-case regression gate.
const regression = spawnSync(process.execPath, [CHECKER, "--test"], { encoding: "utf8" });
assert.equal(regression.status, 0, regression.stdout + regression.stderr);
assert.match(regression.stdout, /27\/27 fixtures green/);

// Plaintext file and stdin are both real CLI surfaces.
const plaintext = run([resolve(GOOD_DIR, "example_poster.txt")]);
assertPass(plaintext, plaintext.stdout);
assert.equal(plaintext.output.format, "A");

const legacyCloseup = run([], "Scene: 네이비 컵 하나, 클로즈업 구도. Lighting: 부드러운 자연광. Texture/Medium: 매트한 도자기 질감. AR 1:1");
assertPass(legacyCloseup, legacyCloseup.stdout);
const legacyWide = run([], "Scene: 네이비 컵 하나, 와이드 구도. Lighting: 부드러운 자연광. Texture/Medium: 매트한 도자기 질감. AR 1:1");
assertPass(legacyWide, legacyWide.stdout);

const c1 = run(["--intent", "create", "--format", "A"], "A lone red umbrella stands beside a quiet lake at dawn, centered against pale fog. AR 3:2");
assertPass(c1, c1.stdout);
assert.ok(c1.output.warnings.some((item) => item.code === "W-SEMANTIC-REVIEW"));

const structuredA = run(["--intent", "create", "--format", "A"], "Scene: A ceramic cup on a table. Camera: centered framing. Lighting: soft daylight. Texture/Medium: matte ceramic finish. AR 2:3");
assertPass(structuredA, structuredA.stdout);

const hex3Override = run(["--intent", "create", "--format", "A"], "A flat vector icon of a red umbrella beside a quiet lake, using #112233, #445566, and #778899. AR 1:1");
assertPass(hex3Override, hex3Override.stdout);
assert.equal(hex3Override.output.format, "A");
assert.ok(!codes(hex3Override).includes("E-FMT-B-HEX"));

const formatBPrompt = (hexes) => `A portrait of an adult in eye-level framing, soft daylight, matte fabric finish${hexes.length ? `, using ${hexes.join(", ")}` : ""}. AR 2:3`;
const formatBHexes = ["#112233", "#445566", "#778899", "#AABBCC", "#DDEEFF", "#010203"];
for (const count of [0, 1, 2, 6]) {
  const result = run(["--intent", "create", "--format", "B"], formatBPrompt(formatBHexes.slice(0, count)));
  assert.equal(result.exit, 1, `Format B HEX ${count} should fail\n${result.stdout}`);
  assert.ok(codes(result).includes("E-FMT-B-HEX"), `Format B HEX ${count} should report E-FMT-B-HEX`);
}
const formatBPaletteLimited = run(["--intent", "create", "--format", "B", "--medium-limits", "palette-count"], formatBPrompt([]));
assertPass(formatBPaletteLimited, formatBPaletteLimited.stdout);
assertSkips(formatBPaletteLimited, ["E-FMT-B-HEX"], "MEDIUM_LIMIT");
const formatAPaletteLimited = run(["--intent", "create", "--format", "A", "--medium-limits", "palette-count"], formatBPrompt([]));
assertPass(formatAPaletteLimited, formatAPaletteLimited.stdout);
assertSkips(formatAPaletteLimited, ["W-HEX-MISS"], "MEDIUM_LIMIT");

const limitedC1 = run(["--intent", "create", "--format", "A", "--medium-limits", ALL_LIMITS], "Something rests nearby. AR 1:1");
assertPass(limitedC1, limitedC1.stdout);
const semanticReview = limitedC1.output.warnings.find((item) => item.code === "W-SEMANTIC-REVIEW");
assert.ok(semanticReview, limitedC1.stdout);
for (const meaning of ["배치·구도·레이아웃", "매체·재질", "색의 의미"]) assert.ok(semanticReview.msg.includes(meaning), meaning);

const commonPreserveSkips = [
  "E-AR-END", "E-CAM-LANG", "E-LIGHT-LANG", "E-TEX-LANG", "E-TEXT-QUOTE", "E-TEXT-DUP",
  "W-TEXT-ROLE", "W-TEXT-MIXLANG", "W-TEXT-GUARD", "E-NEG-SECTION", "E-NEG-TIER",
  "E-TIER2-DUP", "E-TIER2-EXTRA", "E-TIER2-POS", "E-TIER2-PAIR", "E-NEG-001", "W-NEG-KO",
  "W-FILLER", "W-HWABO-TOKEN", "E-HEAD-BRACKET", "E-SD-VOCAB", "E-WEIGHT", "E-MJ-FLAG",
];
const formatPreserveSkips = { A: ["E-CAT-LANG", "W-SHORT-A", "W-HEX-MISS"], B: ["E-FMT-B-HEX", "W-LEN-B"] };

// All 3 intents × 2 formats × (unlimited / medium-limited) boundaries.
const matrix = [
  ["create", "A", CREATE_A, []],
  ["create", "B", CREATE_B, ["--tier", "2"]],
  ["verbatim", "A", VERBATIM, []],
  ["verbatim", "B", VERBATIM, []],
  ["edit", "A", EDIT, []],
  ["edit", "B", EDIT, []],
];
for (const [intent, format, input, extra] of matrix) {
  const baseArgs = ["--intent", intent, "--format", format, ...extra];
  const base = run(baseArgs, input);
  assertPass(base, `${intent}/${format} base\n${base.stdout}`);
  const limited = run([...baseArgs, "--medium-limits", ALL_LIMITS], input);
  assertPass(limited, `${intent}/${format} limited\n${limited.stdout}`);
  if (intent === "create") {
    assertSkips(base, [], "MEDIUM_LIMIT", `${intent}/${format} base`);
    assertSkips(limited, ["E-CAM-PHOTO", "E-LIGHT-PHOTO", "E-TEX-PHOTO", format === "A" ? "W-HEX-MISS" : "E-FMT-B-HEX"], "MEDIUM_LIMIT", `${intent}/${format} limited`);
  } else {
    const expectedCodes = [...commonPreserveSkips, ...formatPreserveSkips[format]];
    const reason = intent === "verbatim" ? "VERBATIM_PRESERVE" : "EDIT_SCOPE";
    assertSkips(base, expectedCodes, reason, `${intent}/${format} base`);
    assertSkips(limited, expectedCodes, reason, `${intent}/${format} limited`);
  }
}
console.log("12/12 skip combinations: exact code sets and reasons PASS");

const verbatim = run(["--intent", "verbatim", "--format", "A"], VERBATIM);
assertPass(verbatim, verbatim.stdout);
assert.ok(verbatim.output.skipped.some((item) => item.code === "E-AR-END" && item.reason === "VERBATIM_PRESERVE"));
assert.ok(verbatim.output.skipped.some((item) => item.code === "E-NEG-001" && item.reason === "VERBATIM_PRESERVE"));

const originalVerbatim = run(["--intent", "verbatim"], "masterpiece, highly detailed photograph of a tree.");
assertPass(originalVerbatim, originalVerbatim.stdout);
assert.ok(originalVerbatim.output.skipped.some((item) => item.code === "E-SD-VOCAB" && item.reason === "VERBATIM_PRESERVE"));

const creativeSyntax = "[AR 1:1 SIZE 1024x1024] masterpiece, highly detailed photograph (tree:1.2) --ar 1:1";
for (const intent of ["verbatim", "edit"]) {
  const preserved = run(["--intent", intent], creativeSyntax);
  assertPass(preserved, `${intent} creative syntax\n${preserved.stdout}`);
  const reason = intent === "verbatim" ? "VERBATIM_PRESERVE" : "EDIT_SCOPE";
  for (const code of ["E-HEAD-BRACKET", "E-SD-VOCAB", "E-WEIGHT", "E-MJ-FLAG"])
    assert.ok(preserved.output.skipped.some((item) => item.code === code && item.reason === reason), `${intent} should skip ${code}`);
}

const edit = run(["--intent", "edit", "--format", "A"], EDIT);
assertPass(edit, edit.stdout);
assert.ok(edit.output.skipped.some((item) => item.code === "E-AR-END" && item.reason === "EDIT_SCOPE"));

// JSONL stdin keeps the source schema and validates records independently.
const goodRecord = JSON.parse(readFileSync(resolve(GOOD_DIR, "records.jsonl"), "utf8").split("\n", 1)[0]);
const jsonl = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], JSON.stringify(goodRecord));
assertPass(jsonl, jsonl.stdout);
assert.equal(jsonl.output.results.length, 1);
assert.ok(jsonl.output.results[0].skipped.some((item) => item.reason === "VERBATIM_PRESERVE"));

const formatMismatchRecord = { ...goodRecord, id: "format-mismatch", format: "B" };
const formatMismatchBefore = JSON.stringify(formatMismatchRecord);
const formatMismatch = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], JSON.stringify(formatMismatchRecord));
assertPass(formatMismatch, formatMismatch.stdout);
assert.equal(formatMismatch.output.results[0].format, "A");
assert.equal(formatMismatchRecord.format, "B");
assert.equal(JSON.stringify(formatMismatchRecord), formatMismatchBefore);
assert.ok(formatMismatch.output.results[0].warnings.some((item) => item.code === "W-FORMAT-OVERRIDE"));
assert.ok(formatMismatch.output.results[0].skipped.some((item) => item.reason === "VERBATIM_PRESERVE"));

const malformed = run(["--jsonl", "-", "--intent", "create", "--format", "A"], "{\"id\":\"ok\"}\nnot-json");
assert.equal(malformed.exit, 1);
assert.equal(malformed.output.ok, false);
assert.ok(codes(malformed).includes("E-REC-FIELD"));
assert.ok(codes(malformed).includes("E-REC-JSON"));

const missingRequired = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], JSON.stringify({ id: "missing" }));
assert.equal(missingRequired.exit, 1);
assert.ok(codes(missingRequired).includes("E-REC-FIELD"));
assert.equal(missingRequired.output.results[0].skipped.length, 0);

const wrongType = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], "[]");
assert.equal(wrongType.exit, 1);
assert.ok(codes(wrongType).includes("E-REC-TYPE"));

const unsafePathRecord = { ...goodRecord, id: "unsafe", output_path: "../escape.webp" };
const unsafePath = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], JSON.stringify(unsafePathRecord));
assert.equal(unsafePath.exit, 1);
assert.ok(codes(unsafePath).includes("E-PATH-ESCAPE"));
assert.ok(!unsafePath.output.results[0].errors.every((item) => item.code === "E-AR-END"));

const slotLeakRecord = { ...goodRecord, id: "slot-leak", full_prompt: "[SCENE]" };
const slotLeak = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], JSON.stringify(slotLeakRecord));
assert.equal(slotLeak.exit, 1);
assert.ok(codes(slotLeak).includes("E-SLOT-LEAK"));

const invalidIntent = run(["--intent", "unknown"], "text");
assert.equal(invalidIntent.exit, 1);
assert.ok(codes(invalidIntent).includes("E-ARG-INTENT"));

const invalidFormat = run(["--format", "C"], "text");
assert.equal(invalidFormat.exit, 1);
assert.ok(codes(invalidFormat).includes("E-ARG-FORMAT"));

const invalidMedium = run(["--intent", "create", "--medium-limits", "camera,unknown"], "text");
assert.equal(invalidMedium.exit, 1);
assert.ok(codes(invalidMedium).includes("E-MEDIUM-LIMIT"));

const empty = run(["--intent", "create", "--format", "A"], " \n\t");
assert.equal(empty.exit, 1);
assert.ok(codes(empty).includes("E-INPUT-EMPTY"));
assert.equal(empty.output.skipped.length, 0);

const emptyJsonl = run(["--jsonl", "-", "--intent", "verbatim", "--format", "A"], "");
assert.equal(emptyJsonl.exit, 1);
assert.ok(codes(emptyJsonl).includes("E-REC-EMPTY"));
assert.equal(emptyJsonl.output.skipped.length, 0);

const help = spawnSync(process.execPath, [CHECKER, "--help"], { encoding: "utf8" });
assert.equal(help.status, 0, help.stdout + help.stderr);
assert.match(help.stdout, /--medium-limits/);

console.log("context.test.mjs: PASS");
