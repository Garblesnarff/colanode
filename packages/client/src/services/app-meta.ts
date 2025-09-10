// packages/client/src/services/app-meta.ts
/**
 * @file Defines the `AppMeta` interface, which represents metadata about the
 * current client application instance, such as its type (desktop or web) and platform.
 */

/**
 * Interface representing metadata about the current application instance.
 * This information is typically provided to services like `AppService` during
 * application startup to configure client-specific behavior or reporting.
 *
 * @property type - The type of the client application.
 *                  - `'desktop'`: Indicates the application is a desktop client (e.g., Electron).
 *                  - `'web'`: Indicates the application is a web client running in a browser.
 * @property platform - A string identifying the platform the application is running on.
 *                      For desktop apps, this could be values like 'windows', 'macos', 'linux'.
 *                      For web apps, this might be derived from the user agent (e.g., 'browser_chrome', 'browser_firefox')
 *                      or a more generic 'web'. The specific values depend on the reporting mechanism.
 */
export interface AppMeta {
  /** The type of the client application ('desktop' or 'web'). */
  type: 'desktop' | 'web';
  /**
   * String identifying the platform (e.g., 'windows', 'macos', 'linux' for desktop;
   * 'browser_chrome', 'browser_firefox', or simply 'web' for web clients).
   */
  platform: string;
}
