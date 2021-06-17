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

  options: (needed = {}) => {
    const options = {}
    if (Faker.random.boolean() || needed.argv0 === true) {
      options.argv0 = fixtures.command()
    }
    if (Faker.random.boolean() || needed.serialization === true) {
      options.serialization = Faker.random.arrayElement(['json', 'advanced'])
    }
    if (Faker.random.boolean()) {
      options[Faker.random.arrayElement(['detached',
        'windowsVerbatimArguments', 'windowsHide'])] = Faker.random.boolean()
    }
    if (Faker.random.boolean()) {
      options[Faker.random.arrayElement(['uid', 'gid'])] = Faker.random.number()
    }

    // Because shell can be true there is no way to request a fixture that
    // explicitly has that as shell, just add it manually
    if (Faker.random.boolean() || needed.shell === true) {
      if (Faker.random.boolean()) {
        options.shell = Faker.random.boolean()
      } else {
        options.shell = fixtures.shell()
      }
    }
    if (Faker.random.boolean() || needed.stdio === true) {
      if (Faker.random.boolean()) {
        options.stdio = Faker.random.arrayElement(['pipe', 'overlapped', 'ignore', 'inherit'])
      } else {
        options.stdio = [null, null, null]
        for (let x = 0; x < 3; x++) {
          if (Faker.random.boolean()) {
            options.stdio[x] = Faker.random.arrayElement(['pipe', 'overlapped', 'ignore', 'ipc', 'inherit', Faker.random.number()])
          }
        }
      }
    }

    if (Faker.random.boolean() || needed.env) {
      options.env = {}
      const envs = Faker.random.number({ min: 1, max: 5 })
      options.env = Faker.random.words(envs).split(' ').reduce((options, option) => { options[option] = Faker.random.word(); return options }, {})
      if (typeof needed.env === 'object') {
        options.env = { ...options.env, ...needed.env }
      }
    }
    return options
  },

  output: () => Faker.random.words(),

  exitCode: () => Faker.random.number({ min: 1, max: 255 }),

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

  exitPromise: (spawned) => new Promise((resolve) => {
    spawned.on('exit', (code, signal) => {
      resolve({ code, signal })
    })
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
