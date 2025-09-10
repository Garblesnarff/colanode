// apps/server/src/app.ts
/**
 * @file Main application setup for the Colanode server.
 *
 * This file initializes and configures the Fastify server instance.
 * Responsibilities include:
 * - Setting up Fastify with necessary plugins (e.g., WebSocket, CORS, error handling).
 * - Registering API routes defined in `apps/server/src/api`.
 * - Configuring serializers and validators (using Zod for type-safe schemas).
 * - Starting the HTTP server and listening on the configured port and host.
 * - Handling basic server lifecycle events (startup, error handling).
 */
import fastifyWebsocket from '@fastify/websocket';
import { fastify } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { createDebugger } from '@colanode/core';
import { apiRoutes } from '@colanode/server/api';
import { clientDecorator } from '@colanode/server/api/client/plugins/client';
import { corsPlugin } from '@colanode/server/api/client/plugins/cors';
import { errorHandler } from '@colanode/server/api/client/plugins/error-handler';
import { config } from '@colanode/server/lib/config';

const debug = createDebugger('server:app');

export const initApp = () => {
  const server = fastify({
    bodyLimit: 10 * 1024 * 1024, // 10MB
    trustProxy: true,
  });

  server.register(errorHandler);

  server.setSerializerCompiler(serializerCompiler);
  server.setValidatorCompiler(validatorCompiler);

  server.register(corsPlugin);
  server.register(fastifyWebsocket);
  server.register(clientDecorator);
  server.register(apiRoutes);

  server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      debug(`Failed to start server: ${err}`);
      process.exit(1);
    }

    const path = config.server.pathPrefix ? `/${config.server.pathPrefix}` : '';
    debug(`Server is running at ${address}${path}`);
  });
};
