const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Erro na requisição');
    }
    return data;
  } catch (err) {
    console.error(`Erro na requisição para ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Produtos e Estoque
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  addMovement: (productId, data) => request(`/products/${productId}/movement`, { method: 'POST', body: JSON.stringify(data) }),

  // Contas a Pagar
  getPayables: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payables${query ? `?${query}` : ''}`);
  },
  createPayable: (data) => request('/payables', { method: 'POST', body: JSON.stringify(data) }),
  updatePayable: (id, data) => request(`/payables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  payAccount: (id, data) => request(`/payables/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  deletePayable: (id) => request(`/payables/${id}`, { method: 'DELETE' }),

  // Contas a Receber
  getReceivables: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/receivables${query ? `?${query}` : ''}`);
  },
  createReceivable: (data) => request('/receivables', { method: 'POST', body: JSON.stringify(data) }),
  updateReceivable: (id, data) => request(`/receivables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  receiveAccount: (id, data) => request(`/receivables/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  deleteReceivable: (id) => request(`/receivables/${id}`, { method: 'DELETE' }),

  // Fluxo de Caixa
  getCashFlow: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/cashflow${query ? `?${query}` : ''}`);
  },
  createCashEntry: (data) => request('/cashflow', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashEntry: (id) => request(`/cashflow/${id}`, { method: 'DELETE' }),

  // Shopee
  getShopeeConfig: () => request('/shopee/config'),
  saveShopeeConfig: (data) => request('/shopee/config', { method: 'POST', body: JSON.stringify(data) }),
  getShopeeAuthUrl: () => request('/shopee/auth-url'),
  simulateSale: (data) => request('/shopee/simulate-sale', { method: 'POST', body: JSON.stringify(data) }),
};
