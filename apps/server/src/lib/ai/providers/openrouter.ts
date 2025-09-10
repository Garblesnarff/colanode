import { BaseLLM } from '@langchain/core/language_models/llms';
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { Generation, LLMResult } from '@langchain/core/outputs';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  httpReferer?: string;
  xTitle?: string;
  baseUrl?: string;
}

export class OpenRouterLLM extends BaseLLM {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens?: number;
  private topP?: number;
  private httpReferer: string;
  private xTitle: string;
  private baseUrl: string;

  constructor(config: OpenRouterConfig) {
    super({});
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens;
    this.topP = config.topP;
    this.httpReferer = config.httpReferer ?? 'https://colanode.com';
    this.xTitle = config.xTitle ?? 'Colanode';
    this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
  }

  _llmType(): string {
    return 'openrouter';
  }

  async _generate(
    messages: string[],
    options?: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<LLMResult> {
    const prompt = messages.join('\n');
    
    try {
      const response = await this._call(prompt, options, runManager);
      return {
        generations: [
          {
            text: response,
          },
        ],
      };
    } catch (error) {
      throw new Error(`OpenRouter API error: ${error}`);
    }
  }

  async _call(
    prompt: string,
    options?: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    return this._chatCompletion(messages);
  }

  async _chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': this.httpReferer,
        'X-Title': this.xTitle,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    return data.choices[0].message.content;
  }

  // Chat interface for LangChain compatibility
  async invoke(messages: BaseMessage[]): Promise<string> {
    const formattedMessages = messages.map((message) => {
      if (message instanceof HumanMessage) {
        return { role: 'user', content: message.content as string };
      } else if (message instanceof AIMessage) {
        return { role: 'assistant', content: message.content as string };
      } else if (message instanceof SystemMessage) {
        return { role: 'system', content: message.content as string };
      } else {
        return { role: 'user', content: message.content as string };
      }
    });

    return this._chatCompletion(formattedMessages);
  }

  // Stream support for real-time responses
  async *stream(
    messages: BaseMessage[]
  ): AsyncGenerator<string, void, unknown> {
    const formattedMessages = messages.map((message) => {
      if (message instanceof HumanMessage) {
        return { role: 'user', content: message.content as string };
      } else if (message instanceof AIMessage) {
        return { role: 'assistant', content: message.content as string };
      } else if (message instanceof SystemMessage) {
        return { role: 'system', content: message.content as string };
      } else {
        return { role: 'user', content: message.content as string };
      }
    });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': this.httpReferer,
        'X-Title': this.xTitle,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}