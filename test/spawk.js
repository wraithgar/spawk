/* eslint-env node, mocha */
'use strict'

const { expect } = require('chai')
const Fixtures = require('./fixtures')

const { spawk } = Fixtures

const cp = require('child_process')

describe('spawk', () => {
  beforeEach(() => {
    spawk.load()
    spawk.clean()
    spawk.preventUnmatched()
  })

  it('loads and unloads', () => {
    const command = Fixtures.command()
    expect(spawk.loaded, 'initial loaded state').to.equal(true)
    expect(() => { spawk.spawn(command) }, 'mocked command').to.not.throw()
    expect(() => { spawk.unload() }, 'unload').to.not.throw()
    expect(spawk.uncalled, 'uncalled mocks').to.equal(undefined)
    expect(() => { spawk.spawn(command) }, 'mocked command').to.throw(/unloaded/)
    expect(() => { spawk.unload() }, 'unload').to.not.throw()
    expect(() => { spawk.load() }, 'load').to.not.throw()
    expect(() => { spawk.spawn(command) }, 'mocked command').to.not.throw()
    expect(spawk.uncalled, 'spawk.uncalled').to.have.string(command)
  })

  it('requires a command', () => {
    expect(() => { spawk.spawn() }, 'spawk.spawn() with no arguments').to.throw('You must specify the command to intercept')
  })

  describe('done()', () => {
    it('throws if interceptor not called', () => {
      const command = Fixtures.command()
      spawk.spawn(command)
      expect(() => { spawk.done() }, 'done').to.throw(new RegExp(`Uncalled spawn interceptors found.*${command}`))
    })

    it('does not throw if interceptor called', () => {
      const command = Fixtures.command()
      spawk.spawn(command)
      cp.spawn(command)
      expect(spawk.done(), 'done').to.equal(true)
    })
  })

  describe('matching', () => {
    it('throws helpful error on unmatched spawn', () => {
      const command = Fixtures.command()
      expect(() => { cp.spawn(command, ['-al'], { shell: true }) }, 'mocked ls with parameters').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}.*-al.*shell.*true`))
    })

    it('does not throw on unmatched spawn', () => {
      spawk.allowUnmatched()
      const mock = cp.spawn('node', ['-v']) // node should be present on all systems we support
      expect(mock, 'mocked command').to.be.instanceof(cp.ChildProcess)
    })

    it('will not match the same spawn twice', () => {
      const command = Fixtures.command()
      spawk.spawn(command)
      cp.spawn(command)
      expect(() => { cp.spawn(command) }, 'spawn command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
    })

    it('will not match a different command', () => {
      const command = Fixtures.command()
      spawk.spawn(Fixtures.command())
      expect(() => { cp.spawn(command) }, 'spawn different command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
    })

    it('will not match if args are missing', () => {
      const command = Fixtures.command()
      const args = Fixtures.args()
      spawk.spawn(command, args)
      expect(() => { cp.spawn(command) }, 'spawn command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
    })

    it('will not match if args are different', () => {
      const command = Fixtures.command()
      const args = Fixtures.args()
      spawk.spawn(command, args)
      expect(() => { cp.spawn(command, Fixtures.args()) }, 'spawn command with different args').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
    })

    it('will match if no args are intercepted but args are passed', () => {
      const command = Fixtures.command()
      spawk.spawn(command, null)
      cp.spawn(command, Fixtures.args())
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('matching options', () => {
      const command = Fixtures.command()
      const options = Fixtures.options()
      spawk.spawn(command, null, options)
      cp.spawn(command, null, options)
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('extra options', () => {
      const command = Fixtures.command()
      const options = Fixtures.options()
      spawk.spawn(command, null, options)
      cp.spawn(command, null, { ...options, ...Fixtures.options() })
      expect(spawk.done(), 'done').to.equal(true)
    })

    it('mismatching option values', () => {
      const command = Fixtures.command()
      spawk.spawn(command, null, { test: 'option' })
      expect(() => { cp.spawn(command, null, { test: 'different' }) }, 'spawn command with options').to.throw(/different/)
    })
  })
})
