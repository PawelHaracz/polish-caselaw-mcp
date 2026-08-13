/**
 * SERVER_VERSION musi pochodzić z package.json, nie z literału — inaczej
 * rozjedzie się przy bumpie wersji i narzędzie caselaw_about będzie raportować
 * nieprawdę.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVER_VERSION, SERVER_NAME } from '../src/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('constants', () => {
  it('SERVER_VERSION zgadza się z package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
    );
    expect(SERVER_VERSION).toBe(pkg.version);
  });

  it('SERVER_NAME zgadza się z package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
    );
    expect(SERVER_NAME).toBe(pkg.name.replace(/^@[^/]+\//, ''));
  });
});
