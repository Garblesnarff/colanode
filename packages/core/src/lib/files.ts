// packages/core/src/lib/files.ts
/**
 * @file Utility functions for working with files, including MIME type processing and byte formatting.
 */
import { FileSubtype } from '@colanode/core/types/files';

/**
 * Extracts a general file subtype from a given MIME type string.
 * This helps categorize files into common groups like 'image', 'video', 'audio', 'pdf', or 'other'.
 *
 * @param mimeType The full MIME type string (e.g., "image/png", "application/pdf").
 * @returns The determined {@link FileSubtype}. Defaults to 'other' if the MIME type
 *          doesn't match known categories.
 *
 * @example
 * const subtype = extractFileSubtype("image/jpeg"); // Returns "image"
 * const subtypeOther = extractFileSubtype("application/octet-stream"); // Returns "other"
 */
export const extractFileSubtype = (mimeType: string): FileSubtype => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  if (mimeType.startsWith('application/pdf')) {
    return 'pdf';
  }

  return 'other';
};

/**
 * Formats a number of bytes into a human-readable string with appropriate units (Bytes, KB, MB, GB, etc.).
 * Uses BigInt for calculations to support large file sizes.
 *
 * @param bytes The number of bytes to format. Can be a `number` or `bigint`.
 * @param decimals The number of decimal places to include in the formatted string. Defaults to 2.
 * @returns A human-readable string representing the file size (e.g., "1.23 MB").
 *          Returns "0 Bytes" if the input is 0.
 *
 * @example
 * formatBytes(1024); // "1.00 KB"
 * formatBytes(1234567, 2); // "1.18 MB"
 * formatBytes(BigInt(1234567890123), 3); // "1.123 TB"
 */
export const formatBytes = (
  bytes: number | bigint,
  decimals?: number
): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const bytesBigInt = BigInt(bytes);
  const k = BigInt(1024); // Base for conversion (1024 bytes in a kilobyte)
  const dm = decimals ?? 2; // Default decimal places
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  // Determine the appropriate size unit
  let i = 0;
  let reducedBytes = bytesBigInt;
  // Loop while reducedBytes is greater than or equal to k and we haven't reached the largest unit
  while (reducedBytes >= k && i < sizes.length - 1) {
    reducedBytes /= k; // Divide by k to move to the next larger unit
    i++; // Increment the unit index
  }

  // For precise decimal representation, especially after BigInt division:
  // Multiply by 10^dm, then divide by 10^dm as numbers.
  // This avoids floating point inaccuracies with very large numbers before this step.
  // Example: 1500 bytes, dm=2. reducedBytes = 1 (KB).
  // To get 1.46 KB (1500/1024):
  // (BigInt(1500) * BigInt(100) / BigInt(1024)) / 100 = (150000 / 1024) / 100 = 146 / 100 = 1.46
  // The current `reducedBytes` is already the integer part of the target unit.
  // We need the fractional part from the original `bytesBigInt`.
  // `value = Number(bytesBigInt * BigInt(Math.pow(10, dm)) / (k ** BigInt(i))) / Math.pow(10, dm)`
  // Simpler: Convert the already reducedBytes (integer part in target unit) and add fraction from original.
  // `bytesBigInt / (k**i)` would give a float if not for BigInt.
  // Let's use the original logic which seems to work by scaling up then down.
  const factor = Math.pow(10, dm); // Factor for decimal precision
  // Calculate the numerical value with desired decimal places.
  // This step converts the BigInt `reducedBytes` (which is the integer part in the target unit)
  // and adds the fractional part by scaling.
  // Consider bytes = 1500, k = 1024, i = 1 (KB), dm = 2. reducedBytes = 1n.
  // The original code `Number((reducedBytes * BigInt(factor)) / BigInt(factor))` is simply `Number(reducedBytes)`.
  // This seems like an error. It should be:
  // `Number(bytesBigInt * BigInt(factor) / (k ** BigInt(i))) / factor`
  // Let's correct the value calculation for proper decimal representation.
  // Original `value` calculation was: `Number((reducedBytes * BigInt(factor)) / BigInt(factor))`, which simplifies to `Number(reducedBytes)`.
  // This would lose the fractional part. For example, 1500 bytes would become 1.00 KB instead of 1.46 KB.
  // A correct way to get the value in the target unit with decimals:
  const valueInTargetUnit = Number(bytesBigInt * BigInt(factor) / (k ** BigInt(i))) / factor;


  return `${valueInTargetUnit.toFixed(dm)} ${sizes[i]}`;
};

