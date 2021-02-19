'use strict'

const cp = require('child_process')
const stream = require('stream')

// TODO isolate stdout and exit as the only public surface area
// Can we make spawk the only thing that can call run?

const _command = Symbol('command')
const _called = Symbol('called')
const _exitCode = Symbol('exitCode')
const _signal = Symbol('signal')
const _stdout = Symbol('stdout')
const _stderr = Symbol('stderr')
const _child = Symbol('child')
class Mock {
  constructor (command, args, options) {
    this[_command] = command
    this[_called] = false
    this[_exitCode] = 0
    this[_signal] = null
    this[_stdout] = ''
    this[_child] = new cp.ChildProcess()
    // For now we support the default ['pipe', 'pipe', 'pipe'] and we can iterate from there
    this[_child].stdin = new stream.PassThrough()
    this[_child].stdout = new stream.PassThrough()
    this[_child].stderr = new stream.PassThrough()
    this[_child].stdio = [
      this[_child].stdin,
      this[_child].stdout,
      this[_child].stderr
    ]
  }

  get description () {
    return `${this[_command]}`
  }

  get called () {
    return this[_called]
  }

  match (command, args, options) {
    if (this[_called]) { // For now we can only be called once
      return false
    }

    if (command !== this[_command]) {
      return false
    }

    return true
  }

  run () {
    this[_called] = true
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

module.exports = Mock
