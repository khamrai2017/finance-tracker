// API Constants and Functions

export const API_BASE = 'http://localhost:8000/api';

export const fetchOverview = async () => {
  const response = await fetch(`${API_BASE}/analytics/overview`);
  const data = await response.json();
  return data;
};

export const fetchTransactions = async (searchTerm = '', filterCategory = '', filterAccount = '', filterStartDate = '', filterEndDate = '') => {
  const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
  const categoryParam = filterCategory ? `&category_id=${filterCategory}` : '';
  const accountParam = filterAccount ? `&account_id=${filterAccount}` : '';
  const startDateParam = filterStartDate ? `&start_date=${filterStartDate}` : '';
  const endDateParam = filterEndDate ? `&end_date=${filterEndDate}` : '';
  const response = await fetch(`${API_BASE}/transactions?limit=1000${searchParam}${categoryParam}${accountParam}${startDateParam}${endDateParam}`);
  const data = await response.json();
  return data;
};

export const fetchAccounts = async () => {
  const response = await fetch(`${API_BASE}/accounts`);
  const data = await response.json();
  return data;
};

export const fetchCategories = async () => {
  const response = await fetch(`${API_BASE}/categories`);
  const data = await response.json();
  return data;
};

export const fetchAnalytics = async () => {
  const [categoryBreakdown, monthlyTrend, accountDistribution, topMerchants] = await Promise.all([
    fetch(`${API_BASE}/analytics/category-breakdown`).then(r => r.json()),
    fetch(`${API_BASE}/analytics/monthly-trend`).then(r => r.json()),
    fetch(`${API_BASE}/analytics/account-distribution`).then(r => r.json()),
    fetch(`${API_BASE}/analytics/top-merchants`).then(r => r.json())
  ]);

  return { categoryBreakdown, monthlyTrend, accountDistribution, topMerchants };
};

export const fetchBudgets = async () => {
  const response = await fetch(`${API_BASE}/budgets`);
  const data = await response.json();
  return data;
};

export const initializeMerchantMappings = async () => {
  try {
    const response = await fetch(`${API_BASE}/merchant-mappings/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Merchant mappings initialized:', data);
      return data;
    }
  } catch (error) {
    console.log('Note: Merchant mappings not initialized (optional feature)');
  }
  return null;
};

export const fetchMerchantMappings = async () => {
  try {
    const response = await fetch(`${API_BASE}/merchant-mappings`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error fetching merchant mappings:', error);
  }
  return [];
};

export const updateTransaction = async (id, data) => {
  const response = await fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response;
};

export const createTransaction = async (data) => {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response;
};
