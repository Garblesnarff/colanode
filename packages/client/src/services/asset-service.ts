// packages/client/src/services/asset-service.ts
/**
 * @file Defines the `AssetService` class, responsible for providing access
 * to static asset databases, such as those for emojis and icons.
 * These databases are typically pre-populated and treated as read-only by the client.
 */
import { Kysely } from 'kysely';

import {
  EmojiDatabaseSchema,
  IconDatabaseSchema,
} from '@colanode/client/databases'; // Assuming this index exports the schema types
import { AppService } from '@colanode/client/services/app-service';
// No specific debugger for this simple service unless more complex logic is added.

/**
 * Provides access to read-only Kysely database instances for static assets
 * like emojis and icons. It initializes these database connections upon construction.
 */
export class AssetService {
  /** Reference to the main {@link AppService} to access shared services like `KyselyService` and `PathService`. */
  private readonly app: AppService; // Kept for context, though not directly used in current methods after constructor

  /** Read-only Kysely instance for the emojis database. */
  public readonly emojis: Kysely<EmojiDatabaseSchema>;
  /** Read-only Kysely instance for the icons database. */
  public readonly icons: Kysely<IconDatabaseSchema>;

  /**
   * Constructs an `AssetService`.
   * Initializes read-only Kysely database instances for emojis and icons
   * using paths provided by the `AppService`'s `PathService` and database
   * instances built by `KyselyService`.
   *
   * @param app - The main {@link AppService} instance.
   */
  constructor(app: AppService) {
    this.app = app; // Store app service if needed for future methods

    // Initialize a read-only Kysely instance for the emojis database.
    this.emojis = this.app.kysely.build<EmojiDatabaseSchema>({
      path: this.app.path.emojisDatabase, // Path to the emojis SQLite DB file
      readonly: true, // Open in read-only mode
    });

    // Initialize a read-only Kysely instance for the icons database.
    this.icons = this.app.kysely.build<IconDatabaseSchema>({
      path: this.app.path.iconsDatabase, // Path to the icons SQLite DB file
      readonly: true, // Open in read-only mode
    });
  }

  // Potential future methods could include:
  // - getEmojiById(id: string): Promise<SelectEmoji | undefined>
  // - searchIcons(query: string): Promise<SelectIcon[]>
  // - getIconSvg(id: string): Promise<Buffer | undefined>
  // These would encapsulate common queries against the asset databases.
}
