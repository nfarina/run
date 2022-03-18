import { Package } from "./Package.js";

main();

async function main() {
  let pack = await Package.findNearest(process.cwd());

  if (pack === null) {
    console.error(
      "Could not find a package.json containing scripts in this folder or any parent folders.",
    );
    process.exit(1);
  }

  // Slice off the first two arguments, which are the node executable and the
  // script name.
  const [, , ...args] = process.argv;

  // If this package is a workspace, check to see if your first argument is
  // the name of a package in the workspace. If so, use that package instead.
  if (pack.isWorkspace && args[0]) {
    const workspacePack = await pack.findWorkspacePackage(args[0]);
    if (workspacePack) {
      pack = workspacePack;
      args.shift();
    }
  }

  // Pick out the script name.
  const scriptName = args.shift();

  // If you didn't specify a script name, print out a list of available scripts.
  if (!scriptName) {
    pack.printAvailableScripts();
    process.exit(0);
  }

  // Run the script.
  const exitCode = await pack.runScript({ scriptName, args });

  process.exit(exitCode);
}
