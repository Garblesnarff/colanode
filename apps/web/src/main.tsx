// apps/web/src/main.tsx
/**
 * @file Entry point for the Colanode web application.
 *
 * This file is responsible for:
 * - Initializing the React application.
 * - Setting up the main communication bridge with the dedicated web worker (`DedicatedWorker`).
 *   It uses Comlink to expose worker functionalities to the main thread.
 * - Checking for browser compatibility (e.g., OPFS support).
 * - Rendering the root React component (`Root`) or a compatibility notice.
 * - Exposing client-side API functions (e.g., `executeMutation`, `executeQuery`) globally
 *   on the `window.colanode` object, which internally delegate to the web worker.
 * - Subscribing to events from the worker and publishing them to a local event bus.
 */
import * as Comlink from 'comlink';
import { createRoot } from 'react-dom/client';

import { eventBus } from '@colanode/client/lib';
import { BrowserNotSupported } from '@colanode/web/components/browser-not-supported';
import { ColanodeWorkerApi } from '@colanode/web/lib/types';
import { isOpfsSupported } from '@colanode/web/lib/utils';
import { Root } from '@colanode/web/root';
import DedicatedWorker from '@colanode/web/workers/dedicated?worker';

const initializeApp = async () => {
  const hasOpfsSupport = await isOpfsSupported();

  if (!hasOpfsSupport) {
    const root = createRoot(document.getElementById('root') as HTMLElement);
    root.render(<BrowserNotSupported />);
    return;
  }

  const worker = new DedicatedWorker();
  const workerApi = Comlink.wrap<ColanodeWorkerApi>(worker);

  window.colanode = {
    init: async () => {},
    executeMutation: async (input) => {
      return workerApi.executeMutation(input);
    },
    executeQuery: async (input) => {
      return workerApi.executeQuery(input);
    },
    executeQueryAndSubscribe: async (key, input) => {
      return workerApi.executeQueryAndSubscribe(key, input);
    },
    saveTempFile: async (file) => {
      return workerApi.saveTempFile(file);
    },
    unsubscribeQuery: async (queryId) => {
      return workerApi.unsubscribeQuery(queryId);
    },
    openExternalUrl: async (url) => {
      window.open(url, '_blank');
    },
  };

  window.eventBus = eventBus;

  workerApi.subscribe(
    Comlink.proxy((event) => {
      eventBus.publish(event);
    })
  );

  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(<Root />);
};

initializeApp().catch(() => {
  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(<BrowserNotSupported />);
});
