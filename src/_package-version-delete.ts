import { githubApiBaseUrl, githubApiVersion } from "./_config.js";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  runWithRetry
} from "./_http.js";
import { getOwnerUriComponent } from "./_owner.js";
import type { UntagOptions } from "./_types.js";

export async function deletePackageVersion(
  owner: string,
  packageName: string,
  versionId: number,
  options: UntagOptions
): Promise<void> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const ownerUriComponent = await getOwnerUriComponent(fetchImpl, owner, options.token, options.logger);
  const url = new URL(
    `/${ownerUriComponent}/packages/container/${encodeURIComponent(packageName)}/versions/${versionId}`,
    githubApiBaseUrl
  ).toString();
  options.logger.debug(`Deleting package version ${owner}/${packageName}#${versionId}`);

  let response;
  try {
    response = await runWithRetry(
      `GitHub package delete request for version ${versionId}`,
      options.logger,
      async () => {
        const deleteResponse = await fetchImpl(url, {
          method: "DELETE",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${options.token}`,
            "User-Agent": "ghcr-untag-action",
            "X-GitHub-Api-Version": githubApiVersion
          }
        });
        if (!deleteResponse.ok && isRetryableStatus(deleteResponse.status)) {
          throw new Error(
            await buildHttpErrorMessage(deleteResponse, `GitHub package delete request failed for version ${versionId}`)
          );
        }
        return deleteResponse;
      }
    );
  } catch (error) {
    throw new Error(
      buildTransportErrorMessage(error, `GitHub package delete request failed for version ${versionId}`),
      {
        cause: error
      }
    );
  }

  if (!response.ok) {
    throw new Error(
      await buildHttpErrorMessage(response, `GitHub package delete request failed for version ${versionId}`)
    );
  }

  options.logger.debug(`Deleted package version ${owner}/${packageName}#${versionId}`);
}
