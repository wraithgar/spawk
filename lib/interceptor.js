'use strict'

const cp = require('child_process')
const util = require('util')
const stream = require('stream')

const _command = Symbol('command')
const _args = Symbol('args')
const _options = Symbol('options')
const _called = Symbol('called')
const _exitCode = Symbol('exitCode')
const _signal = Symbol('signal')
const _stdout = Symbol('stdout')
const _stderr = Symbol('stderr')
const _child = Symbol('child')

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

class Interceptor {
  constructor (command, args, options) {
    this[_command] = command
    this[_args] = args
    this[_options] = options
    this[_called] = false
    this[_exitCode] = 0
    this[_signal] = null
    this[_stdout] = ''
    this[_child] = new cp.ChildProcess()
  }

  get description () {
    let description = `called spawk interceptor for command: '${this[_command]}'`
    if (!this[_called]) {
      description = `un${description}`
    }
    if (this[_args]) {
      description = `${description}, args: ${util.inspect(this[_args])}`
    }
    if (this[_options]) {
      description = `${description}, options: ${util.inspect(this[_options])}`
    }
    return description
  }

  get called () {
    return this[_called]
  }

  // Internal, to be called only by spawk
  match (command, args = [], options = {}) {
    if (this[_called]) { // For now we can only be called once
      return false
    }

    if (command !== this[_command]) {
      return false
    }

    if (this[_args] && (this[_args].toString() !== args.toString())) {
      return false
    }

    return true
  }

  // Internal, to be called only by spawk
  run (command, args, options) {
    this[_called] = true
    this[_child].stdio = stdios(options)
    this[_child].stdin = this[_child].stdio[0]
    this[_child].stdout = this[_child].stdio[1]
    this[_child].stderr = this[_child].stdio[2]
    process.nextTick(() => {
      if (this[_stdout]) {
        this[_child].stdout.write(this[_stdout])
      }
      this[_child].stdout.end()

      if (this[_stderr]) {
        this[_child].stderr.write(this[_stderr])
      }
      this[_child].stderr.end()

      this[_child].emit('exit', this[_exitCode], this[_signal])
    })
    return this[_child]
  }

  stderr (err) {
    this[_stderr] = err
    return this
  }

  stdout (out) {
    this[_stdout] = out
    return this
  }

  exit (code) {
    this[_exitCode] = code
    return this
  }

  signal (signal) {
    this[_signal] = signal
    return this
  }
}

module.exports = Interceptor
