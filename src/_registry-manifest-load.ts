import { ghcrRegistryBaseUrl } from "./_config.js";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  resolveJsonContentType,
  runWithRetry
} from "./_http.js";
import type { LoadedRegistryManifest, Logger, UntagOptions } from "./_types.js";

const _ACCEPTED_MANIFEST_MEDIA_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.oci.artifact.manifest.v1+json"
].join(", ");

export async function loadRegistryManifestByDigest(
  owner: string,
  packageName: string,
  digest: string,
  registryToken: string,
  logger: Logger,
  options?: Pick<UntagOptions, "fetchImpl">
): Promise<LoadedRegistryManifest> {
  const document = await _loadRegistryManifestDocument(owner, packageName, digest, registryToken, logger, options);
  return {
    digest,
    mediaType: document.mediaType,
    rawJson: document.rawJson
  };
}

export async function loadRegistryManifestByTag(
  owner: string,
  packageName: string,
  tag: string,
  registryToken: string,
  logger: Logger,
  options?: Pick<UntagOptions, "fetchImpl">
): Promise<LoadedRegistryManifest> {
  const document = await _loadRegistryManifestDocument(owner, packageName, tag, registryToken, logger, options);
  const digest = document.response.headers.get("docker-content-digest");
  if (!digest) {
    throw new Error(`manifest response for ${tag} did not include a docker-content-digest header`);
  }

  return {
    digest,
    mediaType: document.mediaType,
    rawJson: document.rawJson
  };
}

async function _loadRegistryManifestDocument(
  owner: string,
  packageName: string,
  reference: string,
  registryToken: string,
  logger: Logger,
  options?: Pick<UntagOptions, "fetchImpl">
): Promise<{ mediaType: string; rawJson: string; response: ResponseLike }> {
  const fetchImpl = resolveFetch(options?.fetchImpl);
  const url = new URL(`/v2/${owner}/${packageName}/manifests/${reference}`, ghcrRegistryBaseUrl);

  let response;
  try {
    response = await runWithRetry(`GHCR manifest request for ${reference}`, logger, async () => {
      const manifestResponse = await fetchImpl(url.toString(), {
        headers: {
          Accept: _ACCEPTED_MANIFEST_MEDIA_TYPES,
          Authorization: `Bearer ${registryToken}`,
          "User-Agent": "ghcr-untag-action"
        }
      });
      if (!manifestResponse.ok && isRetryableStatus(manifestResponse.status)) {
        throw new Error(await buildHttpErrorMessage(manifestResponse, `GHCR manifest request for ${reference} failed`));
      }
      return manifestResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, `GHCR manifest request for ${reference} failed`), {
      cause: error
    });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, `GHCR manifest request for ${reference} failed`));
  }

  const document = (await response.json()) as { mediaType?: string };
  const mediaType = document.mediaType ?? resolveJsonContentType(response);
  if (!mediaType) {
    throw new Error(`manifest response for ${reference} did not include a media type`);
  }

  return {
    mediaType,
    rawJson: JSON.stringify(document),
    response
  };
}

interface ResponseLike {
  headers: Headers;
}
