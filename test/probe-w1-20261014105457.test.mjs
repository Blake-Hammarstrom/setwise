import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROBE } from '../src/engine/probe-w1-20261014105457.js'
test('probe', () => { assert.equal(PROBE, 2) })
