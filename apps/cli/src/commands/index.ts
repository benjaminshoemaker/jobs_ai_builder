import type { Command } from "commander";
import { registerAddCommand } from "./add.js";
import { registerArchiveCommand } from "./archive.js";
import { registerConfigCommand } from "./config.js";
import { registerDedupeCommand } from "./dedupe.js";
import { registerDiscoverCommand } from "./discover.js";
import { registerExportCommand } from "./export.js";
import { registerListCommand } from "./list.js";
import { registerRefreshCommand } from "./refresh.js";
import { registerReviewCommand } from "./reviewMaybe.js";
import { registerSearchCommand } from "./search.js";
import { registerShowCommand } from "./show.js";
import { registerSourcesCommand } from "./sources.js";

type CommandDefinition = {
  name: string;
  description: string;
};

const commandDefinitions: CommandDefinition[] = [
  { name: "proposals", description: "Review proposed logic changes" },
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
  registerReviewCommand(program);
  registerDedupeCommand(program);
  registerRefreshCommand(program);
  registerExportCommand(program);

  for (const definition of commandDefinitions) {
    program
      .command(definition.name)
      .description(definition.description)
      .action(() => {
        console.log(`${definition.name.split(" ")[0]} is not implemented yet.`);
      });
  }
}
