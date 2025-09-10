// packages/client/src/lib/ky.ts
/**
 * @file Utility functions for handling API errors specifically from HTTP requests made using the `ky` library.
 * It focuses on parsing `HTTPError` instances from `ky` into a standardized {@link ApiErrorOutput} format.
 */
import { HTTPError } from 'ky';

import { ApiErrorCode, ApiErrorOutput } from '@colanode/core/types'; // Ensure this path is correct for ApiErrorCode and ApiErrorOutput

/**
 * Parses an error object, specifically an `HTTPError` from the `ky` library,
 * into a standardized {@link ApiErrorOutput} object.
 *
 * If the error is an `HTTPError` and its response body can be parsed as JSON
 * containing `code` and `message` properties (matching `ApiErrorOutput`),
 * that parsed object is returned.
 *
 * If parsing the response body fails or if the body doesn't match the expected format,
 * it attempts to map common HTTP status codes (401, 403, 404, 400) to corresponding
 * {@link ApiErrorCode} values and generic messages.
 *
 * For any other types of errors or unhandled HTTP statuses, it returns a generic
 * "Unknown" error.
 *
 * @param error - The error object to parse. This is often caught in a try-catch block
 *                around a `ky` HTTP request.
 * @returns A promise that resolves to an {@link ApiErrorOutput} object representing the parsed error.
 *
 * @example
 * try {
 *   await ky.get(...);
 * } catch (err) {
 *   const apiError = await parseApiError(err);
 *   console.error(`API Error Code: ${apiError.code}, Message: ${apiError.message}`);
 * }
 */
export const parseApiError = async (
  error: unknown
): Promise<ApiErrorOutput> => {
  if (error instanceof HTTPError) {
    try {
      // Attempt to parse the response body as JSON.
      // The server is expected to return errors in the ApiErrorOutput format.
      const errorData = await error.response.json();
      // Check if the parsed data looks like our standard API error format.
      if (
        errorData &&
        typeof errorData.code === 'string' && // Check if code is a string (ApiErrorCode values are strings)
        Object.values(ApiErrorCode).includes(errorData.code as ApiErrorCode) && // Check if it's a valid ApiErrorCode
        typeof errorData.message === 'string'
      ) {
        return errorData as ApiErrorOutput;
      }
    } catch (jsonParseError) {
      // JSON parsing failed or response body was not in the expected format.
      // Fallback to interpreting common HTTP status codes.
      // console.warn('Failed to parse API error response body as JSON:', jsonParseError);
    }

    // If JSON parsing failed or the structure was wrong, use HTTP status code for a generic message.
    switch (error.response.status) {
      case 401:
        return {
          code: ApiErrorCode.Unauthorized,
          message: 'You are not authorized to perform this action.', // More user-friendly message
        };
      case 403:
        return {
          code: ApiErrorCode.Forbidden,
          message: 'You do not have permission to perform this action.', // More user-friendly
        };
      case 404:
        return {
          code: ApiErrorCode.NotFound,
          message: 'The requested resource was not found.', // More user-friendly
        };
      case 400:
        return {
          code: ApiErrorCode.BadRequest,
          message: 'The request was invalid or malformed.', // More user-friendly
        };
        // Consider adding more cases like 429 (TooManyRequests), 500 (InternalServerError), etc.
      default:
        // For other HTTP errors not specifically handled above.
        return {
            code: ApiErrorCode.Unknown, // Or a more specific HTTP error code if available
            message: `An HTTP error occurred: ${error.response.status} ${error.response.statusText}`,
        };
    }
  }

  // If the error is not an HTTPError instance, return a generic unknown error.
  console.error('Encountered a non-HTTPError:', error);
  return {
    code: ApiErrorCode.Unknown,
    message: 'An unexpected error occurred. Please try again.', // Generic user-friendly message
  };
};
