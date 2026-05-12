import type {
  AppConfig,
  CandidateMetadata,
  SourceListingRecord,
  SourceRecord,
} from "../schemas/index.js";

export type SourceSignal = {
  adapter: SourceRecord["adapter"];
  reusable?: boolean;
  fetchPolicy?: "fetch" | "no_fetch";
  sourceUrl?: string;
};

export type SourceCandidate = {
  source: SourceRecord;
  sourceUrl: string;
  externalId?: string;
  metadata: CandidateMetadata;
  transientDescription?: string;
  fetchStatus?: SourceListingRecord["fetchStatus"];
  errorMessage?: string;
  sourceSignal?: SourceSignal;
};

export type FetchContext = {
  now: string;
  config: AppConfig;
  source: SourceRecord;
  limit: number;
  query?: string;
  manualMetadata?: CandidateMetadata;
  reusable?: boolean;
  env?: Record<string, string | undefined>;
};

export type SourceTestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  rateLimited?: boolean;
  sampleCount?: number;
  errorMessage?: string;
};

export type RefreshResult = {
  sourceListingId: string;
  status: SourceListingRecord["fetchStatus"];
  checkedAt: string;
  stillVisible: boolean;
  sourceUrl?: string;
  normalizedMetadata?: Partial<CandidateMetadata>;
  errorMessage?: string;
};

export interface SourceAdapter {
  id: SourceRecord["adapter"];
  fetchCandidates(ctx: FetchContext): Promise<SourceCandidate[]>;
  fetchByUrl?(url: string, ctx: FetchContext): Promise<SourceCandidate>;
  refreshListing?(
    listing: SourceListingRecord,
    ctx: FetchContext,
  ): Promise<RefreshResult>;
  testSource(source: SourceRecord): Promise<SourceTestResult>;
}
