/* eslint-env node, mocha */
const { expect } = require('chai')

const spawk = require('../')

const { spawn, ChildProcess } = require('child_process')

describe('spawk', () => {
  beforeEach(() => {
    spawk.clean()
    spawk.preventUnmatched()
  })

  describe('unmatched', () => {
    it('throws helpful error on unmatched spawn', async () => {
      expect(() => { spawn('ls', ['-al'], { shell: true }) }).to.throw(/spawk: Unmatched spawn.*ls.*-al.*shell.*true/)
    })

    it('does not throw on unmatched spawn', async () => {
      spawk.allowUnmatched()
      const ls = spawn('ls')
      expect(ls).to.be.instanceof(ChildProcess)
    })
  })

  describe('interceptor', () => {
    it('requires a command', async () => {
      expect(() => { spawk.spawn() }).to.throw('You must specify the command to intercept')
    })

    it('intercepts a command with exitCode, stderr, and stdout', async () => {
      const ls = spawk.spawn('ls').exit(42).signal('SIGHUP').stdout('test stdout output').stderr('test stderr output')
      const spawned = spawn('ls')

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
        spawned.on('exit', async (code, signal) => {
          resolve({ code, signal })
        })
      })
      const { code, signal } = await exitPromise
      const stdout = await stdoutPromise
      const stderr = await stderrPromise

      expect(code).to.equal(42)
      expect(signal).to.equal('SIGHUP')
      expect(stdout).to.equal('test stdout output')
      expect(stderr).to.equal('test stderr output')
      expect(ls.called).to.equal(true)
    })
  })

  describe('done()', () => {
    it('throws if not called', () => {
      spawk.spawn('ls')
      expect(() => {
        spawk.done()
      }).to.throw(/Uncalled spawn interceptors found.*ls/)
    })

    it('does not throw if called', () => {
      spawk.spawn('ls')
      spawn('ls')
      expect(spawk.done()).to.equal(true)
    })
  })

  describe('description', () => {
    it('contains the command', () => {
      const interceptor = spawk.spawn('ls')
      expect(interceptor.description).to.have.string('ls')
    })

    it('contains the args', () => {
      const interceptor = spawk.spawn('ls', ['testarg', 'otherarg'])
      expect(interceptor.description).to.have.string('testarg')
      expect(interceptor.description).to.have.string('otherarg')
    })

    it('contains the options', () => {
      const interceptor = spawk.spawn('ls', null, { test: 'option' })
      expect(interceptor.description).to.have.string('test: \'option\'')
    })

    it('uncalled', () => {
      const interceptor = spawk.spawn('ls')
      expect(interceptor.description).to.have.string('uncalled')
    })

    it('called', () => {
      const interceptor = spawk.spawn('ls')
      spawn('ls')
      expect(interceptor.description).to.not.have.string('uncalled')
      expect(interceptor.description).to.have.string('called')
    })
  })

  describe('matching', () => {
    it('will not match the same spawn twice', () => {
      spawk.spawn('ls')
      spawn('ls')
      expect(() => { spawn('ls') }).to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will not match a different command', () => {
      spawk.spawn('ls')
      expect(() => { spawn('ps') }).to.throw(/spawk: Unmatched spawn.*ps/)
    })

    it('will not match if args are missing', () => {
      spawk.spawn('ls', ['./'])
      expect(() => { spawn('ls') }).to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will not match if args are different', () => {
      spawk.spawn('ls', ['./'])
      expect(() => { spawn('ls', ['../']) }).to.throw(/spawk: Unmatched spawn.*ls/)
    })

    it('will match if no args are intercepted but args are passed', () => {
      spawk.spawn('ls', null, {})
      spawn('ls', ['./'])
      expect(spawk.done()).to.equal(true)
    })
  })

  describe('stdio', () => {
    it('string: inherit', () => {
      spawk.spawn('ls')
      const spawned = spawn('ls', null, { stdio: 'inherit' })
      expect(spawned.stdin).to.equal(process.stdin)
      expect(spawned.stdout).to.equal(process.stdout)
      expect(spawned.stderr).to.equal(process.stderr)
    })

    it('array: inherit, pipe, pipe', () => {
      spawk.spawn('ls')
      const spawned = spawn('ls', null, { stdio: ['inherit', 'pipe', 'pipe'] })
      expect(spawned.stdin).to.equal(process.stdin)
      expect(spawned.stdout).to.not.equal(process.stdout)
      expect(spawned.stderr).to.not.equal(process.stderr)
    })
  })
})
