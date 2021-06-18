/* eslint-env node, mocha */
'use strict'

const { expect } = require('chai')
const Fixtures = require('./fixtures')

const { spawk } = Fixtures

const cp = require('child_process')

describe('interceptor', () => {
  beforeEach(() => {
    spawk.load()
    spawk.clean()
    spawk.preventUnmatched()
  })

  it('defaults', async () => {
    const command = Fixtures.command()
    const mock = spawk.spawn(command)
    const spawned = cp.spawn(command)

    const spawnPromise = Fixtures.spawnPromise(spawned)
    const exitPromise = Fixtures.exitPromise(spawned)
    const disconnectPromise = Fixtures.disconnectPromise(spawned)
    const { code, signal } = await exitPromise
    await disconnectPromise
    await spawnPromise
    const stdout = await Fixtures.stdoutPromise(spawned)
    const stderr = await Fixtures.stderrPromise(spawned)

    expect(code, 'exit code').to.equal(0)
    expect(spawned.spawnfile, 'spawnfile').to.equal(command)
    expect(spawned.connected, 'connected').to.equal(false)
    expect(signal, 'exit signal').to.equal(null)
    expect(stdout, 'stdout contents').to.equal(undefined)
    expect(stderr, 'stderr contents').to.equal(undefined)
    expect(mock.called, 'mocked child called').to.equal(true)
  })

  it('calledWith', async () => {
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

  describe('exit', () => {
    it('number', async () => {
      const exitCode = Fixtures.exitCode()
      const command = Fixtures.command()
      const mock = spawk.spawn(command).exit(exitCode)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(exitCode)
      expect(mock.called).to.equal(true)
    })

    it('normal function', async () => {
      const exitCode = Fixtures.exitCode()
      const command = Fixtures.command()
      const exitFn = () => exitCode
      const mock = spawk.spawn(command).exit(exitFn)
      const spawned = cp.spawn(command)
      const { code } = await Fixtures.exitPromise(spawned)

      expect(code, 'exit code').to.equal(exitCode)
      expect(mock.called).to.equal(true)
    })

    it('async function', async () => {
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

  describe('delay', () => {
    it('number', async () => {
      const delay = 100
      const command = Fixtures.command()
      spawk.spawn(command).delay(delay)
      const before = new Date()
      const spawned = cp.spawn(command)
      expect(spawned.connected, 'connected').to.equal(true)
      await Fixtures.exitPromise(spawned)
      const after = new Date()
      expect(after - before).to.be.at.least(delay)
    })
  })

  describe('exitOnSignal', () => {
    it('no other signal configured', async () => {
      const exitSignal = Fixtures.signal()
      const exitCode = Fixtures.exitCode()

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal).exit(exitCode)
      const spawned = cp.spawn(command)

      await Fixtures.delay(50)
      expect(spawned.exitCode).to.not.equal(exitCode)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(spawned.killed, 'killed').to.equal(true)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('other signal configured first', async () => {
      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)
      const exitCode = Fixtures.exitCode()

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).signal(otherSignal).exitOnSignal(exitSignal).exit(exitCode)
      const spawned = cp.spawn(command)

      await Fixtures.delay(50)
      expect(spawned.exitCode).to.not.equal(exitCode)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(otherSignal)
      expect(mocked.called, 'spawned called').to.equal(true)
    })

    it('other signal configured second', async () => {
      const exitSignal = Fixtures.signal()
      const otherSignal = Fixtures.signal(exitSignal)
      const exitCode = Fixtures.exitCode()

      const command = Fixtures.command()
      const mocked = spawk.spawn(command).exitOnSignal(exitSignal).signal(otherSignal).exit(exitCode)
      const spawned = cp.spawn(command)

      await Fixtures.delay(50)
      expect(spawned.exitCode).to.not.equal(exitCode)
      spawned.kill(exitSignal)

      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(otherSignal)
      expect(mocked.called, 'spawned called').to.equal(true)
    })
  })

  describe('signal', () => {
    it('number', async () => {
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const mock = spawk.spawn(command).signal(exitSignal)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })

    it('normal function', async () => {
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => exitSignal
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })

    it('async function', async () => {
      const exitSignal = Fixtures.signal()
      const command = Fixtures.command()
      const signalFn = () => Promise.resolve(exitSignal)
      const mock = spawk.spawn(command).signal(signalFn)
      const spawned = cp.spawn(command)
      const { signal } = await Fixtures.exitPromise(spawned)

      expect(signal, 'exit signal').to.equal(exitSignal)
      expect(mock.called).to.equal(true)
    })
  })

  describe('stdout', () => {
    it('string', async () => {
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

    it('buffer', async () => {
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

    it('normal function', async () => {
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

    it('async function', async () => {
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

  describe('stderr', () => {
    it('string', async () => {
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

    it('buffer', async () => {
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

    it('normal function', async () => {
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

    it('async function', async () => {
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

  describe('description', () => {
    it('contains the command', () => {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(interceptor.description, 'interceptor description').to.have.string(command)
    })

    it('contains the args', () => {
      const command = Fixtures.command()
      const args = Fixtures.args()
      const interceptor = spawk.spawn(command, args)
      for (const arg of args) {
        expect(interceptor.description, 'interceptor description').to.have.string(arg)
      }
    })

    it('contains the options', () => {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command, null, { test: 'option' })
      expect(interceptor.description, 'interceptor description').to.have.string('test: \'option\'')
    })

    it('uncalled', () => {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(interceptor.description, 'interceptor description').to.have.string('uncalled')
    })

    it('called', () => {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      cp.spawn(command)
      expect(interceptor.description, 'interceptor description').to.not.have.string('uncalled')
      expect(interceptor.description, 'interceptor description').to.have.string('called')
    })

    it('stringifies', () => {
      const command = Fixtures.command()
      const interceptor = spawk.spawn(command)
      expect(`${interceptor}`, 'stringified interceptor').to.have.string(command)
      expect(`${interceptor}`, 'stringified interceptor').to.have.string('uncalled')
    })
  })

  describe('stdio', () => {
    it('string: inherit', () => {
      const command = Fixtures.command()
      spawk.spawn(command)
      const spawned = cp.spawn(command, null, { stdio: 'inherit' })
      expect(spawned.stdin, 'spawned stdin').to.not.equal(process.stdin)
      expect(spawned.stdout, 'spawned stdout').to.not.equal(process.stdout)
      expect(spawned.stderr, 'spawned stderr').to.not.equal(process.stderr)
    })

    it('array: inherit, pipe, pipe', () => {
      const command = Fixtures.command()
      spawk.spawn(command)
      const spawned = cp.spawn(command, null, { stdio: ['inherit', 'pipe', 'pipe'] })
      expect(spawned.stdin, 'spawed stdin').to.not.equal(process.stdin)
      expect(spawned.stdout, 'spawed stdout').to.not.equal(process.stdout)
      expect(spawned.stderr, 'spawed stderr').to.not.equal(process.stderr)
    })
  })
})
