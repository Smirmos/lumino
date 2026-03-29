export interface ChatbotRequestLog {
  event: 'chatbot_request';
  clientId: string;
  channel: 'whatsapp' | 'instagram';
  userId: string;
  messageLength: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'fallback' | 'blocked' | 'rate_limited';
  escalated: boolean;
  requestId?: string;
}

export interface ChatbotSecurityLog {
  event: 'injection_detected' | 'user_blocked' | 'rate_limited';
  clientId: string;
  userId: string;
  channel: string;
  reason: string;
}

export interface ChatbotErrorLog {
  event: 'claude_error' | 'redis_error' | 'db_error';
  clientId?: string;
  error: string;
  latencyMs?: number;
}
