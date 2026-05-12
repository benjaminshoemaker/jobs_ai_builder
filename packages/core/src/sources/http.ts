export type HttpJsonFetcher = (url: string, init?: RequestInit) => Promise<unknown>;

export const defaultHttpJsonFetcher: HttpJsonFetcher = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} for ${url}`), {
      status: response.status,
    });
  }
  return response.json();
};

export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    return Number(error.status);
  }
  return undefined;
}
