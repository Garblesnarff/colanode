# Observed Codebase Patterns and Extension Templates

This document outlines common patterns observed in the Colanode codebase and provides basic templates for extending the system by adding new features like API routes, database tables, or UI components. This is intended to guide developers, including AI agents, in maintaining consistency.

## 1. Server API Endpoints

**Location:** `apps/server/src/api/`

**Observed Pattern:**

*   API routes are organized by resource under `apps/server/src/api/client/v1/<resource_name>/`.
*   Each resource directory typically contains:
    *   `schemas.ts`: Zod schemas for request (params, query, body) and response validation/serialization.
    *   `handlers.ts`: Fastify route handler functions implementing the business logic.
    *   `index.ts`: Fastify plugin definition that registers routes, applying schemas to handlers.
*   Uses `fastify-type-provider-zod` for type-safe route definitions.
*   A custom `clientDecorator` might be used to inject per-request services (like a database client scoped to the authenticated user) into handlers via `request.apiClient`.

**Template: Adding a New API Route Set (e.g., for "widgets")**

1.  **Create Schemas (`apps/server/src/api/client/v1/widgets/schemas.ts`):**
    ```typescript
    import { z } from 'zod/v4';

    // Schema for GET /widgets/:widgetId request parameters
    export const getWidgetParamsSchema = z.object({ widgetId: z.string() });

    // Schema for widget output (used in responses)
    export const widgetOutputSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    });
    export type WidgetOutput = z.infer<typeof widgetOutputSchema>;

    // Schema for POST /widgets request body
    export const createWidgetBodySchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    });
    export type CreateWidgetBody = z.infer<typeof createWidgetBodySchema>;
    ```

2.  **Create Handlers (`apps/server/src/api/client/v1/widgets/handlers.ts`):**
    ```typescript
    import { FastifyReply, FastifyRequest } from 'fastify';
    // Assuming you have types inferred from Zod schemas for type safety in handlers
    // For example, using `z.infer` if not using fastify-type-provider-zod for handler signatures directly.
    // However, with fastify-type-provider-zod, types are inferred in the route registration.

    // Example structure, actual implementation depends on your services
    export async function getWidgetHandler(
      request: FastifyRequest<{ Params: { widgetId: string } }>, // Type inference via provider
      reply: FastifyReply
    ) {
      // const apiClient = request.apiClient; // If using clientDecorator
      // const widget = await apiClient.widgets.getById(request.params.widgetId);
      // if (!widget) {
      //   return reply.status(404).send({ code: 'widget_not_found', message: 'Widget not found' });
      // }
      // return widget; // Automatically serialized by fastify-type-provider-zod
      reply.send({ id: request.params.widgetId, name: "Sample Widget" }); // Placeholder
    }

    export async function createWidgetHandler(
      request: FastifyRequest<{ Body: { name: string; description?: string } }>,
      reply: FastifyReply
    ) {
      // const apiClient = request.apiClient;
      // const newWidget = await apiClient.widgets.create(request.body);
      // return reply.status(201).send(newWidget);
      reply.status(201).send({ id: "newId", ...request.body }); // Placeholder
    }
    ```

3.  **Define Routes (`apps/server/src/api/client/v1/widgets/index.ts`):**
    ```typescript
    import { FastifyInstance } from 'fastify';
    import { ZodTypeProvider } from 'fastify-type-provider-zod';
    import * as schemas from './schemas';
    import * as handlers from './handlers';

    export default async function widgetRoutes(fastifyInstance: FastifyInstance) {
      const fastify = fastifyInstance.withTypeProvider<ZodTypeProvider>();

      fastify.get(
        '/', // Assuming prefix '/widgets' is added when registering this plugin
        { schema: { response: { 200: z.array(schemas.widgetOutputSchema) } } }, // Example for list
        async (request, reply) => { /* ... list handler ... */ }
      );

      fastify.get(
        '/:widgetId',
        {
          schema: {
            params: schemas.getWidgetParamsSchema,
            response: { 200: schemas.widgetOutputSchema /*, 404: errorSchema */ }
          }
        },
        handlers.getWidgetHandler
      );

      fastify.post(
        '/',
        {
          schema: {
            body: schemas.createWidgetBodySchema,
            response: { 201: schemas.widgetOutputSchema }
          }
        },
        handlers.createWidgetHandler
      );
    }
    ```

