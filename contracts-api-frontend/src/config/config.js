import { API_BASE_URL } from './env'; 

export const API_ENDPOINTS = {
  AUCTIONS: {
    LIST: `${API_BASE_URL}/contract/auctions`,
  },
  ADMIN: {
    UPDATE_PRICE: `${API_BASE_URL}/contract/admin/sales/price`,
    ADD_WHITELIST: `${API_BASE_URL}/contract/admin/sales/whitelist`,
    REMOVE_WHITELIST: `${API_BASE_URL}/contract/admin/sales/whitelist`,
  },
}; 