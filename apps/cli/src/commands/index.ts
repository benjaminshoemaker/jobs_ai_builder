import type { Command } from "commander";
import { registerAddCommand } from "./add.js";
import { registerArchiveCommand } from "./archive.js";
import { registerConfigCommand } from "./config.js";
import { registerDiscoverCommand } from "./discover.js";
import { registerListCommand } from "./list.js";
import { registerSearchCommand } from "./search.js";
import { registerShowCommand } from "./show.js";
import { registerSourcesCommand } from "./sources.js";

type CommandDefinition = {
  name: string;
  description: string;
};

const commandDefinitions: CommandDefinition[] = [
  { name: "review", description: "Review an existing queue, such as maybe jobs" },
  { name: "proposals", description: "Review proposed logic changes" },
  { name: "dedupe", description: "Manage deduplication decisions" },
  { name: "refresh", description: "Refresh saved source listing status" },
  { name: "export", description: "Export curated metadata" },
];

export function registerCommands(program: Command): void {
  registerDiscoverCommand(program);
  registerAddCommand(program);
  registerSourcesCommand(program);
  registerConfigCommand(program);
  registerListCommand(program);
  registerShowCommand(program);
  registerSearchCommand(program);
  registerArchiveCommand(program);

  for (const definition of commandDefinitions) {
    program
      .command(definition.name)
      .description(definition.description)
      .action(() => {
        console.log(`${definition.name.split(" ")[0]} is not implemented yet.`);
      });
  }
}
