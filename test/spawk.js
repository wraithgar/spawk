/* eslint-env node, mocha */
'use strict'

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

  it('requires a command', () => {
    expect(() => { spawk.spawn() }, 'spawk.spawn() with no arguments').to.throw('You must specify the command to intercept')
  })

  describe('done()', () => {
    it('throws if interceptor not called', () => {
      spawk.spawn('ls')
      expect(() => { spawk.done() }, 'done').to.throw(/Uncalled spawn interceptors found.*ls/)
    })

    it('does not throw if interceptor called', () => {
      spawk.spawn('ls')
      cp.spawn('ls')
      expect(spawk.done(), 'done').to.equal(true)
    })
  })

  describe('matching', () => {
    it('throws helpful error on unmatched spawn', () => {
      expect(() => { cp.spawn('ls', ['-al'], { shell: true }) }, 'mocked ls with parameters').to.throw(/spawk: Unmatched spawn.*ls.*-al.*shell.*true/)
    })

    it('does not throw on unmatched spawn', () => {
      spawk.allowUnmatched()
      const ls = cp.spawn('ls')
      expect(ls, 'mocked ls').to.be.instanceof(cp.ChildProcess)
    })

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
})
