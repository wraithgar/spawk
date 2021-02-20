# spawk

node.js child_process.spawn mocking library

Spawk can be used to test modules that call spawn in isolation.

## Example

```js
const spawk = require('spawk')
spawk.spawn('ls').exit(1).stdout('custom response')

const child = require('child_process').spawn('ls')

```

`child` here will be a mocked ChildProcess object that will exit
with a status code of 1, and will receive the string `custom response`
on its stdout interface.

By default, any calls to `spawn` that do not match an existing mock will
pass through to the original `spawn`.  See `preventUnmatched` below for
more info on how to change this.

Each intercepted call will only be used once, so if you want to
intercept multiple calls to the same command you need to call
`spawk.spawn` for each call you want to be intercepted.  They will be
used in the order that they were created.

# API

## spawk

```sh
npm install spawk
```

```sh
const spawk = require('spawk')
```

### spawk.spawn(command, arguments, options)

Intercept and mock a call to `child_process.spawn`.

 - `command` - Command to intercept an mock
 - `arguments` - optional array containing arguments that must accompany
     the given `command` in order to be mocked.  The arguments must
     match exactly between the mocked call and what is passed to `spawn`
     in order for this mock to be used.
 - `options` - optional object containing options that you want to match
     with those passed into `spawn` in order for this intercept to be
     used.  Only the attributes you give are matched, others do not
     affect whether or not it matches.

Returns a `Interceptor` object, see below for more info.

When generating stdin/stdin/stdout streams for the interceptor, if
the call to `spawn` specifies `inherit` for their modes they will be
mapped to process.stdin etc.

### spawk.allowUnmatched()

Allow calls to `child_process.spawn` that do not match any interceptor
to pass through to node's implementation.  This is the default state.

### spawk.preventUnmatched()

Allow calls to `child_process.spawn` that do not match any interceptor
from passing through to node's implementation.  An unmatched call will
cause an exception to be thrown.

### spawk.done()

Ensure that all configured interceptors have been called.  If they have
this will return `true`.  If they have not this will throw an exception.

### spawk.clean()

Remove any currently configured interceptors.

### spawk.unload()

Unloads spawk from intercepting `child_process.spawn` calls completely.
This also removes any currently configured interceptors.

### spawk.load()

Loads spawk for intercepting `child_process.spawn` calls.  This is
called by default, you should only need to call this if you have
previously called `spawk.unload()` for some reason.


## Interceptor

```js
const interceptor = spawk.spawn('ls')
```

All of the following methods can be chained together.

By default a interceptor will exit with a code of `0` with no signal,
and nothing written to either `stdout` or `stderr`.

### interceptor.called

Boolean that denotes whether or not this interceptor has been called yet

### interceptor.description

Helpful description that describes the interceptor.

### interceptor.exit(code)

Tells the interceptor what status code to exit with. Defaults to `0`.

### interceptor.signal(signal)

Tells the interceptor what signal to exit with. The default is to exit
with no signal.

### interceptor.stdout(data)

Tells the interceptor what to write to stdout before exit.

### interceptor.stderr(data)

Tells the interceptor what to write to stderr before exit.
