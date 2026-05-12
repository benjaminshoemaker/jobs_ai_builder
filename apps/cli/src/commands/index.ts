import type { Command } from "commander";
import { registerDiscoverCommand } from "./discover.js";

type CommandDefinition = {
  name: string;
  description: string;
};

const commandDefinitions: CommandDefinition[] = [
  { name: "add <url>", description: "Add a manually found job URL" },
  { name: "list", description: "List stored jobs" },
  { name: "review", description: "Review an existing queue, such as maybe jobs" },
  { name: "show <id>", description: "Show one saved job" },
  { name: "archive <id>", description: "Archive a saved job" },
  { name: "search <query>", description: "Search local job metadata" },
  { name: "proposals", description: "Review proposed logic changes" },
  { name: "sources", description: "Manage configured job sources" },
  { name: "config", description: "View or edit local configuration" },
  { name: "dedupe", description: "Manage deduplication decisions" },
  { name: "refresh", description: "Refresh saved source listing status" },
  { name: "export", description: "Export curated metadata" },
];

export function registerCommands(program: Command): void {
  registerDiscoverCommand(program);

  for (const definition of commandDefinitions) {
    program
      .command(definition.name)
      .description(definition.description)
      .action(() => {
        console.log(`${definition.name.split(" ")[0]} is not implemented yet.`);
      });
  }
}
