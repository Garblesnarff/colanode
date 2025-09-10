// packages/core/src/lib/utils.ts
/**
 * @file Provides a collection of general-purpose utility functions.
 * These functions cover tasks such as string and date comparison, URL and email validation,
 * date formatting, type checking, and string manipulation.
 */

/**
 * Compares two optional strings for sorting.
 * Null or undefined values are considered smaller than defined strings.
 *
 * @param a The first string.
 * @param b The second string.
 * @returns 0 if a === b,
 *          -1 if a < b (or a is null/undefined and b is not),
 *          1 if a > b (or b is null/undefined and a is not).
 */
export const compareString = (a?: string | null, b?: string | null): number => {
  if (a === b) {
    return 0; // Handles cases where both are null/undefined or identical strings
  }
  if (a === undefined || a === null) {
    return -1; // a is considered smaller
  }
  if (b === undefined || b === null) {
    return 1; // b is considered smaller, so a is larger
  }
  // Both are defined strings
  if (a > b) {
    return 1;
  }
  return -1; // a < b
};

/**
 * Compares two optional dates (or date strings) for sorting.
 * Null or undefined values are considered earlier than defined dates.
 * Dates can be provided as Date objects or ISO 8601 strings.
 *
 * @param a The first date or date string.
 * @param b The second date or date string.
 * @returns A negative value if a < b, 0 if a === b, a positive value if a > b.
 *          Specifically, -1 if a is null/undefined and b is not, 1 if b is null/undefined and a is not.
 */
export const compareDate = (
  a?: Date | string | null,
  b?: Date | string | null
): number => {
  const aIsNull = a == null; // Using == null to catch both undefined and null
  const bIsNull = b == null;

  if (aIsNull && bIsNull) {
    return 0; // Both are null/undefined
  }
  if (aIsNull) {
    return -1; // a is considered earlier
  }
  if (bIsNull) {
    return 1; // b is considered earlier, so a is later
  }

  // Both are defined, convert to Date objects if they are strings
  const aDate = typeof a === 'string' ? new Date(a) : a;
  const bDate = typeof b === 'string' ? new Date(b) : b;

  // Check for invalid dates that might result from parsing bad strings
  if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) {
    return 0; // Both invalid, treat as equal
  }
  if (isNaN(aDate.getTime())) {
    return -1; // Invalid date a is smaller
  }
  if (isNaN(bDate.getTime())) {
    return 1; // Invalid date b is smaller
  }

  // Compare timestamps
  return aDate.getTime() - bDate.getTime();
};

/**
 * Checks if a given string is a valid URL.
 *
 * @param url The string to validate.
 * @returns `true` if the string is a valid URL, `false` otherwise.
 *
 * @example
 * isValidUrl("https://colanode.com"); // true
 * isValidUrl("not a url"); // false
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url); // Attempt to construct a URL object
    return true;
  } catch {
    return false; // Construction failed, so it's not a valid URL
  }
};

/**
 * Regular expression for validating email addresses based on RFC 5322 but with some practical simplifications.
 * @internal
 */
const emailRegex =
  /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

/**
 * Validates an email address string.
 * Checks for basic structure (local part @ domain part), length constraints,
 * and uses a regular expression for more detailed validation.
 *
 * @param email The email string to validate.
 * @returns `true` if the email is considered valid, `false` otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;

  const emailParts = email.split('@');
  if (emailParts.length !== 2) return false; // Must have one '@'

  const account = emailParts[0];
  const address = emailParts[1];

  if (!account || !address) return false; // Both parts must exist

  // Length checks based on RFC limits (local part <= 64, domain part <= 255)
  if (account.length > 64) return false;
  if (address.length > 255) return false;

  // Domain part labels (between dots) must be <= 63 characters
  const domainParts = address.split('.');
  if (domainParts.some((part) => part.length > 63 || part.length === 0)) return false; // Also check for empty parts

  return emailRegex.test(email); // Final check with regex
};

/**
 * Checks if two dates fall on the same calendar day (year, month, and day).
 *
 * @param date1 The first date or date string. Can be null or undefined.
 * @param date2 The second date or date string. Can be null or undefined.
 * @returns `true` if both dates are valid and fall on the same calendar day, `false` otherwise.
 */
