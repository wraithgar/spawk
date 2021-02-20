'use strict'

const Interceptor = require('./interceptor')
const util = require('util')
const cp = require('child_process')
const { spawn: originalSpawn } = cp

const _allowUnmatched = Symbol('allowUnmatched')
const _interceptors = Symbol('interceptors')
const _run = Symbol('run')
class Spawk {
  constructor () {
    this[_allowUnmatched] = true
    this[_interceptors] = {
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
    const uncalled = this[_interceptors].spawn.find((interceptor) => !interceptor.called)
    if (uncalled) {
      throw new Error(`Uncalled spawn interceptors found: ${uncalled}`)
    }
    return true
  }

  clean () {
    this[_interceptors].spawn = []
  }

  spawn (command, args, options) {
    if (!command) {
      throw new Error('You must specify the command to intercept')
    }
    const intercepted = new Interceptor(command, args, options)
    this[_interceptors].spawn.push(intercepted)
    return intercepted.api
  }

  [_run] (type, command, args, options) {
    const match = this[_interceptors][type].find((m) => m.match(command, args, options))
    if (match) {
      return match.run(command, args, options)
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
