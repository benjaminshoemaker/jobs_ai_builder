import path from "node:path";

export type StoragePaths = {
  dataDir: string;
  jobsDir: string;
  sourceListingsDir: string;
  sourcesDir: string;
  proposalsDir: string;
  sessionsDir: string;
  doNotMergeDir: string;
  exportsDir: string;
  eventsFile: string;
  configFile: string;
  scoringRulesFile: string;
};

export function createStoragePaths(dataDir: string): StoragePaths {
  return {
    dataDir,
    jobsDir: path.join(dataDir, "jobs"),
    sourceListingsDir: path.join(dataDir, "source-listings"),
    sourcesDir: path.join(dataDir, "sources"),
    proposalsDir: path.join(dataDir, "proposals"),
    sessionsDir: path.join(dataDir, "sessions"),
    doNotMergeDir: path.join(dataDir, "do-not-merge"),
    exportsDir: path.join(dataDir, "exports"),
    eventsFile: path.join(dataDir, "events.jsonl"),
    configFile: path.join(dataDir, "config.json"),
    scoringRulesFile: path.join(dataDir, "scoring-rules.json"),
  };
}
