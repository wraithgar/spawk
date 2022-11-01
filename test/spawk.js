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
    spawk.spawn(command)
    spawk.unload()
    expect(spawk.uncalled, 'uncalled mocks').to.equal(undefined)
    expect(() => { spawk.spawn(command) }, 'mocked command').to.throw(/unloaded/)
    spawk.unload()
    spawk.load()
    spawk.spawn(command)
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

    describe('command', () => {
      it('matching string', () => {
        const command = Fixtures.command()
        spawk.spawn(command)
        cp.spawn(command)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('different string', () => {
        const command = Fixtures.command()
        spawk.spawn(command)
        expect(() => { cp.spawn(`different-${command}`) }, 'spawn different command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })

      it('matching regex', () => {
        const command = Fixtures.command()
        const regex = new RegExp(command)
        spawk.spawn(regex)
        cp.spawn(command)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('non-matching regex', () => {
        const command = Fixtures.command()
        const regex = new RegExp(`original-${command}`)
        spawk.spawn(regex)
        expect(() => { cp.spawn(`different-${command}`) }, 'spawn different command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })

      it('matching function', () => {
        const command = Fixtures.command()
        const args = Fixtures.args()
        const options = Fixtures.options()
        let spawnArgs
        let calledContext
        const mock = spawk.spawn(function () {
          spawnArgs = arguments
          calledContext = this
          return true
        })
        cp.spawn(command, args, options)
        expect(spawnArgs[0], 'first parameter passed to function').to.equal(command)
        expect(spawnArgs[1], 'second parameter passed to function').to.equal(args)
        expect(spawnArgs[2], 'third parameter passed to function').to.equal(options)
        expect(spawk.done(), 'done').to.equal(true)
        expect(calledContext).to.equal(mock)
      })

      it('non-matching function', () => {
        const command = Fixtures.command()
        spawk.spawn(() => false)
        expect(() => { cp.spawn(command) }, 'spawn command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })
    })

    describe('args', () => {
      it('matching', () => {
        const command = Fixtures.command()
        const args = Fixtures.args()
        spawk.spawn(command, args)
        cp.spawn(command, args)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('missing', () => {
        const command = Fixtures.command()
        const args = Fixtures.args()
        spawk.spawn(command, args)
        expect(() => { cp.spawn(command) }, 'spawn command with no args').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })

      it('different', () => {
        const command = Fixtures.command()
        const args = Fixtures.args()
        spawk.spawn(command, args)
        expect(() => { cp.spawn(command, Fixtures.args()) }, 'spawn command with different args').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })

      it('added', () => {
        const command = Fixtures.command()
        spawk.spawn(command, null)
        cp.spawn(command, Fixtures.args())
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('matching function', () => {
        const command = Fixtures.command()
        const args = Fixtures.args()
        let spawnArgs
        let calledContext

        const mock = spawk.spawn(command, function () {
          spawnArgs = arguments
          calledContext = this
          return true
        })
        cp.spawn(command, args)
        expect(spawnArgs[0], 'first parameter passed to function').to.equal(args)
        expect(spawk.done(), 'done').to.equal(true)
        expect(calledContext).to.equal(mock)
      })

      it('non-matching function', () => {
        const command = Fixtures.command()
        spawk.spawn(command, () => false)
        expect(() => { cp.spawn(command) }, 'spawn command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })
    })

    describe('options', () => {
      it('matching', () => {
        const command = Fixtures.command()
        const options = Fixtures.options()
        spawk.spawn(command, null, options)
        cp.spawn(command, null, options)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('matching shell', () => {
        const command = Fixtures.command()
        const options = Fixtures.options({ shell: true })
        spawk.spawn(command, null, options)
        cp.spawn(command, null, options)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('different shell', () => {
        const command = Fixtures.command()
        const options = Fixtures.options({ shell: true })
        spawk.spawn(command, null, options)
        expect(() => { cp.spawn(command, null, { ...options, shell: `/prefix${options.shell}` }) }, 'spawn command with options').to.throw(/prefix/)
      })

      it('missing', () => {
        const command = Fixtures.command()
        const options = Fixtures.options()
        spawk.spawn(command, [], options)
        expect(() => { cp.spawn(command) }, 'spawn command with no options').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })

      it('different stdio', () => {
        const command = Fixtures.command()
        spawk.spawn(command, null, { stdio: 'inherit' })
        expect(() => { cp.spawn(command, null, { stdio: 'pipe' }) }, 'spawn command with options').to.throw(/pipe/)
      })

      it('extra shell', () => {
        const command = Fixtures.command()
        const options = Fixtures.options()
        delete options.shell
        spawk.spawn(command, null, options)
        cp.spawn(command, null, { ...options, shell: Fixtures.shell() })
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('matching function', () => {
        const command = Fixtures.command()
        const options = Fixtures.options()
        let spawnArgs
        let calledContext

        const mock = spawk.spawn(command, null, function () {
          spawnArgs = arguments
          calledContext = this
          return true
        })
        cp.spawn(command, null, options)
        expect(spawnArgs[0], 'first parameter passed to function').to.equal(options)
        expect(spawk.done(), 'done').to.equal(true)
        expect(calledContext).to.equal(mock)
      })

      it('non-matching function', () => {
        const command = Fixtures.command()
        spawk.spawn(command, null, () => false)
        expect(() => { cp.spawn(command) }, 'spawn command').to.throw(new RegExp(`spawk: Unmatched spawn.*${command}`))
      })
    })

    describe('env', () => {
      it('matching', () => {
        const command = Fixtures.command()
        const options = Fixtures.options({ env: true })
        spawk.spawn(command, null, options)
        cp.spawn(command, null, options)
        expect(spawk.done(), 'done').to.equal(true)
      })

      it('different', () => {
        const command = Fixtures.command()
        const options = Fixtures.options({ env: { testEnv: true } })
        spawk.spawn(command, null, options)
        expect(() => { cp.spawn(command, null, { ...options, env: { ...options.env, testEnv: false } }) }, 'spawn command with options').to.throw(/testEnv/)
      })

      it('missing', () => {
        const command = Fixtures.command()
        const options = Fixtures.options({ env: true })
        const missingOptions = { ...options }
        delete missingOptions.env
        spawk.spawn(command, null, options)
        expect(() => { cp.spawn(command, null, missingOptions) }, 'spawn command with options').to.throw(/Unmatched/)
      })

      it('extra', () => {
        const command = Fixtures.command()
        const options = Fixtures.options()
        const env = options.env
        delete options.env
        spawk.spawn(command, null, options)
        cp.spawn(command, null, { ...options, env })
        expect(spawk.done(), 'done').to.equal(true)
      })
    })
  })
})
