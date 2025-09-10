import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { sendMessage, getChatById } from '@colanode/server/lib/chats';

const sendMessageInputSchema = z.object({
  content: z.string().min(1).max(10000),
  contextNodeIds: z.array(z.string()).optional(),
  providerOverride: z.object({
    provider: z.enum(['openai', 'google', 'openrouter']),
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
});

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

const sendMessageOutputSchema = z.object({
  userMessage: messageOutputSchema,
  assistantMessage: messageOutputSchema.optional(),
});

export const chatMessageSendRoute: FastifyPluginCallbackZod = (
  instance,
  _,
  done
) => {
  instance.route({
    method: 'POST',
    url: '/messages',
    schema: {
      params: z.object({
        workspaceId: z.string(),
        chatId: z.string(),
      }),
      body: sendMessageInputSchema,
      response: {
        200: sendMessageOutputSchema,
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
        404: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId, chatId } = request.params;
      const { content, contextNodeIds, providerOverride } = request.body;

      // Verify chat exists and user has access
      const chat = await getChatById(chatId, workspaceId);
      if (!chat) {
        return reply.code(404).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Chat not found.',
        });
      }

      try {
        const result = await sendMessage({
          chatId,
          content,
          contextNodeIds,
          providerOverride,
          userId: request.user.id,
        });

        const formatMessage = (msg: typeof result.userMessage) => ({
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
        });

        return {
          userMessage: formatMessage(result.userMessage),
          assistantMessage: result.assistantMessage 
            ? formatMessage(result.assistantMessage)
            : undefined,
        };
      } catch (error) {
        console.error('Error sending message:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to send message.',
        });
      }
    },
  });

  done();
};