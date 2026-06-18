import { Response } from 'express';

export interface GudangClient {
  userId: string;
  managedWarehouses: string[];
  res: Response;
}

export interface SellerClient {
  sellerId: string;
  res: Response;
}

export let gudangClients: GudangClient[] = [];
export let sellerClients: SellerClient[] = [];

export const addGudangClient = (client: GudangClient) => {
  gudangClients.push(client);
};

export const removeGudangClient = (res: Response) => {
  gudangClients = gudangClients.filter((c) => c.res !== res);
};

export const addSellerClient = (client: SellerClient) => {
  sellerClients.push(client);
};

export const removeSellerClient = (res: Response) => {
  sellerClients = sellerClients.filter((c) => c.res !== res);
};
