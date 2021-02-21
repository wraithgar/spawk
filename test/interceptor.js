/* eslint-env node, mocha */
'use strict'

const { expect } = require('chai')
const Fixtures = require('./fixtures')

const spawk = require('../')

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

    const { code, signal } = await Fixtures.exitPromise(spawned)
    const stdout = await Fixtures.stdoutPromise(spawned)
    const stderr = await Fixtures.stderrPromise(spawned)

    expect(code, 'exit code').to.equal(0)
    expect(signal, 'exit signal').to.equal(null)
    expect(stdout, 'stdout contents').to.equal(undefined)
    expect(stderr, 'stderr contents').to.equal(undefined)
    expect(mock.called, 'mocked child called').to.equal(true)
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
      const interceptor = spawk.spawn('ls')
      expect(interceptor.description, 'interceptor description').to.have.string('ls')
    })

    it('contains the args', () => {
      const interceptor = spawk.spawn('ls', ['testarg', 'otherarg'])
      expect(interceptor.description, 'interceptor description').to.have.string('testarg')
      expect(interceptor.description, 'interceptor description').to.have.string('otherarg')
    })

    it('contains the options', () => {
      const interceptor = spawk.spawn('ls', null, { test: 'option' })
      expect(interceptor.description, 'interceptor description').to.have.string('test: \'option\'')
    })

    it('uncalled', () => {
      const interceptor = spawk.spawn('ls')
      expect(interceptor.description, 'interceptor description').to.have.string('uncalled')
    })

    it('called', () => {
      const interceptor = spawk.spawn('ls')
      cp.spawn('ls')
      expect(interceptor.description, 'interceptor description').to.not.have.string('uncalled')
      expect(interceptor.description, 'interceptor description').to.have.string('called')
    })

    it('stringifies', () => {
      const interceptor = spawk.spawn('ls')
      expect(`${interceptor}`, 'stringified interceptor').to.have.string('ls')
      expect(`${interceptor}`, 'stringified interceptor').to.have.string('uncalled')
    })
  })

  describe('stdio', () => {
    it('string: inherit', () => {
      spawk.spawn('ls')
      const spawned = cp.spawn('ls', null, { stdio: 'inherit' })
      expect(spawned.stdin, 'spawned stdin').to.equal(process.stdin)
      expect(spawned.stdout, 'spawned stdout').to.equal(process.stdout)
      expect(spawned.stderr, 'spawned stderr').to.equal(process.stderr)
    })

    it('array: inherit, pipe, pipe', () => {
      spawk.spawn('ls')
      const spawned = cp.spawn('ls', null, { stdio: ['inherit', 'pipe', 'pipe'] })
      expect(spawned.stdin, 'spawed stdin').to.equal(process.stdin)
      expect(spawned.stdout, 'spawed stdout').to.not.equal(process.stdout)
      expect(spawned.stderr, 'spawed stderr').to.not.equal(process.stderr)
    })
  })
})
