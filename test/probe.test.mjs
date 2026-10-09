import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROBE } from '../src/engine/probe.js'
test('probe', () => { assert.equal(PROBE, 2) })
