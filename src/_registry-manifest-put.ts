import { createHash } from "node:crypto";
import { ghcrRegistryBaseUrl } from "./_config.js";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  runWithRetry
} from "./_http.js";
import type { Logger, UntagOptions } from "./_types.js";

export async function putRegistryManifestForTag(
  owner: string,
  packageName: string,
  tag: string,
  mediaType: string,
  manifestJson: string,
  registryToken: string,
  logger: Logger,
  options?: Pick<UntagOptions, "fetchImpl">
): Promise<string> {
  const fetchImpl = resolveFetch(options?.fetchImpl);
  const url = new URL(`/v2/${owner}/${packageName}/manifests/${encodeURIComponent(tag)}`, ghcrRegistryBaseUrl);
  logger.debug(`Publishing detached GHCR manifest for ${owner}/${packageName}:${tag} with media type ${mediaType}`);

  let response;
  try {
    response = await runWithRetry(`GHCR manifest put request for tag ${tag}`, logger, async () => {
      const putResponse = await fetchImpl(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${registryToken}`,
          "Content-Type": mediaType,
          "User-Agent": "ghcr-untag-action"
        },
        body: manifestJson
      });
      if (!putResponse.ok && isRetryableStatus(putResponse.status)) {
        throw new Error(await buildHttpErrorMessage(putResponse, `GHCR manifest put request for tag ${tag} failed`));
      }
      return putResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, `GHCR manifest put request for tag ${tag} failed`), {
      cause: error
    });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, `GHCR manifest put request for tag ${tag} failed`));
  }

  const digest = `sha256:${createHash("sha256").update(manifestJson).digest("hex")}`;
  logger.debug(`Published detached GHCR manifest for ${owner}/${packageName}:${tag} as ${digest}`);
  return digest;
}
