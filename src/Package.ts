import * as chalk from "chalk";
import { spawn } from "child_process";
import { readFile, stat } from "fs/promises";
import * as glob from "glob-promise";
import { dirname, join, resolve } from "path";

export class Package {
  public readonly path: string;
  public readonly dir: string;
  public readonly name: string;
  public readonly isWorkspace: boolean;
  public readonly scripts: Record<string, string>;

  /** If this Package belongs to a workspace, this is the workspace Package. */
  public readonly parent: Package | null;

  private packageJson: any;

  constructor(path: string, packageJson: any, parent?: Package) {
    this.path = path;
    this.dir = resolve(path);
    this.packageJson = packageJson;
    this.parent = parent ?? null;
    this.name = packageJson.name;
    this.isWorkspace = packageJson.workspaces !== undefined;
    this.scripts = packageJson.scripts ?? {};
  }

  public printAvailableScripts() {
    const { name, scripts } = this;

    console.log(`\nAvailable commands in package ${name}:\n`);

    // Pad out the keys so they're all the same length.
    const padding = Math.max(...Object.keys(scripts).map((key) => key.length));

    for (const [key, value] of Object.entries(scripts)) {
      console.log(`  ${chalk.bold(key.padEnd(padding))} ${chalk.grey(value)}`);
    }

    console.log();
  }

  public async runScript({
    scriptName,
    args,
  }: {
    scriptName: string;
    args: string[];
  }): Promise<number> {
    const { name, dir, scripts } = this;

    // Re-wrap the arguments in quotes in case there are any spaces.
    const wrappedArgs = args.map((a) => `"${a}"`).join(" ");

    const command = scripts[scriptName];

    if (command === undefined) {
      console.error(
        `No script named "${scriptName}" found in package "${name}".`,
      );
      this.printAvailableScripts();
      process.exit(1);
    }

    // console.log(`[${name}] Executing:`, command + " " + args);

    // Starting with `dir` and working our way up the directory tree, look for
    // `node_modules` folders in which we might find a `.bin` folder to add
    // to our working path for this command.
    let withPath = `export PATH=$PATH`;

    for (let path = dir; path.length > 1; path = dirname(path)) {
      const nodeModulesPath = join(path, "node_modules");
      const binPath = join(nodeModulesPath, ".bin");

      if (await directoryExists(binPath)) {
        withPath += `:${binPath}`;
      }
    }

    const cmdWithPath = `${withPath}; ${command} ${wrappedArgs}`;

    const child = spawn(cmdWithPath, [], {
      shell: true,
      stdio: "inherit",
      cwd: dir,
    });

    return new Promise((resolve) => {
      child.on("exit", (code) => {
        resolve(code ?? 0);
      });
    });
  }

  public static async fromPath(path: string): Promise<Package> {
    const jsonString = await readFile(path, "utf8");
    const json = JSON.parse(jsonString);
    return new Package(path, json);
  }

  public static async findNearest(path: string): Promise<Package | null> {
    let currentPath = path;
    while (currentPath !== "/") {
      const packageJsonPath = join(currentPath, "package.json");

      if (await fileExists(packageJsonPath)) {
        const packageJson = await readFile(packageJsonPath, "utf8");
        return new Package(currentPath, JSON.parse(packageJson));
      }

      currentPath = dirname(currentPath);
    }
    return null;
  }

  public async findWorkspacePackage(
    name: string,
    typedWorkspace?: boolean,
  ): Promise<Package | null> {
    if (!this.isWorkspace) {
      return null;
    }

    // Workspaces can use glob-style wildcards.
    let workspacePaths: string[] = [];

    const workspaces = this.packageJson.workspaces;
    const packages =
      workspaces && typeof workspaces === "object" && !Array.isArray(workspaces)
        ? workspaces.packages // To support: https://classic.yarnpkg.com/blog/2018/02/15/nohoist/
        : workspaces;

    for (const workspace of packages) {
      workspacePaths = workspacePaths.concat(await glob(workspace));
    }

    // Load the package.json for each workspace.
    const workspacePackages = await Promise.all(
      workspacePaths.map(async (workspacePath) => {
        const packageJsonPath = join(workspacePath, "package.json");
        const packageJson = await readFile(packageJsonPath, "utf8");
        return new Package(workspacePath, JSON.parse(packageJson), this);
      }),
    );

    // Find the package with the matching name.
    for (const workspacePackage of workspacePackages) {
      // Allow you to type a substring of the package name.
      if (workspacePackage.name.includes(name)) {
        // Before returning this package, check that the name you typed doesn't
        // conflict with a script in the workspace.
        if (this.scripts[name] !== undefined) {
          // If the script name matches the package name exactly, we can't
          // resolve the ambiguity.
          if (name === workspacePackage.name) {
            console.error(
              `The argument "${name}" could refer to either the package "${workspacePackage.name}" or the script "${name}" at the workspace root.`,
            );
            process.exit(1);
          } else if (!typedWorkspace) {
            // Otherwise, resolve the ambiguity by picking the workspace root
            // script. Unless you typed "workspace" to force a package to be
            // picked instead of a fallback root script.
            return null;
          }
        }

        return workspacePackage;
      }
    }

    return null;
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    const statResult = await stat(file, {});
    return statResult.isFile();
  } catch (e) {
    return false;
  }
}

async function directoryExists(file: string): Promise<boolean> {
  try {
    const statResult = await stat(file, {});
    return statResult.isDirectory();
  } catch (e) {
    return false;
  }
}
