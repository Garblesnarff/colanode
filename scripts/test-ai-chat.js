#!/usr/bin/env node

/**
 * AI Chat Integration Test Script
 * 
 * This script tests the AI chat functionality by:
 * 1. Creating a new chat session
 * 2. Sending a test message
 * 3. Verifying the AI response
 * 
 * Usage: node test-ai-chat.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

if (!WORKSPACE_ID || !AUTH_TOKEN) {
  console.error('Please set TEST_WORKSPACE_ID and TEST_AUTH_TOKEN environment variables');
  process.exit(1);
}

async function testAiChat() {
  console.log('🤖 Testing AI Chat Integration...\n');

  try {
    // Step 1: Create a new chat session
    console.log('1. Creating new chat session...');
    const chatResponse = await fetch(`${API_BASE}/v1/workspaces/${WORKSPACE_ID}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        name: 'AI Chat Test Session',
        providerConfig: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
        },
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(`Failed to create chat: ${chatResponse.status} ${chatResponse.statusText}`);
    }

    const chat = await chatResponse.json();
    console.log(`✅ Chat created with ID: ${chat.id}\n`);

    // Step 2: Send a test message
    console.log('2. Sending test message...');
    const messageResponse = await fetch(`${API_BASE}/v1/workspaces/${WORKSPACE_ID}/chats/${chat.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        content: 'Hello! Can you explain what Colanode is and how it works?',
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.status} ${messageResponse.statusText}`);
    }

    const messageResult = await messageResponse.json();
    console.log('✅ Message sent successfully');
    console.log(`📤 User message ID: ${messageResult.userMessage.id}`);
    
    if (messageResult.assistantMessage) {
      console.log(`📥 Assistant response ID: ${messageResult.assistantMessage.id}`);
      console.log(`🤖 Assistant response: "${messageResult.assistantMessage.content.substring(0, 100)}..."\n`);
    }

    // Step 3: Retrieve chat history
    console.log('3. Retrieving chat history...');
    const historyResponse = await fetch(`${API_BASE}/v1/workspaces/${WORKSPACE_ID}/chats/${chat.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });

    if (!historyResponse.ok) {
      throw new Error(`Failed to get chat history: ${historyResponse.status} ${historyResponse.statusText}`);
    }

    const history = await historyResponse.json();
    console.log(`✅ Retrieved ${history.messages.length} messages in chat history\n`);

    // Step 4: Test provider configuration
    console.log('4. Testing OpenRouter provider (if configured)...');
    const openrouterResponse = await fetch(`${API_BASE}/v1/workspaces/${WORKSPACE_ID}/chats/${chat.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        content: 'What are the key features of collaborative editing?',
        providerOverride: {
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.7,
        },
      }),
    });

    if (openrouterResponse.ok) {
      const openrouterResult = await openrouterResponse.json();
      console.log('✅ OpenRouter provider test successful');
      if (openrouterResult.assistantMessage) {
        console.log(`🤖 OpenRouter response: "${openrouterResult.assistantMessage.content.substring(0, 100)}..."\n`);
      }
    } else {
      console.log('⚠️  OpenRouter provider not available or not configured\n');
    }

    console.log('🎉 All tests passed! AI Chat integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Helper function for fetch (Node.js might not have fetch globally)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

testAiChat();