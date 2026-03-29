export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateReplyInput {
  systemPrompt: string;
  messages: Message[];
}

export interface GenerateReplyOutput {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
