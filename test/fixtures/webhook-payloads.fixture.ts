export function instagramTextMessage(pageId: string, userId: string, text: string) {
  return {
    object: 'instagram',
    entry: [
      {
        id: pageId,
        time: Date.now(),
        messaging: [
          {
            sender: { id: userId },
            recipient: { id: pageId },
            timestamp: Date.now(),
            message: {
              mid: `m_${Date.now()}`,
              text,
            },
          },
        ],
      },
    ],
  };
}

export function instagramDeliveryReceipt(pageId: string, userId: string) {
  return {
    object: 'instagram',
    entry: [
      {
        id: pageId,
        time: Date.now(),
        messaging: [
          {
            sender: { id: userId },
            recipient: { id: pageId },
            timestamp: Date.now(),
            delivery: {
              mids: [`m_${Date.now()}`],
              watermark: Date.now(),
            },
          },
        ],
      },
    ],
  };
}

export function whatsappTextMessage(phoneNumberId: string, from: string, text: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550000000',
                phone_number_id: phoneNumberId,
              },
              messages: [
                {
                  from,
                  id: `wamid.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: text },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export function whatsappImageMessage(phoneNumberId: string, from: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550000000',
                phone_number_id: phoneNumberId,
              },
              messages: [
                {
                  from,
                  id: `wamid.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'image',
                  image: { mime_type: 'image/jpeg', sha256: 'abc', id: 'img123' },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

export function whatsappStatusUpdate(phoneNumberId: string, messageId: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550000000',
                phone_number_id: phoneNumberId,
              },
              statuses: [
                {
                  id: messageId,
                  status: 'delivered',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}
