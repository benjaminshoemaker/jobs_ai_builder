import type { SourceRecord } from "../schemas/index.js";
import { LinkedInManualAdapter } from "./linkedinManualAdapter.js";
import { ManualAdapter } from "./manualAdapter.js";
import type { SourceAdapter } from "./types.js";

export class SourceRegistry {
  private readonly adapters: Map<SourceRecord["adapter"], SourceAdapter>;

  constructor(adapters: SourceAdapter[] = [new ManualAdapter(), new LinkedInManualAdapter()]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  }

  get(adapterId: SourceRecord["adapter"]): SourceAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  enabledSources(sources: SourceRecord[]): Array<{ source: SourceRecord; adapter: SourceAdapter }> {
    return sources.flatMap((source) => {
      if (!source.enabled) {
        return [];
      }

      const adapter = this.get(source.adapter);
      return adapter ? [{ source, adapter }] : [];
    });
  }
}

export function createDefaultSourceRegistry(): SourceRegistry {
  return new SourceRegistry();
}
