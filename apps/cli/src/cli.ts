import { Command } from "commander";

import { registerCommands } from "./commands/index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("jobs")
    .description("Find and review AI Builder job opportunities")
    .version("0.1.0")
    .exitOverride();

  registerCommands(program);

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}
