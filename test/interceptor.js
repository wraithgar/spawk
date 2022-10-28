/* eslint-env node, mocha */
'use strict'

const { expect } = require('chai')
const Fixtures = require('./fixtures')

const { spawk } = Fixtures

const cp = require('child_process')

describe('interceptor', function () {
  beforeEach(function () {
    spawk.load()
    spawk.clean()
    spawk.preventUnmatched()
  })

  it('defaults', async function () {
    const command = Fixtures.command()
    const mock = spawk.spawn(command)
    const spawned = cp.spawn(command)

    const spawnPromise = Fixtures.spawnPromise(spawned)
    const exitPromise = Fixtures.exitPromise(spawned)
    const disconnectPromise = Fixtures.disconnectPromise(spawned)
    const closePromise = Fixtures.disconnectPromise(spawned)
    const stdoutPromise = Fixtures.stdoutPromise(spawned)
    const stderrPromise = Fixtures.stderrPromise(spawned)

    const { code } = await exitPromise
    await spawnPromise
    await disconnectPromise
    await closePromise
    const stdout = await stdoutPromise
    const stderr = await stderrPromise

    expect(code, 'exit code').to.equal(0)
    expect(spawned.spawnfile, 'spawnfile').to.equal(command)
    expect(spawned.connected, 'connected').to.equal(false)
    expect(stdout, 'stdout contents').to.equal(undefined)
    expect(stderr, 'stderr contents').to.equal(undefined)
    expect(mock.called, 'mocked child called').to.equal(true)
  })

  it('calledWith', async function () {
    let calledWith
    const exitCode = Fixtures.exitCode()
    const command = Fixtures.command()
    const args = Fixtures.args()
    const options = Fixtures.options()
    const exitFn = function () {
      calledWith = this.calledWith
      return exitCode
    }
    const mock = spawk.spawn(command).exit(exitFn)

    expect(mock.calledWith).to.equal(undefined)

    const spawned = cp.spawn(command, args, options)
    const { code } = await Fixtures.exitPromise(spawned)

    expect(code, 'exit code').to.equal(exitCode)
    expect(calledWith.command).to.equal(command)
    expect(calledWith.args).to.equal(args)
    expect(calledWith.options).to.equal(options)
    expect(spawned.spawnargs, 'spawnargs').to.equal(args)
    expect(mock.called).to.equal(true)
  })

  describe('exit', function () {
    it('number', async function () {
      const exitCode = Fixtures.exitCode()
      const command = Fixtures.command()
      const mock = spawk.spawn(command).exit(exitCode)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(exitCode)
      expect(mock.called).to.equal(true)
    })

    it('normal function', async function () {
      const exitCode = Fixtures.exitCode()
      const command = Fixtures.command()
      const exitFn = () => exitCode
      const mock = spawk.spawn(command).exit(exitFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(exitCode)
      expect(mock.called).to.equal(true)
    })

    it('async function', async function () {
      const exitCode = Fixtures.exitCode()
      const command = Fixtures.command()
      const exitFn = () => Promise.resolve(exitCode)
      const mock = spawk.spawn(command).exit(exitFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(exitCode)
      expect(mock.called).to.equal(true)
    })
  })

  describe('delay', function () {
    it('number', async function () {
      const delay = 100
      this.slow(delay * 3)
      const command = Fixtures.command()
      spawk.spawn(command).delay(delay)
      const before = new Date()
      const spawned = cp.spawn(command)
      expect(spawned.connected, 'connected').to.equal(true)
      await Fixtures.exitPromise(spawned)
      const after = new Date()
      expect(after - before).to.be.at.least(delay - 10)
    })
  })

  describe('exitOnSignal', function () {
    it('no other signal configured - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal)
      const spawned = cp.spawn(command)

      expect(spawned.exitCode, 'exitCode').to.equal(null)
      await Fixtures.delay(delay)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(spawned.killed, 'killed').to.equal(true)
      expect(mocked.signals, 'mocked signals').to.include(exitSignal)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('no other signal configured - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal)
      const spawned = cp.spawn(command)

      await Fixtures.delay(delay)
      spawned.kill(exitSignal)

      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(spawned.killed, 'killed').to.equal(true)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('other signal configured first - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).signal(otherSignal).exitOnSignal(exitSignal)
      const spawned = cp.spawn(command)

      spawned.kill(otherSignal)
      await Fixtures.delay(delay)
      expect(spawned.killed).to.equal(false)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(otherSignal)
      expect(mocked.called, 'spawned called').to.equal(true)
      expect(mocked.signals, 'mocked signals').to.include(exitSignal)
      expect(mocked.signals, 'mocked signals').to.include(otherSignal)
      expect(spawned.killed).to.equal(true)
    })

    it('other signal configured first - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).signal(otherSignal).exitOnSignal(exitSignal)
      const spawned = cp.spawn(command)

      spawned.kill(otherSignal)
      await Fixtures.delay(delay)
      expect(spawned.killed).to.equal(false)
      spawned.kill(exitSignal)

      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(mocked.called, 'spawned called').to.equal(true)
      expect(mocked.signals, 'mocked signals').to.include(exitSignal)
      expect(mocked.signals, 'mocked signals').to.include(otherSignal)
      expect(spawned.killed).to.equal(true)
    })

    it('other signal configured second - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal).signal(otherSignal)
      const spawned = cp.spawn(command)

      await Fixtures.delay(delay)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(otherSignal)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('other signal configured second - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }

      const delay = 50
      this.slow(delay * 3)

      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal).signal(otherSignal)
      const spawned = cp.spawn(command)

      await Fixtures.delay(delay)
      spawned.kill(exitSignal)

      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(mocked.called, 'spawned called').to.equal(true)
    })
  })

  describe('spawnError', function () {
    it('default', async function () {
      const command = Fixtures.command()
      const error = Fixtures.error()
      spawk.spawn(command).spawnError(error)
      const spawned = cp.spawn(command)
      const caught = await Fixtures.errorPromise(spawned)
      expect(caught.message).to.equal(error.message)
      expect(spawned.connected, 'connected').to.equal(false)
      expect(spawned.stdin).to.equal(undefined)
      expect(spawned.stdout).to.equal(undefined)
      expect(spawned.stderr).to.equal(undefined)
    })

    it('combined with delay', async function () {
      const delay = 100
      this.slow(delay * 3)
      const command = Fixtures.command()
      const error = Fixtures.error()
      spawk.spawn(command).spawnError(error).delay(delay)
      const before = new Date()
      const spawned = cp.spawn(command)
      const caught = await Fixtures.errorPromise(spawned)
      const after = new Date()
      expect(after - before).to.be.at.least(delay - 10)
      expect(caught.message).to.equal(error.message)
      expect(spawned.stdin).to.equal(undefined)
      expect(spawned.stdout).to.equal(undefined)
      expect(spawned.stderr).to.equal(undefined)
    })

    it('combined with exitOnSignal', async function () {
      const delay = 50
      this.slow(delay * 3)
      const command = Fixtures.command()
      const error = Fixtures.error()
      const exitSignal = Fixtures.signal()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal).spawnError(error)
      const spawned = cp.spawn(command)
      await Fixtures.delay(delay)
      const errorPromise = Fixtures.errorPromise(spawned)
      spawned.kill(exitSignal)
      const caught = await errorPromise
      expect(mocked.called, 'spawned called').to.equal(true)
      expect(caught.message, 'error message').to.equal(error.message)
      expect(spawned.killed).to.not.equal(true)
      expect(spawned.stdin).to.not.equal(undefined)
      expect(spawned.stdout).to.not.equal(undefined)
      expect(spawned.stderr).to.not.equal(undefined)
    })
  })

  describe('stdoutEmit', function () {
    it('emits event only', async function () {
      const command = Fixtures.command()
      const mocked = spawk.spawn(command).stdoutEmit('error')
      const spawned = cp.spawn(command)
      let stdoutOne
      spawned.stdout.on('error', (one) => {
        stdoutOne = one
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stdoutOne, 'first emit parameter').to.equal(undefined)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('emits single arg', async function () {
      const command = Fixtures.command()
      const extra = Fixtures.command()
      const mocked = spawk.spawn(command).stdoutEmit('error', extra)
      const spawned = cp.spawn(command)
      let stdoutOne
      spawned.stdout.on('error', (one) => {
        stdoutOne = one
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stdoutOne, 'first emit parameter').to.equal(extra)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('emits multiple args', async function () {
      const command = Fixtures.command()
      const extra = Fixtures.command()
      const error = Fixtures.error()
      const mocked = spawk.spawn(command).stdoutEmit('error', extra, error)
      const spawned = cp.spawn(command)
      let stdoutOne
      let stdoutTwo
      spawned.stdout.on('error', (one, two) => {
        stdoutOne = one
        stdoutTwo = two
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stdoutOne, 'first emit parameter').to.equal(extra)
      expect(stdoutTwo, 'second emit parameter').to.equal(error)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })
  })

  describe('stderrEmit', function () {
    it('emits event only', async function () {
      const command = Fixtures.command()
      const mocked = spawk.spawn(command).stderrEmit('error')
      const spawned = cp.spawn(command)
      let stderrOne
      spawned.stderr.on('error', (one) => {
        stderrOne = one
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stderrOne, 'first emit parameter').to.equal(undefined)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('emits single arg', async function () {
      const command = Fixtures.command()
      const extra = Fixtures.command()
      const mocked = spawk.spawn(command).stderrEmit('error', extra)
      const spawned = cp.spawn(command)
      let stderrOne
      spawned.stderr.on('error', (one) => {
        stderrOne = one
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stderrOne, 'first emit parameter').to.equal(extra)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('emits multiple args', async function () {
      const command = Fixtures.command()
      const extra = Fixtures.command()
      const error = Fixtures.error()
      const mocked = spawk.spawn(command).stderrEmit('error', extra, error)
      const spawned = cp.spawn(command)
      let stderrOne
      let stderrTwo
      spawned.stderr.on('error', (one, two) => {
        stderrOne = one
        stderrTwo = two
      })
      const { code } = await Fixtures.exitPromise(spawned)
      expect(stderrOne, 'first emit parameter').to.equal(extra)
      expect(stderrTwo, 'second emit parameter').to.equal(error)
      expect(code, 'exit code').to.equal(0)
      expect(mocked.called, 'spawned called').to.equal(true)
    })
  })

  describe('signal', function () {
    it('number - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const mock = spawk.spawn(command).signal(exitSignal)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })

    it('number - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const mock = spawk.spawn(command).signal(exitSignal)
      const spawned = cp.spawn(command)
      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(mock.called).to.equal(true)
    })

    it('normal function - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => exitSignal
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })

    it('normal function - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => exitSignal
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(mock.called).to.equal(true)
    })

    it('async function - non windows', async function () {
      if (process.platform === 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => Promise.resolve(exitSignal)
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })

    it('async function - windows', async function () {
      if (process.platform !== 'win32') {
        this.skip()
      }
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => Promise.resolve(exitSignal)
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { code, signal } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(1)
      expect(signal, 'exit signal').to.equal(undefined)
      expect(mock.called).to.equal(true)
    })
  })

  describe('stdout', function () {
    it('string', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const mock = spawk.spawn(command).stdout(output)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stdout = await Fixtures.stdoutPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stdout).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('buffer', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const mock = spawk.spawn(command).stdout(Buffer.from(output))
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stdout = await Fixtures.stdoutPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stdout).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('normal function', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const outputFn = () => output
      const mock = spawk.spawn(command).stdout(outputFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stdout = await Fixtures.stdoutPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stdout).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('async function', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const outputFn = () => Promise.resolve(output)
      const mock = spawk.spawn(command).stdout(outputFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stdout = await Fixtures.stdoutPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stdout).to.equal(output)
      expect(mock.called).to.equal(true)
    })
  })

  describe('stderr', function () {
    it('string', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const mock = spawk.spawn(command).stderr(output)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stderr = await Fixtures.stderrPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stderr).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('buffer', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const mock = spawk.spawn(command).stderr(Buffer.from(output))
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stderr = await Fixtures.stderrPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stderr).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('normal function', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const outputFn = () => output
      const mock = spawk.spawn(command).stderr(outputFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stderr = await Fixtures.stderrPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stderr).to.equal(output)
      expect(mock.called).to.equal(true)
    })

    it('async function', async function () {
      const command = Fixtures.command()
      const output = Fixtures.output()
      const outputFn = () => Promise.resolve(output)
      const mock = spawk.spawn(command).stderr(outputFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)
      const stderr = await Fixtures.stderrPromise(spawned)

      expect(code, 'exit code').to.equal(0)
      expect(stderr).to.equal(output)
      expect(mock.called).to.equal(true)
    })
  })

  describe('description', function () {
    it('contains the command', function () {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(interceptor.description, 'interceptor description').to.have.string(command)
    })

    it('contains the args', function () {
      const command = Fixtures.command()
      const args = Fixtures.args()
      const interceptor = spawk.spawn(command, args)
      for (const arg of args) {
        expect(interceptor.description, 'interceptor description').to.have.string(arg)
      }
    })

    it('contains the options', function () {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command, null, { test: 'option' })
      expect(interceptor.description, 'interceptor description').to.have.string('test: \'option\'')
    })

    it('uncalled', function () {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(interceptor.description, 'interceptor description').to.have.string('uncalled')
    })

    it('called', function () {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      cp.spawn(command)
      expect(interceptor.description, 'interceptor description').to.not.have.string('uncalled')
      expect(interceptor.description, 'interceptor description').to.have.string('called')
    })

    it('stringifies', function () {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(`${interceptor}`, 'stringified interceptor').to.have.string(command)
      expect(`${interceptor}`, 'stringified interceptor').to.have.string('uncalled')
    })
  })

  describe('stdio', function () {
    it('string: inherit', function () {
      const command = Fixtures.command()
      spawk.spawn(command)
      const spawned = cp.spawn(command, null, { stdio: 'inherit' })
      expect(spawned.stdin, 'spawned stdin').to.equal(null)
      expect(spawned.stdout, 'spawned stdout').to.equal(null)
      expect(spawned.stderr, 'spawned stderr').to.equal(null)
    })

    it('array: inherit, pipe, pipe', function () {
      const command = Fixtures.command()
      const stdio = ['inherit', 'pipe', 'pipe']
      spawk.spawn(command)
      const spawned = cp.spawn(command, null, { stdio })
      expect(spawned.stdin, 'spawed stdin').to.equal(null)
      expect(spawned.stdout, 'spawed stdout').to.not.equal(null)
      expect(spawned.stderr, 'spawed stderr').to.not.equal(null)
      expect(stdio, 'original stdio array').to.deep.equal(['inherit', 'pipe', 'pipe'])
    })

    it('array: pipe, inherit, pipe', function () {
      const command = Fixtures.command()
      const stdio = ['pipe', 'inherit', 'pipe']
      spawk.spawn(command)
      const spawned = cp.spawn(command, null, { stdio })
      expect(spawned.stdin, 'spawed stdin').to.not.equal(null)
      expect(spawned.stdout, 'spawed stdout').to.equal(null)
      expect(spawned.stderr, 'spawed stderr').to.not.equal(null)
      expect(stdio, 'original stdio array').to.deep.equal(['pipe', 'inherit', 'pipe'])
    })

    it('number', function () {
      const command = Fixtures.command()
      const stdio = [1, 2, 3]
      spawk.spawn(command)
      expect(() => { cp.spawn(command, null, { stdio }) }).to.throw('Integer stdio not supported')
    })

    it('stream', function () {
      const command = Fixtures.command()
      const stdio = [Fixtures.stream(), 'pipe', 'pipe']
      spawk.spawn(command)
      expect(() => { cp.spawn(command, null, { stdio }) }).to.throw('Stream stdio not supported')
    })

    it('random word', function () {
      const command = Fixtures.command()
      const badStdio = Fixtures.command()
      const stdio = [badStdio, 'pipe', 'pipe']
      spawk.spawn(command)
      expect(() => { cp.spawn(command, null, { stdio }) }).to.throw(`Invalid stdio: ${badStdio}`)
    })
  })
})
