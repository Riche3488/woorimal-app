const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');

require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);

const pack = JSON.parse(fs.readFileSync('assets/pack.json', 'utf8'));
const { emptyProgress } = require('../src/core/progress.ts');
const { seededRng } = require('../src/core/challenge.ts');
const { pickQuickRound } = require('../src/core/quick-play.ts');
const { pickAdaptiveRound } = require('../src/core/adaptive-picker.ts');
const now = new Date('2026-11-22T12:00:00+09:00').getTime();
const normalizedAnswer = q => q.answer.normalize('NFC').replace(/\s/g, '');
const started = performance.now();

for (let i = 0; i < 200; i++) {
  const options = { now, rng: seededRng('validation-' + i) };
  const quick = pickQuickRound(pack.questions, emptyProgress(), options);
  assert.equal(quick.length, 5, 'quick count, seed ' + i);
  assert(quick.every(q => q.kind === 'choice'), 'quick presentation, seed ' + i);
  assert.equal(new Set(quick.map(normalizedAnswer)).size, 5, 'quick duplicates, seed ' + i);

  const adaptive = pickAdaptiveRound(pack.questions, emptyProgress(), {
    ...options, rng: seededRng('adaptive-' + i), count: 10, choiceMode: true,
  });
  assert.equal(adaptive.length, 10, 'adaptive count, seed ' + i);
  assert.equal(new Set(adaptive.map(normalizedAnswer)).size, 10, 'adaptive duplicates, seed ' + i);
  for (const q of adaptive) if (q.kind === 'choice') assert(q.choices.includes(q.answer), 'missing choice answer');
}
console.log(JSON.stringify({ pack: pack.version, quickRounds: 200, coldAdaptiveRounds: 200, invariants: 'PASS', elapsedMs: Math.round(performance.now() - started) }));
