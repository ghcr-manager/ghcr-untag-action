import { ghcrRegistryBaseUrl } from "./_config.js";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  runWithRetry
} from "./_http.js";
import type { UntagOptions } from "./_types.js";

export async function loadRegistryPushToken(
  owner: string,
  packageName: string,
  options: UntagOptions
): Promise<string> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const registryUrl = new URL(ghcrRegistryBaseUrl);
  const tokenUrl = new URL("/token", registryUrl);
  tokenUrl.searchParams.set("service", registryUrl.host);
  tokenUrl.searchParams.set("scope", `repository:${owner}/${packageName}:pull,push`);
  options.logger.debug(`Requesting GHCR push token for ${owner}/${packageName}`);

  let response;
  try {
    response = await runWithRetry("GHCR token request", options.logger, async () => {
      const tokenResponse = await fetchImpl(tokenUrl.toString(), {
        headers: {
          "User-Agent": "ghcr-untag-action",
          Authorization: `Basic ${Buffer.from(`${owner}:${options.token}`).toString("base64")}`
        }
      });
      if (!tokenResponse.ok && isRetryableStatus(tokenResponse.status)) {
        throw new Error(await buildHttpErrorMessage(tokenResponse, "GHCR token request failed"));
      }
      return tokenResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, "GHCR token request failed"), { cause: error });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, "GHCR token request failed"));
  }

  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new Error("GHCR token response did not include a token");
  }

  options.logger.debug(`Received GHCR push token for ${owner}/${packageName}`);
  return body.token;
}
