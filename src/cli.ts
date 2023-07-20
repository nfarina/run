import { Package } from "./Package.js";

export async function cli() {
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
  let maybeSubpackage = args[0];

  if (pack.isWorkspace && maybeSubpackage) {
    // Did you type "workspace" itself to be explicit?
    const typedWorkspace = maybeSubpackage === "workspace";

    if (typedWorkspace) {
      args.shift();
      maybeSubpackage = args[0];

      if (!maybeSubpackage) {
        console.error(
          "You must specify a package name when using the workspace command.",
        );
        process.exit(1);
      }
    }

    const workspacePack = await pack.findWorkspacePackage(
      args[0],
      typedWorkspace,
    );
    if (workspacePack) {
      pack = workspacePack;
      args.shift();
    } else if (typedWorkspace) {
      console.error(
        `No package named "${maybeSubpackage}" found in workspace.`,
      );
      process.exit(1);
    }
  }

  // Pick out the script name.
  const scriptName = args.shift();

  // If you didn't specify a script name, print out a list of available scripts.
  if (!scriptName) {
    pack.printAvailableScripts();
    process.exit(0);
  }

  // Simply listening to SIGINT tells Node to not exit when you press Ctrl+C.
  // This is what we want; we expect the child process to exit, and then we
  // will exit naturally. Otherwise Node will kill us and your terminal may be
  // left in a weird state (that thing where you hit arrow keys and it types
  // gibberish).
  process.on("SIGINT", () => {});

  // Run the script.
  const exitCode = await pack.runScript({ scriptName, args });
  process.exit(exitCode);
}
