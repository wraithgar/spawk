'use strict'

const Faker = require('faker')
const spawk = require('../../')
const { promisify } = require('util')
const promisifyTimeout = promisify(setTimeout)

const fixtures = {
  delay: (ms) => {
    return promisifyTimeout(ms)
  },

  spawk,

  command: () => Faker.random.word(),

  args: () => Faker.random.words().split(' '),

  error: () => {
    return new Error(Faker.random.words())
  },

  options: (needed = {}) => {
    const options = {}
    if (Faker.datatype.boolean() || needed.argv0 === true) {
      options.argv0 = fixtures.command()
    }
    if (Faker.datatype.boolean() || needed.serialization === true) {
      options.serialization = Faker.random.arrayElement(['json', 'advanced'])
    }
    if (Faker.datatype.boolean()) {
      options[Faker.random.arrayElement(['detached',
        'windowsVerbatimArguments', 'windowsHide'])] = Faker.datatype.boolean()
    }
    if (Faker.datatype.boolean()) {
      options[Faker.random.arrayElement(['uid', 'gid'])] = Faker.datatype.number()
    }

    // Because shell can be true there is no way to request a fixture that
    // explicitly has that as shell, just add it manually
    if (Faker.datatype.boolean() || needed.shell === true) {
      if (Faker.datatype.boolean()) {
        options.shell = Faker.datatype.boolean()
      } else {
        options.shell = fixtures.shell()
      }
    }
    if (Faker.datatype.boolean() || needed.stdio === true) {
      if (Faker.datatype.boolean()) {
        options.stdio = Faker.random.arrayElement(['pipe', 'overlapped', 'ignore', 'inherit'])
      } else {
        options.stdio = [null, null, null]
        for (let x = 0; x < 3; x++) {
          if (Faker.datatype.boolean()) {
            options.stdio[x] = Faker.random.arrayElement(['pipe', 'overlapped', 'ignore', 'ipc', 'inherit', Faker.datatype.number()])
          }
        }
      }
    }

    if (Faker.datatype.boolean() || needed.env) {
      options.env = {}
      const envs = Faker.datatype.number({ min: 1, max: 5 })
      options.env = Faker.random.words(envs).split(' ').reduce((options, option) => { options[option] = Faker.random.word(); return options }, {})
      if (typeof needed.env === 'object') {
        options.env = { ...options.env, ...needed.env }
      }
    }
    return options
  },

  output: () => Faker.random.words(),

  exitCode: () => Faker.datatype.number({ min: 1, max: 255 }),

  shell: () => Faker.random.arrayElement(['/bin/bash', '/bin/csh', '/bin/dash',
    '/bin/ksh', '/bin/sh', '/bin/tcsh', '/bin/zsh', '/usr/local/bin/fish',
    'cmd.exe', 'command.com']),

  signal: (notThisOne) => {
    const signals = require('./signals.json')
    let signal = notThisOne
    while (signal === notThisOne) {
      signal = Faker.random.arrayElement(signals)
    }
    return signal
  },

  closePromise: (spawned) => new Promise((resolve) => {
    spawned.on('close', resolve)
  }),

  disconnectPromise: (spawned) => new Promise((resolve) => {
    spawned.on('disconnect', resolve)
  }),

  errorPromise: (spawned) => new Promise((resolve) => {
    spawned.on('error', resolve)
  }),

  exitPromise: (spawned) => new Promise((resolve) => {
    spawned.on('exit', (code, signal) => {
      resolve({ code, signal })
    })
  }),

  spawnPromise: (spawned) => new Promise((resolve) => {
    spawned.on('spawn', resolve)
  }),

  stdoutPromise: (spawned) => new Promise((resolve) => {
    let output
    spawned.stdout.on('data', (data) => {
      output = output ? `${output}${data}` : data.toString()
    })
    spawned.stdout.on('close', () => {
      resolve(output)
    })
  }),

  stderrPromise: (spawned) => new Promise((resolve) => {
    let output
    spawned.stderr.on('data', (data) => {
      output = output ? `${output}${data}` : data.toString()
    })
    spawned.stderr.on('close', () => {
      resolve(output)
    })
  })
}
module.exports = fixtures
