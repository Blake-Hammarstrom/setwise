import { test } from 'node:test'
import assert from 'node:assert/strict'
import { double } from '../src/engine/probe-w2-20261014105457.js'
test('double', () => { assert.equal(double(2), 4) })
