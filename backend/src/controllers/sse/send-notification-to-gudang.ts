import { gudangClients } from './store';

// Send live update to warehouse admins managing a specific warehouse ID
export const sendNotificationToGudang = (gudangId: string, payload: Record<string, unknown>) => {
  gudangClients.forEach((client) => {
    if (client.managedWarehouses.includes(gudangId)) {
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  });
};
