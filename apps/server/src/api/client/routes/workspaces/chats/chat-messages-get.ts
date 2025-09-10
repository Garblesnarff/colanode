import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { getChatMessages, getChatById } from '@colanode/server/lib/chats';

const messageOutputSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  parentId: z.string().optional(),
  type: z.enum(['user', 'assistant']),
  content: z.string(),
  contextNodeIds: z.array(z.string()).optional(),
  citations: z.array(z.object({
    sourceId: z.string(),
    sourceType: z.enum(['document', 'node', 'record']),
    quote: z.string(),
    relevanceScore: z.number(),
  })).optional(),
  providerUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});

const messagesOutputSchema = z.object({
  messages: z.array(messageOutputSchema),
});

export const chatMessagesGetRoute: FastifyPluginCallbackZod = (
  instance,
  _,
  done
) => {
  instance.route({
    method: 'GET',
    url: '/messages',
    schema: {
      params: z.object({
        workspaceId: z.string(),
        chatId: z.string(),
      }),
      querystring: z.object({
        limit: z.coerce.number().min(1).max(100).default(50),
        before: z.string().optional(),
      }),
      response: {
        200: messagesOutputSchema,
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
        404: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId, chatId } = request.params;
      const { limit, before } = request.query;

      // Verify chat exists and user has access
      const chat = await getChatById(chatId, workspaceId);
      if (!chat) {
        return reply.code(404).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Chat not found.',
        });
      }

      try {
        const messages = await getChatMessages(chatId, limit, before);

        return {
          messages: messages.map(msg => ({
            id: msg.id,
            chatId: msg.chatId,
            parentId: msg.parentId,
            type: msg.type,
            content: msg.content,
            contextNodeIds: msg.contextNodeIds,
            citations: msg.citations,
            providerUsed: msg.providerUsed,
            modelUsed: msg.modelUsed,
            createdAt: msg.createdAt.toISOString(),
            createdBy: msg.createdBy,
          })),
        };
      } catch (error) {
        console.error('Error getting messages:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to get messages.',
        });
      }
    },
  });

  done();
};