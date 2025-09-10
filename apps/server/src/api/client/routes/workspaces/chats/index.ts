import { FastifyPluginCallback } from 'fastify';

import { chatCreateRoute } from './chat-create';
import { chatGetRoute } from './chat-get';
import { chatListRoute } from './chat-list';
import { chatMessageSendRoute } from './chat-message-send';
import { chatMessagesGetRoute } from './chat-messages-get';
import { chatUpdateContextRoute } from './chat-update-context';

export const chatRoutes: FastifyPluginCallback = (instance, _, done) => {
  instance.register(chatCreateRoute);
  instance.register(chatListRoute);
  
  instance.register(
    (subInstance) => {
      subInstance.register(chatGetRoute);
      subInstance.register(chatUpdateContextRoute);
      subInstance.register(chatMessageSendRoute);
      subInstance.register(chatMessagesGetRoute);
    },
    {
      prefix: '/:chatId',
    }
  );

  done();
};