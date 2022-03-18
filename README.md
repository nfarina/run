# Run

Run executes scripts in your `package.json` file much faster than `npm` or `yarn`, especially for projects using Yarn Workspaces. And with less typing.

# Speed

Here's an example on my medium-sized JS project with 22 workspace packages, running a script in my root package that just prints "hello world":

```sh
# NPM is reasonably fast, but doesn't support workspaces.
> time npm run hello
hello world
… 0.17s

# Yarn is bizarrely slow.
> time yarn run hello
hello world
… 0.63s

# Run supports workspaces and is twice as fast as NPM.
> time run hello
hello world
… 0.09s
```

Additionally, Yarn consumes 200MB of memory while your script is running, compared to 50MB for npm and Run. That's an extra 150MB just sitting around
doing nothing while your development server is running.

# Installing

```sh
~ > npm install --global fast-run
```

# Simplified Commands

Because Run is not concerned with other aspects of package management, it can interpret your command-line arguments with a lot of flexibility.

For instance, unlike Yarn, you don't have to add the `workspace` argument to run scripts in your workspace packages.

```sh
# Execute a script in the package root.
~/blog > yarn build

# Execute a script in a workspace package.
~/blog > yarn workspace node-server build

# Run, like Yarn, assumes you want a workspace root script unless you're in a subpackage folder.
~/blog > run build

# This is less typing…
~/blog > run node-server build

# And you can even type package substrings if the package names are awkward.
~/blog > run server build

# But you can still add "workspace" like Yarn to be explicit or to resolve ambiguity.
~/blog > run workspace serve build

# Or go into a package folder directly and run things there.
~/blog > cd packages/node-server
~/…/node-server > run build
```

# Show Available Commands

Like Yarn, you can easily get a list of available scripts:

```
~ > run

Available commands in package blog:

  dev    tsc --watch
  build  run node-server build
```

Or, for a list of scripts in a particular package:

```
~ > run node-server

Available commands in package node-server:

  test   jest
  build  webpack
```