4.  **Register Plugin (e.g., in `apps/server/src/api/client/v1/index.ts`):**
    ```typescript
    // ... other imports
    import widgetRoutes from './widgets'; // Assuming widgets is a directory
    // ...
    export default async function v1Routes(fastify: FastifyInstance) {
      // ... other plugin registrations
      fastify.register(widgetRoutes, { prefix: '/widgets' });
    }
    ```

## 2. Client-Side Database Operations (Kysely)

**Location:** `packages/client/src/databases/`

**Observed Pattern:**

*   Kysely is the SQL query builder for client-side SQLite databases.
*   Each distinct database (e.g., `app`, `workspace`, `emojis`) has its own directory.
*   Inside each directory:
    *   `schema.ts`: Defines Kysely table interfaces and the overall database schema interface.
    *   `migrations/`: Contains individual migration files (timestamped or numbered) and an `index.ts` that exports a migration provider map.
*   `packages/client/src/lib/mappers.ts` contains functions to map Kysely's `Selectable` row types to application-specific domain types.
*   Services (e.g., `AppService`, `WorkspaceService`, or more specific data services) encapsulate database interaction logic using Kysely instances.

**Template: Adding a New Table to an Existing Client Database (e.g., Workspace Database)**

1.  **Update Schema (`packages/client/src/databases/workspace/schema.ts`):**
    *   Define the new Kysely table interface (e.g., `MyNewTable`).
    *   Export Kysely helper types (`SelectMyNewTable`, `CreateMyNewTable`, `UpdateMyNewTable`).
    *   Add the new table definition to the main database schema interface (e.g., `WorkspaceDatabaseSchema`).

    ```typescript
    // In packages/client/src/databases/workspace/schema.ts
    import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

    // ... other table interfaces ...

    export interface MyNewTable { // Renamed from interface MyNewTable for export
      id: ColumnType<string, string, never>; // PK, not updatable on insert
      property: ColumnType<string, string | undefined, string | undefined>; // Example: property can be omitted on insert/update
      created_at: ColumnType<string, string | undefined, never>; // Not updatable, optional on insert (defaulted by DB or app)
    }

    export type SelectMyNewTable = Selectable<MyNewTable>;
    export type CreateMyNewTable = Insertable<MyNewTable>;
    export type UpdateMyNewTable = Updateable<MyNewTable>;

    export interface WorkspaceDatabaseSchema {
      // ... existing tables ...
      my_new_table: MyNewTable; // Use snake_case for table names if that's the convention
    }
    ```

2.  **Create Migration File (e.g., `packages/client/src/databases/workspace/migrations/000XX-create-my-new-table.ts`):**
    *   Use an incremental number for the filename.
    *   Implement the `up` method to define `CREATE TABLE` SQL using Kysely's schema builder.
    *   Implement the `down` method to define `DROP TABLE` SQL.

    ```typescript
    import { Kysely, Migration } from 'kysely';

    export const createMyNewTableMigration: Migration = { // Ensure a unique name
      up: async (db: Kysely<any>) => {
        await db.schema
          .createTable('my_new_table') // Use snake_case for table name
          .addColumn('id', 'text', (col) => col.primaryKey().notNull())
          .addColumn('property', 'text')
          .addColumn('created_at', 'text', (col) => col.notNull().defaultTo('CURRENT_TIMESTAMP')) // Example default
          .execute();
      },
      down: async (db: Kysely<any>) => {
        await db.schema.dropTable('my_new_table').ifExists().execute();
      },
    };
    ```

3.  **Register Migration (`packages/client/src/databases/workspace/migrations/index.ts`):**
    *   Import your new migration object.
    *   Add it to the `workspaceDatabaseMigrations` record with a unique key (matching the filename without extension is a good convention).

    ```typescript
    // In packages/client/src/databases/workspace/migrations/index.ts
    // ... other migration imports
    import { createMyNewTableMigration } from './000XX-create-my-new-table';

    export const workspaceDatabaseMigrations: Record<string, Migration> = {
      // ... existing migrations
      '000XX-create-my-new-table': createMyNewTableMigration,
    };
    ```

4.  **Create Mapper (Optional, in `packages/client/src/lib/mappers.ts`):**
    If your application uses a domain type different from the `SelectMyNewTable` Kysely type:
    ```typescript
    // In packages/client/src/lib/mappers.ts
    import { SelectMyNewTable } from '../databases/workspace/schema'; // Adjust path as needed

    export type MyNewDomainType = {
      id: string;
      property: string | null; // Domain types might handle nullability differently
      createdAt: Date;
    };

    export const mapMyNewTable = (row: SelectMyNewTable): MyNewDomainType => {
      return {
        id: row.id,
        property: row.property ?? null, // Handle potential undefined from DB
        createdAt: new Date(row.created_at),
      };
    };
    ```

