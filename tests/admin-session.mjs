/* eslint-disable typescript/no-implied-eval -- Execute only the checked-in authentication module with the same local transpilation approach as racing tests. */
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(
  new URL('../lib/admin-session.ts', import.meta.url),
  'utf8',
);
const mod = {};
new Function(
  'exports',
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(mod);
const secret = 'test-only-credential-not-used-by-any-server';
const now = 1700000000000;
const token = await mod.mintSession(secret, now);
assert.equal(await mod.verifySession(token, secret, now), true);
assert.equal(
  await mod.verifySession(token, secret, now + mod.SESSION_SECONDS * 1000 - 1),
  true,
);
assert.equal(
  await mod.verifySession(token, secret, now + mod.SESSION_SECONDS * 1000),
  false,
);
assert.equal(await mod.verifySession(token, 'rotated-secret', now), false);
assert.equal(await mod.verifySession(token, '', now), false);
assert.equal(await mod.verifySession(token + '.extra', secret, now), false);
assert.equal(await mod.verifySession('invalid', secret, now), false);
const [payload, signature] = token.split('.');
assert.equal(
  await mod.verifySession(`${payload.slice(0, -1)}A.${signature}`, secret, now),
  false,
);
assert.equal(await mod.matchesKey(secret, secret), true);
assert.equal(await mod.matchesKey('wrong', secret), false);
assert.equal(await mod.matchesKey('', ''), false);
assert.equal(token.includes(secret), false);
assert.notEqual(token, await mod.mintSession(secret, now));
console.log(
  'PASS: signed sessions, expiry boundary, tamper rejection, key rotation, malformed tokens and credential comparisons.',
);
