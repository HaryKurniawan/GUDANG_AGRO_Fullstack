import { sellerClients } from './store';

// Send status updates to seller client in real-time
export const sendNotificationToSellers = (sellerId: string, payload: Record<string, unknown>) => {
  sellerClients.forEach((client) => {
    if (client.sellerId === sellerId) {
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  });
};
