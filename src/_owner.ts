import { githubApiBaseUrl, githubApiVersion, requestRetryCount, requestRetryDelayMs } from "./_config.js";
import { buildHttpErrorMessage } from "./_http.js";
import type { FetchLike, Logger } from "./_types.js";

const _ownerUriComponentByOwner = new Map<string, string>();

export async function getOwnerUriComponent(
  fetchImpl: FetchLike,
  owner: string,
  token: string,
  logger: Logger
): Promise<string> {
  const cached = _ownerUriComponentByOwner.get(owner);
  if (cached) {
    logger.debug(`Using cached owner URI component for ${owner}: ${cached}`);
    return cached;
  }

  const url = new URL(`/users/${encodeURIComponent(owner)}`, githubApiBaseUrl).toString();
  logger.debug(`Resolving GitHub owner type for ${owner} via ${url}`);
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "ghcr-untag-action",
        "X-GitHub-Api-Version": githubApiVersion
      }
    });
    if (response.ok) {
      const payload = (await response.json()) as { type?: unknown };
      if (payload.type === "Organization") {
        const value = `orgs/${encodeURIComponent(owner)}`;
        _ownerUriComponentByOwner.set(owner, value);
        logger.debug(`Resolved GitHub owner ${owner} as organization`);
        return value;
      }
      if (payload.type === "User") {
        const value = `users/${encodeURIComponent(owner)}`;
        _ownerUriComponentByOwner.set(owner, value);
        logger.debug(`Resolved GitHub owner ${owner} as user`);
        return value;
      }
      throw new Error("GitHub owner lookup did not include a supported type");
    }

    if (!_isRetryableStatus(response.status) || attempt > requestRetryCount) {
      throw new Error(await buildHttpErrorMessage(response, "GitHub owner lookup failed"));
    }

    logger.warn(
      `GitHub owner lookup failed on attempt ${attempt}/${requestRetryCount + 1}; retrying in ${requestRetryDelayMs}ms - ${await buildHttpErrorMessage(response, "GitHub owner lookup failed")}`
    );
    await _sleep(requestRetryDelayMs);
  }
}

function _isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function _sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
