import { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod/v4';

import { ApiErrorCode, apiErrorOutputSchema } from '@colanode/core';
import { updateChatContext, getChatById } from '@colanode/server/lib/chats';

const updateContextInputSchema = z.object({
  contextNodeIds: z.array(z.string()),
});

export const chatUpdateContextRoute: FastifyPluginCallbackZod = (
  instance,
  _,
  done
) => {
  instance.route({
    method: 'PUT',
    url: '/context',
    schema: {
      params: z.object({
        workspaceId: z.string(),
        chatId: z.string(),
      }),
      body: updateContextInputSchema,
      response: {
        200: z.object({ success: z.boolean() }),
        400: apiErrorOutputSchema,
        403: apiErrorOutputSchema,
        404: apiErrorOutputSchema,
      },
    },
    handler: async (request, reply) => {
      const { workspaceId, chatId } = request.params;
      const { contextNodeIds } = request.body;

      // Verify chat exists and user has access
      const chat = await getChatById(chatId, workspaceId);
      if (!chat) {
        return reply.code(404).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Chat not found.',
        });
      }

      try {
        await updateChatContext(chatId, contextNodeIds, request.user.id);

        return { success: true };
      } catch (error) {
        console.error('Error updating chat context:', error);
        return reply.code(400).send({
          code: ApiErrorCode.InvalidInput,
          message: 'Failed to update chat context.',
        });
      }
    },
  });

  done();
};