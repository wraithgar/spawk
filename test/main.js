/* eslint-env node, mocha */
const { expect } = require('chai')

const spawk = require('../')

const { spawn, ChildProcess } = require('child_process')

describe('unmatched', () => {
  it('throws helpful error on unmatched spawn', async () => {
    spawk.clean()
    spawk.preventUnmatched()
    expect(() => { spawn('ls', ['-al'], { shell: true }) }).to.throw(/spawk: Unmatched spawn.*ls.*-al.*shell.*true/)
  })

  it('does not throw on unmatched spawn', async () => {
    spawk.clean()
    spawk.allowUnmatched()
    const ls = spawn('ls')
    expect(ls).to.be.instanceof(ChildProcess)
  })
})

describe('spawn mock', () => {
  beforeEach(() => {
    spawk.clean()
    spawk.preventUnmatched()
  })

  it('requires a command', async () => {
    expect(() => { spawk.spawn() }).to.throw('You must specify the command to mock')
  })

  it('mocks a command with exitCode, stderr, and stdout', async () => {
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

  it('throws on done() if not done', () => {
    spawk.spawn('ls')
    expect(() => {
      spawk.done()
    }).to.throw(/Uncalled spawn mocks found.*ls/)
  })

  it('does not throw on done() if done', () => {
    spawk.spawn('ls')
    spawn('ls')
    expect(spawk.done()).to.equal(true)
  })

  it('will not match the same spawn twice', () => {
    spawk.spawn('ls')
    spawn('ls')
    expect(() => { spawn('ls') }).to.throw(/spawk: Unmatched spawn.*ls/)
  })

  it('will not match a different command', () => {
    spawk.spawn('ls')
    expect(() => { spawn('ps') }).to.throw(/spawk: Unmatched spawn.*ps/)
  })
})