export const isSameDay = (
  date1: Date | string | null | undefined,
  date2: Date | string | null | undefined
): boolean => {
  if (date1 == null || date2 == null) {
    return false; // One or both dates are null/undefined
  }

  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  // Check for invalid dates that might result from parsing bad strings
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Converts a given date (or date string) to a UTC Date object,
 * representing the start of that day in UTC (00:00:00.000Z).
 *
 * @param dateParam The date or date string to convert.
 * @returns A new `Date` object representing the start of the input day in UTC.
 *          Returns an invalid Date if `dateParam` is an invalid date string or results in an invalid Date.
 */
export const toUTCDate = (dateParam: Date | string): Date => {
  const date = typeof dateParam === 'string' ? new Date(dateParam) : dateParam;
  if (isNaN(date.getTime())) {
    return new Date(NaN); // Return an invalid date if input is invalid
  }
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
};

/**
 * Type guard to check if a value is an array of strings.
 *
 * @param value The value to check.
 * @returns `true` if the value is an array and all its elements are strings, `false` otherwise.
 */
export const isStringArray = (
  value: unknown | null | undefined
): value is string[] => {
  if (value == null) { // Catches undefined and null
    return false;
  }
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

/**
 * Formats a date (or date string) into a human-readable string like "Month Day, Year at HH:MM".
 *
 * @param dateParam The date or date string to format. If undefined or null, returns "N/A".
 * @returns A formatted date string, or "N/A" if the input is null/undefined or an invalid date.
 */
export const formatDate = (dateParam: Date | string | undefined | null): string => {
  if (dateParam == null) {
    return 'N/A';
  }

  const date = typeof dateParam === 'string' ? new Date(dateParam) : dateParam;

  if (isNaN(date.getTime())) {
    return 'N/A'; // Return "N/A" for invalid dates as well
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December',
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth(); // 0-11
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');

  const monthName = monthNames[monthIndex]; // monthIndex will be valid if date is valid

  return `${monthName} ${day}, ${year} at ${hour}:${minute}`;
};

/**
 * Converts a date (or date string) into a human-readable "time ago" string
 * (e.g., "5 minutes ago", "1 day ago", "Now").
 *
 * @param dateParam The date or date string to compare against the current time.
 *                  If null or undefined, or an invalid date, returns "N/A".
 * @returns A string representing the time elapsed since the given date, or "N/A".
 */
export const timeAgo = (dateParam: Date | string | null | undefined): string => {
  if (dateParam == null) {
    return 'N/A';
  }

  let date: Date;
  if (typeof dateParam === 'string') {
    date = new Date(dateParam);
  } else {
    date = dateParam;
  }

  if (isNaN(date.getTime())) {
    return 'N/A'; // Handle invalid dates
  }

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const month = day * 30; // Approximation: 30 days per month
  const year = day * 365; // Approximation: 365 days per year

  if (diff < 0) { // date is in the future
      return formatDate(date); // Or 'In the future', or specific future formatting
  }

  switch (true) {
    case diff < minute: {
      const seconds = Math.round(diff / 1000);
      return seconds < 5 ? 'Now' : `${seconds} seconds ago`;
    }
    case diff < hour: {
      const minutes = Math.round(diff / minute);
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    case diff < day: {
      const hours = Math.round(diff / hour);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    case diff < month: {
      const days = Math.round(diff / day);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    case diff < year: {
      const months = Math.round(diff / month);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    default: { // Catches diff >= year
      const years = Math.round(diff / year);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }
};

/**
 * Generates a simple hash code from a string.
 * This is a basic non-cryptographic hash function (similar to Java's String.hashCode).
 *
 * @param str The input string. Must not be null.
 * @returns A 32-bit integer hash code.
 */
export const hashCode = (str: string): number => {
  let hash = 0;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i);
    hash = (hash << 5) - hash + character; // Equivalent to hash * 31 + character
    hash |= 0; // Convert to 32bit integer (bitwise OR with 0)
  }
  return hash;
};

/**
 * Trims a string to a maximum length, appending "..." if truncation occurs.
 *
 * @param str The input string. Must not be null.
 * @param maxLength The maximum desired length of the output string (including "...").
 * @returns The original string if its length is less than or equal to `maxLength`,
 *          otherwise the truncated string appended with "...".
 *          If `maxLength` is less than 3, behavior might be suboptimal (e.g., just "..." or part of string).
 */
export const trimString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return str;
  }
  // Ensure maxLength is at least 3 to accommodate "..." gracefully
  if (maxLength < 3) {
    // For very small maxLength, return "..." if possible, or slice of original
    return maxLength > 0 ? str.slice(0, maxLength) + (maxLength < str.length ? '...' : '') : '...';
  }
  return str.slice(0, maxLength - 3) + '...';
};