/**
 * A mapping of common MIME types to human-readable names.
 * This helps in displaying user-friendly descriptions of file types.
 * @internal
 */
const mimeTypeNames: Record<string, string> = {
  // Microsoft Office
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word Document',
  'application/pdf': 'PDF Document',
  'application/vnd.ms-excel': 'Excel Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'Excel Spreadsheet',
  'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PowerPoint Presentation',
  // Archives
  'application/zip': 'ZIP Archive',
  'application/x-rar-compressed': 'RAR Archive',
  'application/x-tar': 'TAR Archive',
  'application/x-7z-compressed': '7z Archive',
  'application/x-rar': 'RAR Archive', // Alternative RAR MIME type
  'application/x-bzip': 'BZip Archive',
  'application/x-bzip2': 'BZip2 Archive',
  // Application/Scripting
  'application/javascript': 'JavaScript File', // Often text/javascript is preferred
  'application/json': 'JSON File',
  'application/xml': 'XML Document',
  'application/x-shockwave-flash': 'Flash Movie',
  'application/rtf': 'RTF Document',
  'application/octet-stream': 'Binary File', // Generic binary data
  'application/x-msdownload': 'Windows Executable',

  // Text types
  'text/plain': 'Text File',
  'text/html': 'HTML Document',
  'text/css': 'CSS File',
  'text/csv': 'CSV File',
  'text/javascript': 'JavaScript File', // Preferred for JavaScript by RFC 9239

  // Image types
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
  'image/tiff': 'TIFF Image',
  'image/svg+xml': 'SVG Image',
  'image/x-icon': 'Icon File', // Common for .ico files
  'image/bmp': 'Bitmap Image',
  'image/vnd.microsoft.icon': 'Icon File', // Official IANA for .ico

  // Audio types
  'audio/midi': 'MIDI Audio',
  'audio/mpeg': 'MP3 Audio', // Common for .mp3
  'audio/webm': 'WebM Audio',
  'audio/ogg': 'OGG Audio',
  'audio/wav': 'WAV Audio',
  'audio/aac': 'AAC Audio',
  'audio/mp4': 'MP4 Audio', // For audio-only MP4 files

  // Video types
  'video/x-msvideo': 'AVI Video',
  'video/mp4': 'MP4 Video',
  'video/mpeg': 'MPEG Video',
  'video/webm': 'WebM Video',
  'video/ogg': 'OGG Video', // Ogg container with Theora video or other
  'video/quicktime': 'QuickTime Video', // .mov
  'video/x-ms-wmv': 'WMV Video',
  'video/x-flv': 'FLV Video',
  'video/x-matroska': 'MKV Video',

  // Custom types or less common
  // Add any custom or less common file types as needed.
  // Example: 'application/vnd.colanode.custom-type': 'Colanode Custom File'
};

/**
 * Formats a MIME type string into a more human-readable file type description.
 * It uses the internal `mimeTypeNames` mapping. If a MIME type is not found
 * in the mapping, it defaults to "File".
 *
 * @param mimeType The MIME type string to format (e.g., "image/png").
 * @returns A human-readable string describing the file type (e.g., "PNG Image", "PDF Document").
 *          Returns "File" if the MIME type is not recognized.
 *
 * @example
 * formatMimeType("application/pdf"); // "PDF Document"
 * formatMimeType("image/jpeg"); // "JPEG Image"
 * formatMimeType("application/vnd.unknown-type"); // "File"
 */
export const formatMimeType = (mimeType: string): string => {
  return mimeTypeNames[mimeType] || 'File';
};
