import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { getChatById } from '@colanode/server/lib/chats';

const chatOutputSchema = z.object({
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
});

export const chatGetRoute: FastifyPluginCallbackZod = (
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
        chatId: z.string(),
      }),
      response: {
        200: chatOutputSchema,
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
        404: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId, chatId } = request.params;

      try {
        const chat = await getChatById(chatId, workspaceId);
        
        if (!chat) {
          return reply.code(404).send({
            code: ApiErrorCode.InvalidInput,
            message: 'Chat not found.',
          });
        }

        return {
          id: chat.id,
          workspaceId: chat.workspaceId,
          name: chat.name,
          contextNodeIds: chat.contextNodeIds,
          providerConfig: chat.providerConfig,
          createdAt: chat.createdAt.toISOString(),
          createdBy: chat.createdBy,
          updatedAt: chat.updatedAt?.toISOString(),
          updatedBy: chat.updatedBy,
        };
      } catch (error) {
        console.error('Error getting chat:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to get chat.',
        });
      }
    },
  });

  done();
};