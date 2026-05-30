import { githubApiBaseUrl, githubApiVersion } from "./_config.js";
import { buildHttpErrorMessage, buildTransportErrorMessage, isRetryableStatus, runWithRetry } from "./_http.js";
import { getOwnerUriComponent } from "./_owner.js";
import type { FetchLike, Logger, PackageVersionPageItem } from "./_types.js";

export async function loadPackageVersionPage(
  owner: string,
  packageName: string,
  page: number,
  token: string,
  logger: Logger,
  fetchImpl: FetchLike
): Promise<PackageVersionPageItem[]> {
  const ownerUriComponent = await getOwnerUriComponent(fetchImpl, owner, token, logger);
  const url = new URL(
    `/${ownerUriComponent}/packages/container/${encodeURIComponent(packageName)}/versions`,
    githubApiBaseUrl
  );
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));
  const requestLabel = `GitHub Packages request for page ${page} (${url.toString()})`;
  logger.debug(`Loading package-version page ${page} for ${owner}/${packageName}`);

  let response;
  try {
    response = await runWithRetry(requestLabel, logger, async () => {
      const pageResponse = await fetchImpl(url.toString(), {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "ghcr-untag-action",
          "X-GitHub-Api-Version": githubApiVersion
        }
      });
      if (!pageResponse.ok && isRetryableStatus(pageResponse.status)) {
        throw new Error(await buildHttpErrorMessage(pageResponse, `${requestLabel} failed`));
      }
      return pageResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, `${requestLabel} failed`), {
      cause: error
    });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, `${requestLabel} failed`));
  }

  const items = (await response.json()) as PackageVersionPageItem[];
  logger.debug(`Loaded package-version page ${page} for ${owner}/${packageName} with ${items.length} item(s)`);
  return items;
}
