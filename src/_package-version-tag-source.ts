import { resolveFetch } from "./_http.js";
import { loadPackageVersionPage } from "./_package-version-page.js";
import type { TagSource, UntagOptions } from "./_types.js";

export async function listPackageVersionTagSources(
  owner: string,
  packageName: string,
  tags: string[],
  options: UntagOptions
): Promise<TagSource[]> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const requestedTags = [...new Set(tags)];
  if (requestedTags.length === 0) {
    return [];
  }

  const requestedTagSet = new Set(requestedTags);
  const matches = new Map<string, TagSource>();
  options.logger.debug(`Scanning package versions for ${owner}/${packageName} tag(s): ${requestedTags.join(", ")}`);

  for (let page = 1; ; page += 1) {
    const items = await loadPackageVersionPage(owner, packageName, page, options.token, options.logger, fetchImpl);
    if (items.length === 0) {
      options.logger.debug(`Package-version tag scan reached empty page ${page} for ${owner}/${packageName}`);
      break;
    }

    for (const item of items) {
      const itemTags = item.metadata?.container?.tags;
      if (!Array.isArray(itemTags) || typeof item.name !== "string") {
        continue;
      }

      for (const tag of itemTags) {
        if (!requestedTagSet.has(tag) || matches.has(tag)) {
          continue;
        }

        matches.set(tag, {
          tag,
          sourceVersionId: item.id,
          sourceDigest: item.name
        });
        options.logger.debug(
          `Matched tag ${owner}/${packageName}:${tag} on page ${page} at version ${item.id} (${item.name})`
        );
      }
    }

    if (matches.size === requestedTags.length || items.length < 100) {
      options.logger.debug(
        `Stopping package-version tag scan for ${owner}/${packageName} at page ${page}; matches=${matches.size}/${requestedTags.length}, items=${items.length}`
      );
      break;
    }
  }

  return requestedTags.flatMap((tag) => {
    const match = matches.get(tag);
    return match ? [match] : [];
  });
}

export async function listPresentPackageVersionIds(
  owner: string,
  packageName: string,
  versionIds: number[],
  options: UntagOptions
): Promise<number[]> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const requestedVersionIds = [...new Set(versionIds)];
  if (requestedVersionIds.length === 0) {
    return [];
  }

  const requestedVersionIdSet = new Set(requestedVersionIds);
  const matches = new Set<number>();
  options.logger.debug(
    `Scanning package versions for ${owner}/${packageName} version id(s): ${requestedVersionIds.join(", ")}`
  );

  for (let page = 1; ; page += 1) {
    const items = await loadPackageVersionPage(owner, packageName, page, options.token, options.logger, fetchImpl);
    if (items.length === 0) {
      options.logger.debug(`Package-version id scan reached empty page ${page} for ${owner}/${packageName}`);
      break;
    }

    for (const item of items) {
      if (requestedVersionIdSet.has(item.id)) {
        matches.add(item.id);
        options.logger.debug(`Matched version ${item.id} on page ${page} for ${owner}/${packageName}`);
      }
    }

    if (matches.size === requestedVersionIds.length || items.length < 100) {
      options.logger.debug(
        `Stopping package-version id scan for ${owner}/${packageName} at page ${page}; matches=${matches.size}/${requestedVersionIds.length}, items=${items.length}`
      );
      break;
    }
  }

  return requestedVersionIds.filter((versionId) => matches.has(versionId));
}
