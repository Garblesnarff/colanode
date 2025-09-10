// packages/core/src/lib/id.ts
/**
 * @file Utility functions and types for generating and managing unique, prefixed identifiers (IDs).
 * These IDs are based on ULID (Universally Unique Lexicographically Sortable Identifier)
 * and include a two-character suffix to denote the entity type.
 */
import { monotonicFactory } from 'ulid';

/**
 * A monotonic ULID factory instance.
 * `monotonicFactory` ensures that generated ULIDs are always increasing,
 * even if generated in rapid succession within the same millisecond.
 * @internal
 */
const ulid = monotonicFactory();

/**
 * Enumerates the two-character type prefixes used for different kinds of entities.
 * These prefixes are appended to a ULID to form a complete ID.
 */
export enum IdType {
  /** Account identifier prefix. */
  Account = 'ac',
  /** Workspace identifier prefix. */
  Workspace = 'wc',
  /** User identifier prefix. */
  User = 'us',
  /** Version identifier prefix (e.g., for data versions). */
  Version = 've',
  /** Mutation identifier prefix (e.g., for tracking changes). */
  Mutation = 'mu',
  /** Space identifier prefix (a logical grouping within a workspace). */
  Space = 'sp',
  /** Page (document) identifier prefix. */
  Page = 'pg',
  /** Channel (for chat) identifier prefix. */
  Channel = 'ch',
  /** Chat identifier prefix (a specific chat instance). */
  Chat = 'ct',
  /** Generic Node identifier prefix (base entity type). */
  Node = 'nd',
  /** Message identifier prefix (e.g., chat message). */
  Message = 'ms',
  /** Database identifier prefix. */
  Database = 'db',
  /** Database Replica identifier prefix. */
  DatabaseReplica = 'dr',
  /** Record (database entry) identifier prefix. */
  Record = 'rc',
  /** Folder identifier prefix. */
  Folder = 'fl',
  /** Database View identifier prefix. */
  DatabaseView = 'dv',
  /** Field (database column/property) identifier prefix. */
  Field = 'fd',
  /** Select Option (for dropdown fields) identifier prefix. */
  SelectOption = 'so',
  /** View Filter identifier prefix. */
  ViewFilter = 'vf',
  /** View Sort identifier prefix. */
  ViewSort = 'vs',
  /** Query identifier prefix (e.g., for saved queries or query instances). */
  Query = 'qu',
  /** Emoji identifier prefix. */
  Emoji = 'em',
  /** Emoji Skin Tone variant identifier prefix. */
  EmojiSkin = 'es',
  /** Avatar identifier prefix. */
  Avatar = 'av',
  /** Icon identifier prefix. */
  Icon = 'ic',
  /** File identifier prefix. */
  File = 'fi',
  /** Device identifier prefix (e.g., for user devices). */
  Device = 'de',
  /** Upload identifier prefix (e.g., for tracking file uploads). */
  Upload = 'up',
  /** Update identifier prefix (e.g., for CRDT updates or patches). */
  Update = 'ud',
  /** Event identifier prefix. */
  Event = 'ev',
  /** Host identifier prefix (e.g., for server instances). */
  Host = 'ht',
  /** Block (content block within a document) identifier prefix. */
  Block = 'bl',
  /** One-Time Password (OTP) Code identifier prefix. */
  OtpCode = 'ot',
  /** Mention identifier prefix (e.g., @user, #node). */
  Mention = 'me',
  /** Window identifier prefix (e.g., for UI windows). */
  Window = 'wi',
  /** Temporary File identifier prefix. */
  TempFile = 'tf',
  /** Socket/WebSocket connection identifier prefix. */
  Socket = 'sk',
}

/**
 * Generates a new unique ID with a specified type prefix.
 * The ID consists of a lowercase ULID followed by the two-character type prefix.
 * Example: `01h2x4g6z8k0d2c4j6s8q0a2w4ac` (for an Account)
 *
 * @param type The {@link IdType} prefix to append to the ULID.
 * @returns A string representing the newly generated prefixed ID.
 *
 * @example
 * const accountId = generateId(IdType.Account); // e.g., "01h2x4g6z8k0d2c4j6s8q0a2w4ac"
 * const pageId = generateId(IdType.Page);       // e.g., "01h2x4g6z8k0d2c4j6s8q0a2w4pg"
 */
export const generateId = (type: IdType): string => {
  // ULID is 26 characters. Appending a 2-character type makes it 28 characters.
  return ulid().toLowerCase() + type;
};

/**
 * Checks if a given ID string belongs to a specific {@link IdType}.
 * It verifies if the ID ends with the two-character prefix of the specified type.
 *
 * @param id The ID string to check.
 * @param type The {@link IdType} to check against.
 * @returns `true` if the ID ends with the type's prefix, `false` otherwise.
 *
 * @example
 * isIdOfType("01h2x4g6z8k0d2c4j6s8q0a2w4ac", IdType.Account); // true
 * isIdOfType("01h2x4g6z8k0d2c4j6s8q0a2w4pg", IdType.Account); // false
 * isIdOfType("invalidid", IdType.User);                      // false (also checks length implicitly)
 */
export const isIdOfType = (id: string, type: IdType): boolean => {
  // A valid ID should be at least ULID length (26) + type prefix length (2) = 28 characters.
  // However, endsWith is sufficient as it won't match if `type` is longer than `id`.
  return id.endsWith(type);
};

/**
 * Extracts the {@link IdType} prefix from a given ID string.
 * Assumes the ID string is valid and ends with a two-character type prefix.
 *
 * @param id The ID string from which to extract the type.
 * @returns The {@link IdType} corresponding to the ID's suffix.
 *          Casting to `IdType` assumes the suffix is a valid known type.
 *
 * @example
 * getIdType("01h2x4g6z8k0d2c4j6s8q0a2w4ac"); // IdType.Account (evaluates to "ac")
 * getIdType("01h2x4g6z8k0d2c4j6s8q0a2w4pg"); // IdType.Page (evaluates to "pg")
 *
 * @remarks
 * This function does not validate if the extracted substring is a _valid_ `IdType` member.
 * It relies on the caller to ensure the ID format is correct or to handle potential mismatches.
 * For more robust type checking, combine with `Object.values(IdType).includes(extractedSuffix)`.
 */
export const getIdType = (id: string): IdType => {
  // Extracts the last two characters, assuming they represent the IdType.
  return id.substring(id.length - 2) as IdType;
};
