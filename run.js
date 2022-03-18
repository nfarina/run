#!/usr/bin/env node

// This file needs to be separate from cli.js because cli.js is built
// from cli.ts and wouldn't have the executable flag set.

import { cli } from "./src/cli.js";

cli();
