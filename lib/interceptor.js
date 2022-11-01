'use strict'

const cp = require('child_process')
const util = require('util')
const stream = require('stream')

function stdios (options = {}) {
  let args = ['pipe', 'pipe', 'pipe']

  if (options.stdio === 'inherit') {
    args = ['inherit', 'inherit', 'inherit']
  }

  if (Array.isArray(options.stdio)) {
    args = options.stdio
  }

  return args.map(arg => {
    if (arg === 'pipe' || arg === 'overlapped') {
      return new stream.PassThrough({ autoDestroy: true })
    }
    if (arg === 'inherit' || arg === 'ignore' || arg === null) {
      return null
    }
    if (typeof arg === 'number') {
      throw new Error('Integer stdio not supported')
    }
    if (arg instanceof stream.Stream) {
      throw new Error('Stream stdio not supported')
    }
    throw new Error(`Invalid stdio: ${arg}`)
  })
}

function compareOptions (defined, called) {
  const serializable = ['cwd', 'argv0', 'detached', 'uid', 'gid', 'serialization',
    'shell', 'windowsVerbatimArguments', 'windowsHide', 'stdio']

  for (const attr of serializable) {
    if (Object.prototype.hasOwnProperty.call(defined, attr) && JSON.stringify(defined[attr]) !== JSON.stringify(called[attr])) {
      return false
    }
  }
  if (Object.prototype.hasOwnProperty.call(defined, 'env')) {
    if (!Object.prototype.hasOwnProperty.call(called, 'env')) {
      return false
    }
    const envKeys = Object.keys(defined.env)
    for (const envKey of envKeys) {
      if (defined.env[envKey] !== called.env[envKey]) {
        return false
      }
    }
  }
  return true
}

// Abstraction to isolate interceptor from the public interface.
// Spawk returns this object to the user, but interacts with the Interceptor
// itself (match, run)
class API {
  #interceptor
  constructor (interceptor) {
    this.#interceptor = interceptor
  }

  get command () {
    return this.#interceptor.command
  }

  get args () {
    return this.#interceptor.args
  }

  get options () {
    return this.#interceptor.options
  }

  get called () {
    return this.#interceptor.called
  }

  get calledWith () {
    if (this.called) {
      return this.#interceptor.calledWith
    }
  }

  get signals () {
    return this.#interceptor.signals
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

  spawnError (err) {
    this.#interceptor.spawnError = err
    return this
  }

  stderrEmit (eventName, ...payload) {
    this.#interceptor.stderrEmit = { eventName, payload }
    return this
  }

  stdoutEmit (eventName, ...payload) {
    this.#interceptor.stdoutEmit = { eventName, payload }
    return this
  }

  exit (code) {
    this.#interceptor.exitCode = code
    return this
  }

  delay (ms) {
    this.#interceptor.delay = ms
    return this
  }

  signal (signal) {
    this.#interceptor.signal = signal
    return this
  }

  exitOnSignal (signal) {
    if (!this.#interceptor.signal) {
      this.#interceptor.signal = signal
    }
    this.#interceptor.exitOnSignal = signal
    return this
  }

  stdout (stdout) {
    this.#interceptor.stdout = stdout
    return this
  }

  stderr (stderr) {
    this.#interceptor.stderr = stderr
    return this
  }
}

class Interceptor {
  #exitCode
  #signal
  #stderr
  #stdin
  #stdout

  constructor (command, args, options) {
    this.signals = []
    this.delay = 0
    this.command = command
    this.args = args
    this.options = options
    this.called = false
    // This is what is returned to the user as the "interceptor"
    this.api = new API(this)
  }

  get exitCode () {
    if (typeof this.#exitCode === 'function') {
      return this.#exitCode.call(this.api)
    }
    return this.#exitCode
  }

  set exitCode (code) {
    this.#signal = undefined
    this.#exitCode = code
  }

  get signal () {
    if (typeof this.#signal === 'function') {
      return this.#signal.call(this.api)
    }
    return this.#signal
  }

  set signal (signal) {
    this.#exitCode = undefined
    this.#signal = signal
  }

  get stdout () {
    if (typeof this.#stdout === 'function') {
      return this.#stdout.call(this.api)
    }
    return this.#stdout
  }