5.  **Utilize in Service Layer:**
    Access and manipulate the new table through the Kysely `db` instance in the appropriate service (e.g., `WorkspaceService` or a more specific service).

## 3. UI Components (shadcn/ui based)

**Location:** `packages/ui/`

**Observed Pattern:**

*   Components are primarily located in `packages/ui/src/components/`.
*   Likely follows conventions from `shadcn/ui`, which often involves:
    *   Using Radix UI primitives as a base.
    *   Styling with Tailwind CSS.
    *   A `cn` utility for conditional class names (e.g., from `clsx` and `tailwind-merge`).
    *   Components are often exported individually and might be composed to create more complex UI elements.
*   Contexts are in `packages/ui/src/contexts/`.
*   Hooks are in `packages/ui/src/hooks/`.
*   Editor-specific UI components are in `packages/ui/src/editor/`.

**Template: Adding a New UI Component (Illustrative)**

This example assumes a basic component structure. Refer to existing components in `packages/ui/src/components/` for more specific patterns used in Colanode.

1.  **Create Component File (e.g., `packages/ui/src/components/my-custom-button.tsx`):**
    ```tsx
    import * as React from 'react';
    import { Slot } from '@radix-ui/react-slot'; // Example if using Radix Slot for 'asChild' prop
    import { cva, type VariantProps } from 'class-variance-authority'; // For variant styles

    import { cn } from '@colanode/ui/lib/utils'; // Assuming shadcn `cn` utility

    // Define variants using class-variance-authority (cva)
    const buttonVariants = cva(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
      {
        variants: {
          variant: {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            // ... other variants
          },
          size: {
            default: 'h-10 py-2 px-4',
            sm: 'h-9 px-3 rounded-md',
            // ... other sizes
          },
        },
        defaultVariants: {
          variant: 'default',
          size: 'default',
        },
      }
    );

    export interface MyCustomButtonProps
      extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
      asChild?: boolean; // Common shadcn/ui prop
    }

    const MyCustomButton = React.forwardRef<HTMLButtonElement, MyCustomButtonProps>(
      ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
          <Comp
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
          />
        );
      }
    );
    MyCustomButton.displayName = 'MyCustomButton';

    export { MyCustomButton, buttonVariants };
    ```

2.  **Export (Optional Central Export):**
    While components can be imported directly by their path, you might add an export to `packages/ui/src/components/index.ts` or a relevant sub-index if desired for easier discovery or a flatter import structure.

3.  **Usage:**
    Import and use in `apps/web` or `apps/desktop` UI code.
    ```tsx
    import { MyCustomButton } from '@colanode/ui/components/my-custom-button'; // Or from a central export
    // ...
    // <MyCustomButton variant="destructive" size="sm">Delete</MyCustomButton>
    ```

## 4. General Utility Functions

**Location:** `packages/core/src/lib/` (for core, cross-cutting utilities) or `packages/client/src/lib/` (for client-specific utilities).

**Pattern:**

*   Group related utility functions into descriptively named files (e.g., `files.ts`, `dates.ts`, `permissions.ts`).
*   Ensure functions are pure where possible (no side effects, same input yields same output).
*   Write clear JSDoc comments for each function, explaining its purpose, parameters, return value, and any exceptions or important notes.
*   Export functions individually.
*   Re-export from the library's main `index.ts` using `@module` tags for discoverability.

**Template: Adding a New Utility Function**

```typescript
// In an appropriate file, e.g., packages/core/src/lib/string-utils.ts

/**
 * Capitalizes the first letter of a given string.
 * If the string is empty, null, or undefined, it returns an empty string.
 *
 * @param str - The string to capitalize.
 * @returns The capitalized string, or an empty string if input is invalid.
 *
 * @example
 * capitalizeFirstLetter("hello"); // "Hello"
 * capitalizeFirstLetter(""); // ""
 * capitalizeFirstLetter(null); // ""
 */
export const capitalizeFirstLetter = (str: string | null | undefined): string => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};
```
Then, re-export from `packages/core/src/lib/index.ts` if appropriate.

---

This document should be updated as patterns evolve or new standard ways of extending the system are established.
