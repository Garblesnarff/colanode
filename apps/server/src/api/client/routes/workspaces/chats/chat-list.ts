import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { listChatsInWorkspace } from '@colanode/server/lib/chats';

const chatListOutputSchema = z.object({
  chats: z.array(z.object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    contextNodeIds: z.array(z.string()),
    providerConfig: z.object({
      provider: z.string(),
      model: z.string(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      topP: z.number().optional(),
    }),
    createdAt: z.string(),
    createdBy: z.string(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
  })),
});

export const chatListRoute: FastifyPluginCallbackZod = (
  instance,
  _,
  done
) => {
  instance.route({
    method: 'GET',
    url: '/',
    schema: {
      params: z.object({
        workspaceId: z.string(),
      }),
      querystring: z.object({
        limit: z.coerce.number().min(1).max(100).default(50),
      }),
      response: {
        200: chatListOutputSchema,
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId } = request.params;
      const { limit } = request.query;

      try {
        const chats = await listChatsInWorkspace(
          workspaceId,
          request.user.id,
          limit
        );

        return {
          chats: chats.map(chat => ({
            id: chat.id,
            workspaceId: chat.workspaceId,
            name: chat.name,
            contextNodeIds: chat.contextNodeIds,
            providerConfig: chat.providerConfig,
            createdAt: chat.createdAt.toISOString(),
            createdBy: chat.createdBy,
            updatedAt: chat.updatedAt?.toISOString(),
            updatedBy: chat.updatedBy,
          })),
        };
      } catch (error) {
        console.error('Error listing chats:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to list chats.',
        });
      }
    },
  });

  done();
};