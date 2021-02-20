'use strict'

const cp = require('child_process')
const util = require('util')
const stream = require('stream')

const _interceptor = Symbol('interceptor')

function stdios (options = {}) {
  let stdio = ['pipe', 'pipe', 'pipe']

  if (options.stdio === 'inherit') {
    stdio = ['inherit', 'inherit', 'inherit']
  }

  if (Array.isArray(options.stdio)) {
    stdio = options.stdio
  }

  if (stdio[0] === 'inherit') {
    stdio[0] = process.stdin
  } else {
    stdio[0] = new stream.PassThrough()
  }

  if (stdio[1] === 'inherit') {
    stdio[1] = process.stdout
  } else {
    stdio[1] = new stream.PassThrough()
  }

  if (stdio[2] === 'inherit') {
    stdio[2] = process.stderr
  } else {
    stdio[2] = new stream.PassThrough()
  }

  return stdio
}

// Abstraction to isolate interceptor from the public interface.
// Spawk returns this object to the user, but interacts with the
// Interceptor itself
class API {
  constructor (interceptor) {
    this[_interceptor] = interceptor
  }

  get command () {
    return this[_interceptor].command
  }

  get args () {
    return this[_interceptor].args
  }

  get options () {
    return this[_interceptor].options
  }

  get called () {
    return this[_interceptor].called
  }

  get description () {
    let description = `called spawk interceptor for command: '${this.command}'`
    if (!this.called) {
      description = `un${description}`
    }
    if (this.args) {
      description = `${description}, args: ${util.inspect(this.args)}`
    }
    if (this.options) {
      description = `${description}, options: ${util.inspect(this.options)}`
    }
    return description
  }

  toString () {
    return this.description
  }

  exit (code) {
    this[_interceptor].exitCode = code
    return this
  }

  signal (signal) {
    this[_interceptor].signal = signal
    return this
  }

  stdout (stdout) {
    this[_interceptor].stdout = stdout
    return this
  }

  stderr (stderr) {
    this[_interceptor].stderr = stderr
    return this
  }
}

class Interceptor {
  constructor (command, args, options) {
    this.command = command
    this.args = args
    this.options = options
    this.called = false
    this.exitCode = 0
    this.signal = null
    this.stdout = ''
    this.child = new cp.ChildProcess()
    this.api = new API(this)
  }

  match (command, args = [], options = {}) {
    if (this.called) { // For now we can only be called once
      return false
    }

    if (command !== this.command) {
      return false
    }

    if (this.args && (this.args.toString() !== args.toString())) {
      return false
    }

    if (this.options) {
      const optKeys = Object.keys(this.options)
      for (const optKey of optKeys) {
        if (this.options[optKey] !== options[optKey]) {
          return false
        }
      }
    }

    return true
  }

  run (command, args, options) {
    this.called = true
    this.child.stdio = stdios(options)
    this.child.stdin = this.child.stdio[0]
    this.child.stdout = this.child.stdio[1]
    this.child.stderr = this.child.stdio[2]
    process.nextTick(() => {
      if (this.stdout) {
        this.child.stdout.end(this.stdout)
      }
      // node v10 and v12 don't automatically do this
      this.child.stdout.emit('close')

      if (this.stderr) {
        this.child.stderr.end(this.stderr)
      }
      // node v10 and v12 don't automatically do this
      this.child.stderr.emit('close')

      this.child.emit('exit', this.exitCode, this.signal)
    })
    return this.child
  }

  toString () {
    return this.api.description
  }
}

module.exports = Interceptor
