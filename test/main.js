/* eslint-env node, mocha */
const { expect } = require('chai')

const spawk = require('../')

const cp = require('child_process')

describe('spawk', () => {
  beforeEach(() => {
    spawk.load()
    spawk.clean()
    spawk.preventUnmatched()
  })

  it('loads and unloads', () => {
    expect(spawk.loaded, 'initial loaded state').to.equal(true)
    expect(() => { spawk.spawn('ls') }, 'mocked ls').to.not.throw()
    expect(() => { spawk.unload() }, 'unload').to.not.throw()
    expect(spawk.uncalled, 'uncalled mocks').to.equal(undefined)
    expect(() => { spawk.spawn('ls') }, 'mocked ls').to.throw(/unloaded/)
    expect(() => { spawk.unload() }, 'unload').to.not.throw()
    expect(() => { spawk.load() }, 'load').to.not.throw()
    expect(() => { spawk.spawn('ls') }, 'mocked ls').to.not.throw()
    expect(spawk.uncalled).to.have.string('ls')
  })

  describe('unmatched', () => {
    it('throws helpful error on unmatched spawn', () => {
      expect(() => { cp.spawn('ls', ['-al'], { shell: true }) }, 'mocked ls with parameters').to.throw(/spawk: Unmatched spawn.*ls.*-al.*shell.*true/)
    })

    it('does not throw on unmatched spawn', () => {
      spawk.allowUnmatched()
      const ls = cp.spawn('ls')
      expect(ls, 'mocked ls').to.be.instanceof(cp.ChildProcess)
    })
  })

  describe('interceptor', () => {
    it('requires a command', () => {
      expect(() => { spawk.spawn() }, 'spawk.spawn() with no arguments').to.throw('You must specify the command to intercept')
    })

    it('intercepts a command with exitCode, stderr, and stdout', async () => {
      const ls = spawk.spawn('ls').exit(42).signal('SIGHUP').stdout('test stdout output').stderr('test stderr output')
      const spawned = cp.spawn('ls')

      const stderrPromise = new Promise((resolve) => {
        let stderr = ''
        spawned.stderr.on('data', (data) => {
          stderr = `${stderr}${data}`
        })
        spawned.stderr.on('close', () => {
          resolve(stderr)
        })
      })

      const stdoutPromise = new Promise((resolve) => {
        let stdout = ''
        spawned.stdout.on('data', (data) => {
          stdout = `${stdout}${data}`
        })
        spawned.stdout.on('close', () => {
          resolve(stdout)
        })
      })

      const exitPromise = new Promise((resolve) => {
        spawned.on('exit', (code, signal) => {
          resolve({ code, signal })
        })
      })
      const { code, signal } = await exitPromise
      const stdout = await stdoutPromise
      const stderr = await stderrPromise

      expect(code, 'exit code').to.equal(42)
      expect(signal, 'exit signal').to.equal('SIGHUP')
      expect(stdout, 'stdout contents').to.equal('test stdout output')
      expect(stderr, 'stderr contents').to.equal('test stderr output')
      expect(ls.called, 'mocked child called').to.equal(true)
    })
  })

  describe('done()', () => {
    it('throws if not called', () => {
      spawk.spawn('ls')
      expect(() => { spawk.done() }, 'done').to.throw(/Uncalled spawn interceptors found.*ls/)
    })

    it('does not throw if called', () => {
      spawk.spawn('ls')
      cp.spawn('ls')
      expect(spawk.done(), 'done').to.equal(true)
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

  describe('matching', () => {
    it('will not match the same spawn twice', () => {
      spawk.spawn('ls')
      cp.spawn('ls')
      expect(() => { cp.spawn('ls') }, 'spawn ls').to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will not match a different command', () => {
      spawk.spawn('ls')
      expect(() => { cp.spawn('ps') }, 'spawn ps').to.throw(/spawk: Unmatched spawn.*ps/)
    })

    it('will not match if args are missing', () => {
      spawk.spawn('ls', ['./'])
      expect(() => { cp.spawn('ls') }, 'spawn ls').to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will not match if args are different', () => {
      spawk.spawn('ls', ['./'])
      expect(() => { cp.spawn('ls', ['../']) }, 'spawn ls with different args').to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will match if no args are intercepted but args are passed', () => {
      spawk.spawn('ls', null, {})
      cp.spawn('ls', ['./'])
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('matching options', () => {
      spawk.spawn('ls', null, { test: 'option' })
      cp.spawn('ls', null, { test: 'option' })
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('extra options', () => {
      spawk.spawn('ls', null, { test: 'option' })
      cp.spawn('ls', null, { test: 'option', extra: 'option' })
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('mismatching options', () => {
      spawk.spawn('ls', null, { test: 'option' })
      expect(() => { cp.spawn('ls', null, { test: 'different' }) }, 'spawn ls with options').to.throw(/different/)
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
