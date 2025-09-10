import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { createChat } from '@colanode/server/lib/chats';

const createChatInputSchema = z.object({
  name: z.string().optional(),
  contextNodeIds: z.array(z.string()).optional(),
  providerConfig: z.object({
    provider: z.enum(['openai', 'google', 'openrouter']),
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
});

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

export const chatCreateRoute: FastifyPluginCallbackZod = (
  instance,
  _,
  done
) => {
  instance.route({
    method: 'POST',
    url: '/',
    schema: {
      params: z.object({
        workspaceId: z.string(),
      }),
      body: createChatInputSchema,
      response: {
        200: chatOutputSchema,
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId } = request.params;
      const { name, contextNodeIds, providerConfig } = request.body;

      try {
        const chat = await createChat(
          {
            workspaceId,
            name,
            contextNodeIds,
            providerConfig,
          },
          request.user.id
        );

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
        console.error('Error creating chat:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to create chat.',
        });
      }
    },
  });

  done();
};