import { createHmac } from 'crypto';

export function computeMetaSignature(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

export function computeDialog360Signature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}
