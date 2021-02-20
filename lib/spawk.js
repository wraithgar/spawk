'use strict'

const Mock = require('./mock')
const util = require('util')
const cp = require('child_process')
const { spawn: originalSpawn } = cp

const _allowUnmatched = Symbol('allowUnmatched')
const _mocks = Symbol('mocks')
const _run = Symbol('run')
class Spawk {
  constructor () {
    this[_allowUnmatched] = true
    this[_mocks] = {
      spawn: []
    }
  }

  allowUnmatched () {
    this[_allowUnmatched] = true
  }

  preventUnmatched () {
    this[_allowUnmatched] = false
  }

  done () {
    const uncalled = this[_mocks].spawn.find((mock) => !mock.called)
    if (uncalled) {
      throw new Error(`Uncalled spawn mocks found: ${uncalled.description}`)
    }
    return true
  }

  clean () {
    this[_mocks].spawn = []
  }

  spawn (command, args, options) {
    if (!command) {
      throw new Error('You must specify the command to mock')
    }
    const mocked = new Mock(command, args, options)
    this[_mocks].spawn.push(mocked)
    return mocked
  }

  [_run] (type, command, args, options) {
    const match = this[_mocks][type].find((m) => m.match(command, args, options))
    if (match) {
      return match.run()
    }

    if (!this[_allowUnmatched]) {
      throw new Error(`spawk: Unmatched spawn(${command},${util.inspect(args)},${util.inspect(options)})`)
    }

    return originalSpawn.apply(null, Array.from(arguments).slice(1))
  }
}

const spawk = new Spawk()

cp.spawn = function (command, args, options) {
  return spawk[_run]('spawn', command, args, options)
}

module.exports = spawk
