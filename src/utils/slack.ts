import { config } from "../config.js";
import { client, TimeIQError } from "../client.js";

// Cache for people list to avoid hitting /api/people on every single validation
let peopleCache: any[] | null = null;
let lastPeopleFetch = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * Fetches all people from TimeIQ with a local cache.
 */
async function getCachedPeople(): Promise<any[]> {
  const now = Date.now();
  if (!peopleCache || (now - lastPeopleFetch > CACHE_TTL)) {
    try {
      const res = await client.get<any>("/api/people");
      peopleCache = res && Array.isArray(res.people) ? res.people : [];
      lastPeopleFetch = now;
    } catch (err: any) {
      throw new TimeIQError(`Failed to fetch coworker directory for validation: ${err.message}`, 500);
    }
  }
  return peopleCache || [];
}

/**
 * Resolves a TimeIQ user profile from an optional Slack ID.
 * If TIMEIQ_SLACK_MAP is not set, returns null (inactive state).
 * Otherwise, requires requesting_slack_id and verifies it maps to a valid coworker email.
 */
export async function resolveSlackUser(requesting_slack_id?: string): Promise<any | null> {
  if (!config.TIMEIQ_SLACK_MAP) {
    return null; // Mapping not active, standard behavior
  }

  if (!requesting_slack_id) {
    throw new TimeIQError("Security Policy Violation: 'requesting_slack_id' must be provided for this operation.", 400);
  }

  let map: Record<string, string>;
  try {
    map = JSON.parse(config.TIMEIQ_SLACK_MAP);
  } catch (err) {
    throw new TimeIQError("System Configuration Error: TIMEIQ_SLACK_MAP environment variable is not valid JSON.", 500);
  }

  const mappedValue = map[requesting_slack_id];
  if (!mappedValue) {
    throw new TimeIQError(`Security Policy Violation: Slack ID '${requesting_slack_id}' is not mapped to any TimeIQ account.`, 403);
  }

  const people = await getCachedPeople();
  const searchVal = mappedValue.toLowerCase().trim();
  const person = people.find((p) => {
    const pEmail = p.email ? p.email.toLowerCase().trim() : "";
    const pUsername = p.username ? p.username.toLowerCase().trim() : "";
    const pSlug = p.slug ? p.slug.toLowerCase().trim() : "";
    const pId = p.id ? String(p.id) : "";

    return pEmail === searchVal || pUsername === searchVal || pSlug === searchVal || pId === searchVal;
  });

  if (!person) {
    throw new TimeIQError(`Security Policy Violation: Mapped email, username, slug, or ID '${mappedValue}' not found in the TimeIQ directory.`, 404);
  }

  return person;
}

/**
 * Verifies that the entry's owner matches the resolved person's ID.
 * Throws a 403 Forbidden error if there is a mismatch.
 */
export function enforceUserOwnership(resolvedPerson: any | null, entryPersonId: number | string): void {
  if (!resolvedPerson) return; // Standard behavior, inactive

  const resolvedId = Number(resolvedPerson.id);
  const entryId = Number(entryPersonId);

  if (resolvedId !== entryId) {
    throw new TimeIQError(`Security Policy Violation: Access denied. You do not have permission to modify or access entries belonging to person ID ${entryPersonId}.`, 403);
  }
}

/**
 * Resets the coworker directory cache (used strictly for test isolation).
 */
export function _resetSlackCache(): void {
  peopleCache = null;
  lastPeopleFetch = 0;
}