  set stdout (stdout) {
    this.#stdout = stdout
  }

  get stderr () {
    if (typeof this.#stderr === 'function') {
      return this.#stderr.call(this.api)
    }
    return this.#stderr
  }

  set stderr (stderr) {
    this.#stderr = stderr
  }

  match (command, args = [], options = {}) {
    if (this.called) { // For now we can only be called once
      return false
    }

    if (typeof this.command === 'function') {
      if (!this.command.call(this.api, command, args, options)) {
        return false
      }
    } else if (this.command instanceof RegExp) {
      if (!this.command.test(command)) {
        return false
      }
    } else if (command !== this.command) {
      return false
    }

    if (typeof this.args === 'function') {
      if (!this.args.call(this.api, args)) {
        return false
      }
    } else if (this.args && (this.args.toString() !== args.toString())) {
      return false
    }

    if (typeof this.options === 'function') {
      if (!this.options.call(this.api, options)) {
        return false
      }
    } else if (this.options && !compareOptions(this.options, options)) {
      return false
    }

    return true
  }

  run (command, args, options) {
    this.called = true
    this.calledWith = { command, args, options }

    this.child = new cp.ChildProcess()
    this.child.spawnargs = args
    this.child.spawnfile = command
    this.child.connected = false

    const exit = async () => {
      const [exitCode, signal, stdout, stderr] = await Promise.all(
        [this.exitCode, this.signal, this.stdout, this.stderr]
      )
      this.child.connected = false
      this.child.emit('disconnect')

      if (!signal) {
        this.child.exitCode = exitCode || 0
      }
      this.child.signalCode = signal
      let emitCode = this.child.exitCode
      let emitSignal = this.child.signalCode
      // istanbul ignore next
      if (emitSignal && process.platform === 'win32') {
        emitCode = 1
        emitSignal = undefined
      }

      this.child.emit('exit', emitCode, emitSignal)
      if (this.child.stdout) {
        if (this.stdoutEmit) {
          this.child.stdout.emit(this.stdoutEmit.eventName, ...this.stdoutEmit.payload)
        }
        if (stdout) {
          this.child.stdout.write(stdout)
        }
        this.child.stdout.end()
      }
      if (this.child.stderr) {
        if (this.stderrEmit) {
          this.child.stderr.emit(this.stderrEmit.eventName, ...this.stderrEmit.payload)
        }
        if (stderr) {
          this.child.stderr.write(stderr)
        }
        this.child.stderr.end()
      }
      process.nextTick(() => {
        this.child.emit('close', emitCode, emitSignal)
      })
    }

    if (this.spawnError && !this.exitOnSignal) {
      if (!this.delay) {
        // This is very intentional, it forces consumers to set their event
        // listeners IMMEDIATELY after calling child_process.spawn().
        // See: https://nodejs.dev/learn/understanding-setimmediate
        process.nextTick(() => {
          this.child.emit('error', this.spawnError)
        }, this.delay)
      } else {
        setTimeout(() => {
          this.child.emit('error', this.spawnError)
        }, this.delay)
      }
    } else {
      this.child.connected = true
      this.child.stdio = stdios(options)
      this.calledWith.stdio = this.child.stdio
      this.child.stdin = this.child.stdio[0]
      this.child.stdout = this.child.stdio[1]
      this.child.stderr = this.child.stdio[2]
      this.child.kill = (signal) => {
        this.signals.push(signal)
        if (!this.spawnError && (signal === this.exitOnSignal)) {
          this.child.killed = true
        }
        // process.nextTick to give the caller a chance to set up listeners
        process.nextTick(() => {
          this.child.emit(signal, signal)
        })
      }
      // process.nextTick to give the caller a chance to set up listeners
      process.nextTick(() => {
        this.child.emit('spawn')
      })

      if (this.exitOnSignal) {
        if (this.spawnError) {
          this.child.on(this.exitOnSignal, () => {
            this.child.emit('error', this.spawnError)
          })
        } else {
          this.child.on(this.exitOnSignal, exit)
        }
      } else {
        setTimeout(exit, this.delay)
      }
    }
    return this.child
  }

  toString () {
    return this.api.toString()
  }
}

module.exports = Interceptor
