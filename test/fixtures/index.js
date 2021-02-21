'use strict'

const Faker = require('faker')

module.exports = {
  command: () => Faker.random.word(),

  output: () => Faker.random.words(),

  exitCode: () => Faker.random.number({ min: 1, max: 255 }),

  signal: () => {
    const signals = require('./signals.json')
    return Faker.random.arrayElement(signals)
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
