import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon, Calendar, Plus, Upload, Download, Filter, Search, X, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:8000/api';

// Utility Functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date) => {
  // Parse the date and convert to IST
  const dateObj = new Date(date);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = istFormatter.formatToParts(dateObj);
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const formatMonth = (date) => {
  const dateObj = new Date(date);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short'
  });
  return istFormatter.format(dateObj);
};

const formatDateTime = (date) => {
  const dateObj = new Date(date);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return istFormatter.format(dateObj);
};

const formatDateTimeForInput = (date) => {
  // Convert to IST and format for datetime-local input
  const dateObj = new Date(date);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = istFormatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

// Theme Configuration
const themes = {
  facebookInspired: {
    name: 'Modern Blue',
    bg: 'linear-gradient(135deg, #f0f4f9 0%, #e8eef7 50%, #f5f8fc 100%)',
    primary: '#1877F2',
    secondary: '#31A24C',
    tertiary: '#0ea5e9',
    accentLight: 'rgba(24, 119, 242, 0.12)',
    accentLighter: 'rgba(24, 119, 242, 0.06)',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    text: '#1f2937',
    textSecondary: '#6b7280',
    headerBg: 'rgba(255, 255, 255, 0.95)'
  },
  darkPurple: {
    name: 'Dark Purple',
    bg: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b4e 100%)',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    tertiary: '#3b82f6',
    accentLight: 'rgba(139, 92, 246, 0.15)',
    accentLighter: 'rgba(139, 92, 246, 0.1)',
    cardBg: 'rgba(30, 30, 60, 0.6)',
    text: '#e0e0ff',
    textSecondary: '#a0a0c0',
    headerBg: 'rgba(15, 15, 35, 0.8)'
  },
  light: {
    name: 'Light',
    bg: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8f0 50%, #dfdce5 100%)',
    primary: '#7c3aed',
    secondary: '#ec4899',
    tertiary: '#3b82f6',
    accentLight: 'rgba(124, 58, 237, 0.15)',
    accentLighter: 'rgba(124, 58, 237, 0.1)',
    cardBg: 'rgba(255, 255, 255, 0.7)',
    text: '#1f1f1f',
    textSecondary: '#666666',
    headerBg: 'rgba(255, 255, 255, 0.9)'
  },
  oceanBlue: {
    name: 'Ocean Blue',
    bg: 'linear-gradient(135deg, #0a0e27 0%, #1a2a4e 50%, #0f3a5f 100%)',
    primary: '#0891b2',
    secondary: '#06b6d4',
    tertiary: '#0ea5e9',
    accentLight: 'rgba(8, 145, 178, 0.15)',
    accentLighter: 'rgba(8, 145, 178, 0.1)',
    cardBg: 'rgba(15, 40, 70, 0.6)',
    text: '#e0f2fe',
    textSecondary: '#7dd3fc',
    headerBg: 'rgba(10, 14, 39, 0.8)'
  },
  forestGreen: {
    name: 'Forest Green',
    bg: 'linear-gradient(135deg, #051e15 0%, #064e3b 50%, #0d3b28 100%)',
    primary: '#10b981',
    secondary: '#34d399',
    tertiary: '#6ee7b7',
    accentLight: 'rgba(16, 185, 129, 0.15)',
    accentLighter: 'rgba(16, 185, 129, 0.1)',
    cardBg: 'rgba(20, 50, 40, 0.6)',
    text: '#d1fae5',
    textSecondary: '#a7f3d0',
    headerBg: 'rgba(5, 30, 21, 0.8)'
  },
  sunset: {
    name: 'Sunset',
    bg: 'linear-gradient(135deg, #3e2723 0%, #8d3e1e 50%, #c2185b 100%)',
    primary: '#f97316',
    secondary: '#f43f5e',
    tertiary: '#fb7185',
    accentLight: 'rgba(249, 115, 22, 0.15)',
    accentLighter: 'rgba(249, 115, 22, 0.1)',
    cardBg: 'rgba(80, 40, 20, 0.6)',
    text: '#fde68a',
    textSecondary: '#fed7aa',
    headerBg: 'rgba(62, 39, 35, 0.8)'
  }
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [overview, setOverview] = useState({});
  const [analytics, setAnalytics] = useState({
    categoryBreakdown: [],
    monthlyTrend: [],
    accountDistribution: [],
    topMerchants: []
  });
  const [budgets, setBudgets] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showModifyTransaction, setShowModifyTransaction] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTheme, setCurrentTheme] = useState('facebookInspired');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [copiedRowId, setCopiedRowId] = useState(null);
  const [copiedData, setCopiedData] = useState({});
  const [importedData, setImportedData] = useState([]);
  const [selectedImports, setSelectedImports] = useState(new Set());
  const [editingImportId, setEditingImportId] = useState(null);
  const [editingImportData, setEditingImportData] = useState({});
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [rawImportData, setRawImportData] = useState([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    title: '',
    amount: '',
    date: '',
    debitCredit: '',
    note: ''
  });
  const [selectedCategoryForImport, setSelectedCategoryForImport] = useState('');
  const [selectedAccountForImport, setSelectedAccountForImport] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const theme = themes[currentTheme];

  // Fetch data
  useEffect(() => {
    fetchOverview();
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
    fetchAnalytics();
    fetchBudgets();
  }, [searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate]);

  const fetchOverview = async () => {
    const response = await fetch(`${API_BASE}/analytics/overview`);
    const data = await response.json();
    setOverview(data);
  };

  const fetchTransactions = async () => {
    const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
    const categoryParam = filterCategory ? `&category_id=${filterCategory}` : '';
    const accountParam = filterAccount ? `&account_id=${filterAccount}` : '';
    const startDateParam = filterStartDate ? `&start_date=${filterStartDate}` : '';
    const endDateParam = filterEndDate ? `&end_date=${filterEndDate}` : '';
    const response = await fetch(`${API_BASE}/transactions?limit=1000${searchParam}${categoryParam}${accountParam}${startDateParam}${endDateParam}`);
    const data = await response.json();
    setTransactions(data);
  };

  const fetchAccounts = async () => {
    const response = await fetch(`${API_BASE}/accounts`);
    const data = await response.json();
    setAccounts(data);
  };

  const fetchCategories = async () => {
    const response = await fetch(`${API_BASE}/categories`);
    const data = await response.json();
    setCategories(data);
    // Auto-set "Imported" category as default for imports
    const importedCategory = data.find(c => c.name.toLowerCase() === 'imported');
    if (importedCategory) {
      setSelectedCategoryForImport(importedCategory.id);
    } else if (data.length > 0) {
      // Fallback to first category if "Imported" doesn't exist
      setSelectedCategoryForImport(data[0].id);
    }
  };

  const fetchAnalytics = async () => {
    const [categoryBreakdown, monthlyTrend, accountDistribution, topMerchants] = await Promise.all([
      fetch(`${API_BASE}/analytics/category-breakdown`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/monthly-trend`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/account-distribution`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/top-merchants`).then(r => r.json())
    ]);

    setAnalytics({ categoryBreakdown, monthlyTrend, accountDistribution, topMerchants });
  };

  const fetchBudgets = async () => {
    const response = await fetch(`${API_BASE}/budgets`);
    const data = await response.json();
    setBudgets(data);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/import/csv`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      alert(data.message);
      fetchTransactions();
      fetchOverview();
      fetchAnalytics();
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEditTransaction = (transaction) => {
    setShowModifyTransaction(true);
    setEditingRowId(transaction.id);
    setEditingData({ ...transaction });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
    setShowModifyTransaction(false);
  };

  const handleSaveTransaction = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/${editingRowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: editingData.account_id,
          category_id: editingData.category_id,
          amount: editingData.amount,
          title: editingData.title,
          note: editingData.note,
          date: editingData.date,
          is_income: editingData.is_income,
          merchant: editingData.merchant
        })
      });

      if (response.ok) {
        fetchTransactions();
        setEditingRowId(null);
        setEditingData({});
        setShowModifyTransaction(false);
        alert('Transaction updated successfully!');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    }
  };

  const handleCopyRow = (transaction) => {
    setCopiedRowId(transaction.id);
    setCopiedData({ ...transaction, id: undefined });
  };

  const handleCancelCopy = () => {
    setCopiedRowId(null);
    setCopiedData({});
  };

  // Export transactions to Excel
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const exportData = filteredTransactions.map(transaction => ({
      'Date': formatDate(transaction.date),
      'Title': transaction.title,
      'Category': transaction.category_name,
      'Account': transaction.account_name,
      'Amount': transaction.amount,
      'Type': transaction.is_income ? 'Income' : 'Expense',
      'Note': transaction.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 }
    ];

    const fileName = `transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSaveCopiedRow = async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: copiedData.account_id,
          category_id: copiedData.category_id,
          amount: copiedData.amount,
          title: copiedData.title,
          note: copiedData.note,
          date: copiedData.date,
          is_income: copiedData.is_income,
          merchant: copiedData.merchant
        })
      });

      if (response.ok) {
        fetchTransactions();
        setCopiedRowId(null);
        setCopiedData({});
        alert('Transaction copied and saved successfully!');
      }
    } catch (error) {
      console.error('Error creating copied transaction:', error);
      alert('Failed to save copied transaction');
    }
  };

  // Import from XLSX
  const handleImportXLSX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showNotification('File is empty', 'error');
          return;
        }

        // Auto-detect column mapping based on header names
        const columns = Object.keys(jsonData[0]);
        const autoMapping = autoDetectColumns(columns);

        // Auto-select "supermoney" account if it exists
        const supermoneyAccount = accounts.find(acc => acc.name.toLowerCase() === 'supermoney');
        if (supermoneyAccount) {
          setSelectedAccountForImport(supermoneyAccount.id.toString());
        }

        // Store raw data and show grid first
        setRawImportData(jsonData);
        setColumnMapping(autoMapping);

        // Load grid with raw data immediately
        const rawGridData = jsonData.map((row, index) => ({
          id: index,
          ...row,
          _isRaw: true // Flag to indicate this is raw unmapped data
        }));
        setImportedData(rawGridData);
        setSelectedImports(new Set(rawGridData.map((_, i) => i)));

        // Don't show mapping modal immediately - user must click "Map Columns to Import" button
        setShowColumnMapping(false);
      } catch (error) {
        showNotification('Error reading file: ' + error.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Auto-detect columns based on common naming patterns
  const autoDetectColumns = (columns) => {
    const mapping = {
      title: '',
      amount: '',
      date: '',
      debitCredit: '',
      note: ''
    };

    const titlePatterns = /^(title|Transaction Details|Transaction|Details|description|narration|particulars|name|payee|merchant)$/i;
    const amountPatterns = /(amount|value|amt|withdrawal|deposit|debit|credit)/i;
    const datePatterns = /(date|tran date|posting date|transaction date|trans date|posted)/i;
    const debitCreditPatterns = /^(type|debit\/credit|debit.credit|dr\/cr|transaction type|narration type)$/i;
    const notePatterns = /^(note|notes|remarks|description|comments)$/i;

    columns.forEach(col => {
      const lowerCol = col.toLowerCase().trim();

      if (!mapping.title && titlePatterns.test(lowerCol)) {
        mapping.title = col;
      } else if (!mapping.amount && amountPatterns.test(lowerCol)) {
        mapping.amount = col;
      } else if (!mapping.date && datePatterns.test(lowerCol)) {
        mapping.date = col;
      } else if (!mapping.debitCredit && debitCreditPatterns.test(lowerCol)) {
        mapping.debitCredit = col;
      } else if (!mapping.note && notePatterns.test(lowerCol)) {
        mapping.note = col;
      }
    });

    return mapping;
  };

  const handleApplyColumnMapping = () => {
    // Use selected category (now required)
    const importedCategoryId = selectedCategoryForImport;

    // Validate that required columns are mapped
    if (!columnMapping.title || !columnMapping.amount || !selectedAccountForImport || !selectedCategoryForImport) {
      showNotification('Please map all required fields: Title, Amount, select Category, and select Account', 'error');
      return;
    }

    // Helper function to parse amount - handle various formats
    const parseAmount = (value) => {
      if (value === null || value === undefined || value === '') return 0;

      // Convert to string and remove common currency symbols and spaces
      let numStr = String(value)
        .replace(/[₹$€£¥]/g, '')
        .replace(/,/g, '')
        .trim();

      const parsed = parseFloat(numStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper function to determine if transaction is income or expense based on debit/credit
    const determineIsIncome = (row) => {
      if (columnMapping.debitCredit) {
        const debitCreditValue = String(row[columnMapping.debitCredit] || '').toLowerCase().trim();
        // Credit = Income, Debit = Expense
        return debitCreditValue.includes('cr') || debitCreditValue.includes('credit');
      }
      return false; // Default to expense if no debit/credit column
    };

    // Helper function to clean UPI titles
    const cleanUpiTitle = (title) => {
      if (!title) return '';

      // Check if title starts with UPI/ or UPICC/ (case insensitive)
      const upperTitle = title.toUpperCase();
      if (upperTitle.startsWith('UPI/') || upperTitle.startsWith('UPICC/')) {
        // Split by / and get the second part (merchant name)
        const parts = title.split('/');
        if (parts.length >= 2 && parts[1]) {
          return parts[1].trim();
        }
      }

      return title;
    };

    const selectedCategory = categories.find(c => c.id === parseInt(importedCategoryId));
    const selectedAccount = accounts.find(a => a.id === parseInt(selectedAccountForImport));

    // Process the data using the mapping
    const processedData = rawImportData.map((row, index) => {
      const rawTitle = row[columnMapping.title] || '';
      const cleanedTitle = cleanUpiTitle(rawTitle);

      return {
        id: index,
        title: cleanedTitle,
        amount: parseAmount(row[columnMapping.amount]),
        category_name: selectedCategory?.name || 'Imported',
        category_id: parseInt(importedCategoryId),
        account_name: selectedAccount?.name || '',
        account_id: parseInt(selectedAccountForImport),
        date: columnMapping.date ? row[columnMapping.date] : new Date().toISOString(),
        is_income: determineIsIncome(row),
        note: columnMapping.note ? (row[columnMapping.note] || '') : ''
      };
    });

    setImportedData(processedData);
    setSelectedImports(new Set(processedData.map((_, i) => i)));
    setShowColumnMapping(false);
    setRawImportData([]);
  };

  const handleImportCheckChange = (id) => {
    const newSelected = new Set(selectedImports);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImports(newSelected);
  };

  const handleSelectAllImports = () => {
    if (selectedImports.size === importedData.length) {
      setSelectedImports(new Set());
    } else {
      setSelectedImports(new Set(importedData.map((_, i) => i)));
    }
  };

  const handleEditImportRow = (id) => {
    setEditingImportId(id);
    setEditingImportData({ ...importedData[id] });
  };

  const handleSaveImportEdit = () => {
    const updated = [...importedData];
    updated[editingImportId] = editingImportData;
    setImportedData(updated);
    setEditingImportId(null);
    setEditingImportData({});
  };

  const handleCancelImportEdit = () => {
    setEditingImportId(null);
    setEditingImportData({});
  };

  const handleConfirmImport = async () => {
    const selectedRecords = importedData.filter((_, i) => selectedImports.has(i));

    if (selectedRecords.length === 0) {
      showNotification('Please select at least one transaction to import', 'error');
      return;
    }

    // Validate that all required fields have IDs assigned
    const recordsToImport = selectedRecords.map(record => {
      if (!record.account_id) {
        throw new Error(`Account not selected for: ${record.title}`);
      }
      if (!record.category_id) {
        throw new Error(`Category not selected for: ${record.title}`);
      }

      return {
        title: record.title,
        amount: record.amount,
        category_id: record.category_id,
        account_id: record.account_id,
        date: new Date(record.date).toISOString(),
        is_income: record.is_income,
        note: record.note
      };
    });

    try {
      for (const record of recordsToImport) {
        await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
      }

      showNotification(`Successfully imported ${recordsToImport.length} transactions!`, 'success');
      setImportedData([]);
      setSelectedImports(new Set());
      setShowImportConfirm(false);
      fetchTransactions();
      fetchOverview();
      fetchAnalytics();
    } catch (error) {
      showNotification('Import failed: ' + error.message, 'error');
    }
  };

  // Calculate total transaction amounts
  const calculateTotalAmount = (transactionList) => {
    return transactionList.reduce((sum, transaction) => {
      if (transaction.category_name === 'Balance Correction') return sum;
      return sum + (transaction.is_income ? transaction.amount : -transaction.amount);
    }, 0);
  };

  // Calculate sum by account
  const calculateSumByAccount = (transactionList) => {
    const sumByAccount = {};
    transactionList.forEach(transaction => {
      if (transaction.category_name === 'Balance Correction') return;
      if (!sumByAccount[transaction.account_name]) {
        sumByAccount[transaction.account_name] = 0;
      }
      sumByAccount[transaction.account_name] += (transaction.is_income ? transaction.amount : -transaction.amount);
    });
    return sumByAccount;
  };

  // Filter and sort transactions
  const filteredTransactions = transactions.sort((a, b) => {
    let aVal, bVal;

    // Handle date/datetime comparison
    if (sortConfig.key === 'date') {
      aVal = new Date(a.date).getTime();
      bVal = new Date(b.date).getTime();
    }
    // Handle month comparison
    else if (sortConfig.key === 'month') {
      const aMonth = new Date(a.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const bMonth = new Date(b.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      aVal = new Date(aMonth).getMonth();
      bVal = new Date(bMonth).getMonth();
    }
    // Handle amount comparison
    else if (sortConfig.key === 'amount') {
      aVal = parseFloat(a[sortConfig.key]);
      bVal = parseFloat(b[sortConfig.key]);
    }
    // Handle string comparison
    else {
      aVal = String(a[sortConfig.key] || '').toLowerCase();
      bVal = String(b[sortConfig.key] || '').toLowerCase();
    }

    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });

  return (
    <div className="app">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: ${theme.bg};
          color: ${theme.text};
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app {
          position: relative;
          min-height: 100vh;
        }

        .app::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, ${theme.accentLight} 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, ${theme.accentLight} 0%, transparent 40%),
            radial-gradient(circle at 40% 80%, ${theme.accentLighter} 0%, transparent 40%);
          pointer-events: none;
          z-index: 0;
        }

        .header {
          position: relative;
          z-index: 10;
          background: ${theme.headerBg};
          backdrop-filter: blur(20px);
          border-bottom: 1px solid ${theme.accentLight};
          padding: 1.5rem 2rem;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }

        .nav {
          display: flex;
          gap: 0.5rem;
        }

        .nav-btn {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          color: ${theme.textSecondary};
          cursor: pointer;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          font-family: 'DM Sans', sans-serif;
        }

        .nav-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, ${theme.accentLight}, ${theme.accentLight});
          border-radius: 12px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .nav-btn:hover::before {
          opacity: 1;
        }

        .nav-btn.active {
          color: #fff;
          background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .nav-btn span {
          position: relative;
          z-index: 1;
        }

        .theme-selector {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-left: auto;
        }

        .theme-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s;
          padding: 0;
          background: var(--theme-color);
        }

        .theme-btn.active {
          border-color: #fff;
          transform: scale(1.1);
        }

        .container {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-card {
          background: ${theme.cardBg};
          backdrop-filter: blur(20px);
          border: 1px solid ${theme.accentLight};
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, var(--accent-color, ${theme.primary}), transparent);
          opacity: 0;
          transition: opacity 0.4s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          border-color: ${theme.accentLight};
          box-shadow: 0 12px 40px ${theme.accentLight};
        }

        .stat-card:hover::before {
          opacity: 1;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: ${theme.textSecondary};
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${theme.accentLight};
        }

        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: ${theme.text};
        }

        .stat-change {
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-change.positive {
          color: #10b981;
        }

        .stat-change.negative {
          color: #ef4444;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .chart-card {
          background: ${theme.cardBg};
          backdrop-filter: blur(20px);
          border: 1px solid ${theme.accentLight};
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.8s ease-out;
        }

        .chart-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: ${theme.text};
        }

        .table-card {
          background: ${theme.cardBg};
          backdrop-filter: blur(20px);
          border: 1px solid ${theme.accentLight};
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          margin-bottom: 2rem;
          animation: slideUp 0.8s ease-out;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .table-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: ${theme.text};
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'DM Sans', sans-serif;
        }

        .btn-primary {
          background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(139, 92, 246, 0.6);
        }

        .btn-secondary {
          background: ${theme.accentLight};
          color: ${theme.primary};
          border: 1px solid ${theme.accentLight};
        }

        .btn-secondary:hover {
          background: ${theme.accentLighter};
          border-color: ${theme.primary};
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 0.5rem;
        }

        th {
          text-align: left;
          padding: 1.2rem 1rem;
          color: #4b5563;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          cursor: pointer;
          user-select: none;
          position: relative;
          background: #f3f4f6;
          border-bottom: 2px solid #e5e7eb;
        }

        th:hover {
          background: #e5e7eb;
          color: ${theme.text};
        }

        th.sortable::after {
          content: ' ↕';
          opacity: 0.5;
        }

        th.sorted-asc::after {
          content: ' ↑';
          opacity: 1;
          color: ${theme.primary};
        }

        th.sorted-desc::after {
          content: ' ↓';
          opacity: 1;
          color: ${theme.primary};
        }

        td {
          padding: 1rem 1.2rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          color: ${theme.text};
          transition: all 0.3s ease;
        }

        td:first-child {
          border-radius: 8px 0 0 8px;
        }

        td:last-child {
          border-radius: 0 8px 8px 0;
        }

        tbody tr {
          background: white;
          border-radius: 8px;
        }

        tbody tr:hover {
          background: #f8fafb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        tbody tr:hover td {
          background: #f8fafb;
        }

        .copy-btn {
          background: ${theme.primary};
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .copy-btn:hover {
          background: ${theme.secondary};
          transform: scale(1.05);
        }

        .copy-btn:active {
          transform: scale(0.98);
        }

        tr:hover td {
          background: #f8fafb;
        }

        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .modal {
          background: ${theme.cardBg};
          border: 1px solid ${theme.accentLight};
          border-radius: 24px;
          padding: 2rem;
          max-width: 700px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .modal-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: ${theme.text};
        }

        .close-btn {
          background: none;
          border: none;
          color: ${theme.textSecondary};
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .close-btn:hover {
          background: ${theme.accentLight};
          color: ${theme.text};
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          color: ${theme.textSecondary};
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          color: ${theme.text};
          font-size: 1rem;
          transition: all 0.3s;
          font-family: 'DM Sans', sans-serif;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: ${theme.primary};
          box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.1);
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: nowrap;
          align-items: flex-end;
          overflow-x: auto;
        }

        .filter-group {
          flex: 0 0 auto;
          min-width: auto;
        }

        .filter-group:nth-child(1) {
          flex: 1 1 auto;
          min-width: 150px;
        }

        .filter-group:nth-child(2),
        .filter-group:nth-child(3) {
          flex: 0 0 150px;
        }

        .filter-group:nth-child(4),
        .filter-group:nth-child(5) {
          flex: 0 0 120px;
        }

        .filter-group:nth-child(6) {
          flex: 0 0 auto;
        }

        .budget-card {
          background: rgba(20, 20, 40, 0.4);
          border: 1px solid ${theme.accentLight};
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all 0.3s;
        }

        .budget-card:hover {
          border-color: ${theme.primary};
          background: ${theme.accentLight};
        }

        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .progress-bar {
          height: 8px;
          background: ${theme.accentLight};
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${theme.primary}, ${theme.secondary});
          border-radius: 4px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-fill.warning {
          background: linear-gradient(90deg, #f59e0b, #ef4444);
        }

        .amount {
          font-weight: 700;
          color: ${theme.text};
        }

        .amount.expense {
          color: #ef4444;
        }

        .amount.income {
          color: #10b981;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
          }

          .nav {
            width: 100%;
            overflow-x: auto;
          }

          .table-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .theme-selector {
            margin-left: 0;
            order: -1;
          }
        }
      `}</style>

      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast" style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#991b1b' : '#166534',
          border: `2px solid ${notification.type === 'error' ? '#fca5a5' : '#86efac'}`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px',
          fontSize: '0.95rem',
          fontWeight: '500'
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">FinanceFlow</div>
          <nav className="nav">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <span>Transactions</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <span>Budgets</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span>Analytics</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              <span>Import</span>
            </button>
          </nav>
          <div className="theme-selector">
            {Object.entries(themes).map(([key, themeData]) => (
              <button
                key={key}
                className={`theme-btn ${currentTheme === key ? 'active' : ''}`}
                style={{ '--theme-color': themeData.primary }}
                onClick={() => setCurrentTheme(key)}
                title={themeData.name}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="container">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card" style={{ '--accent-color': '#8b5cf6' }}>
                <div className="stat-header">
                  <span className="stat-label">Total Balance</span>
                  <div className="stat-icon">
                    <Wallet size={20} color="#8b5cf6" />
                  </div>
                </div>
                <div className="stat-value">{formatCurrency(overview.net_savings || 0)}</div>
                <div className={`stat-change ${overview.net_savings >= 0 ? 'positive' : 'negative'}`}>
                  {overview.net_savings >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {overview.net_savings >= 0 ? 'Positive' : 'Negative'} Balance
                </div>
              </div>

              <div className="stat-card" style={{ '--accent-color': '#ec4899' }}>
                <div className="stat-header">
                  <span className="stat-label">Total Expenses</span>
                  <div className="stat-icon">
                    <CreditCard size={20} color="#ec4899" />
                  </div>
                </div>
                <div className="stat-value">{formatCurrency(overview.total_expenses || 0)}</div>
                <div className="stat-change">
                  This month: {formatCurrency(overview.month_expenses || 0)}
                </div>
              </div>

              <div className="stat-card" style={{ '--accent-color': '#10b981' }}>
                <div className="stat-header">
                  <span className="stat-label">Total Income</span>
                  <div className="stat-icon">
                    <TrendingUp size={20} color="#10b981" />
                  </div>
                </div>
                <div className="stat-value">{formatCurrency(overview.total_income || 0)}</div>
                <div className="stat-change">
                  This month: {formatCurrency(overview.month_income || 0)}
                </div>
              </div>

              <div className="stat-card" style={{ '--accent-color': '#3b82f6' }}>
                <div className="stat-header">
                  <span className="stat-label">Transactions</span>
                  <div className="stat-icon">
                    <PieChartIcon size={20} color="#3b82f6" />
                  </div>
                </div>
                <div className="stat-value">{overview.total_transactions || 0}</div>
                <div className="stat-change">
                  All time records
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              {/* Category Breakdown */}
              <div className="chart-card">
                <h3 className="chart-title">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      dataKey="total"
                      nameKey="name"
                      cx="40%"
                      cy="50%"
                      outerRadius={80}
                      label={false}
                    >
                      {analytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.primary}`,
                        borderRadius: '12px',
                        color: theme.text
                      }}
                      labelFormatter={(value) => `${value}`}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value, entry) => `${value} ${(entry.payload.percent * 100).toFixed(0)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Trend */}
              <div className="chart-card">
                <h3 className="chart-title">Monthly Spending Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                    <XAxis dataKey="month" stroke="#a0a0c0" />
                    <YAxis stroke="#a0a0c0" />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: theme.cardBg,
                        border: `1px solid ${theme.primary}`,
                        borderRadius: '12px',
                        color: theme.text
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#ec4899', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Account Distribution */}
            <div className="chart-card">
              <h3 className="chart-title">Spending by Account</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.accountDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey="name" stroke="#a0a0c0" />
                  <YAxis stroke="#a0a0c0" />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.primary}`,
                      borderRadius: '12px',
                      color: theme.text
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {analytics.accountDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="table-card">
            <div className="table-header">
              <h2 className="table-title">All Transactions</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label className="btn btn-secondary">
                  <Upload size={18} />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    style={{ display: 'none' }}
                  />
                </label>
                <button className="btn btn-primary" onClick={() => setShowAddTransaction(true)}>
                  <Plus size={18} />
                  Add Transaction
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowModifyTransaction(!showModifyTransaction)}
                  style={{ background: showModifyTransaction ? theme.secondary : theme.primary }}
                >
                  ✏️ Modify Transaction
                </button>
                <button className="btn btn-primary" onClick={handleExportExcel}>
                  <FileDown size={18} />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="filters">
              <div className="filter-group">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Account</label>
                <select
                  className="form-select"
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                >
                  <option value="">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCategory('');
                    setFilterAccount('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                >
                  Reset Selection
                </button>
              </div>
            </div>

            {/* Totals Summary */}
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'stretch' }}>
              <div style={{ flex: '0 0 auto', padding: '1.5rem', background: theme.accentLight, borderRadius: '8px', minWidth: '250px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                  <h3 style={{ color: theme.text, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Transactions</h3>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: theme.primary, marginBottom: '1.5rem' }}>
                    {filteredTransactions.length}
                  </span>
                  <h3 style={{ color: theme.text, marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Overall Total</h3>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: calculateTotalAmount(filteredTransactions) >= 0 ? theme.secondary : '#ef4444' }}>
                    {calculateTotalAmount(filteredTransactions) >= 0 ? '+' : ''}{formatCurrency(calculateTotalAmount(filteredTransactions))}
                  </span>
                </div>
              </div>

              {/* Account-wise Summary */}
              <div style={{ flex: 1, padding: '1.5rem', background: theme.accentLight, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: theme.text, fontSize: '0.875rem', fontWeight: 600 }}>Account-wise Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(calculateSumByAccount(filteredTransactions)).map(([accountName, sum]) => (
                    <div
                      key={accountName}
                      style={{
                        background: theme.cardBg,
                        padding: '1rem',
                        borderRadius: '6px',
                        border: `1px solid ${theme.accentLight}`
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', color: theme.textSecondary, marginBottom: '0.5rem' }}>
                        {accountName}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: sum >= 0 ? theme.secondary : '#ef4444' }}>
                        {sum >= 0 ? '+' : ''}{formatCurrency(sum)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('date')}
                  >
                    DateTime
                  </th>
                  <th
                    className={`sortable ${sortConfig.key === 'month' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('month')}
                  >
                    Month
                  </th>
                  <th
                    className={`sortable ${sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </th>
                  <th
                    className={`sortable ${sortConfig.key === 'category_name' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('category_name')}
                  >
                    Category
                  </th>
                  <th
                    className={`sortable ${sortConfig.key === 'account_name' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('account_name')}
                  >
                    Account
                  </th>
                  <th
                    className={`sortable ${sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                    onClick={() => handleSort('amount')}
                  >
                    Amount
                  </th>
                  <th>Note</th>
                  {showModifyTransaction && <th style={{ textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(transaction => (
                  <React.Fragment key={transaction.id}>
                    {/* Main Row */}
                    {editingRowId !== transaction.id && copiedRowId !== transaction.id && (
                      <tr>
                        <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.9rem' }}>{formatDate(transaction.date)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: theme.primary }}>{formatMonth(transaction.date)}</td>
                        <td style={{ fontWeight: 600 }}>{transaction.title}</td>
                        <td style={{ maxWidth: '100px', overflow: 'hidden' }}>
                          <span
                            className="category-badge"
                            style={{
                              background: `${transaction.category_color}20`,
                              color: transaction.category_color
                            }}
                          >
                            {transaction.category_name}
                          </span>
                        </td>
                        <td>{transaction.account_name}</td>
                        <td>
                          <span className={`amount ${transaction.is_income ? 'income' : 'expense'}`}>
                            {transaction.is_income ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td style={{ color: theme.textSecondary, fontSize: '0.875rem', wordWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100px', overflow: 'hidden' }}>
                          {transaction.note || '-'}
                        </td>
                        {showModifyTransaction && <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {showModifyTransaction && (
                            <>
                              <button
                                className="copy-btn"
                                onClick={() => handleCopyRow(transaction)}
                                title="Copy row"
                                style={{ padding: '0.4rem 0.6rem' }}
                              >
                                📋 Copy
                              </button>
                              <button
                                className="copy-btn"
                                onClick={() => handleEditTransaction(transaction)}
                                title="Edit row"
                                style={{ padding: '0.4rem 0.6rem', background: theme.secondary }}
                              >
                                ✏️ Edit
                              </button>
                            </>
                          )}
                        </td>}
                      </tr>
                    )}

                    {/* Edit Row */}
                    {showModifyTransaction && editingRowId === transaction.id && (
                      <tr style={{ background: '#fff3cd', borderRadius: '8px' }}>
                        <td colSpan="8" style={{ padding: '1.5rem', background: '#fff3cd' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>DATE & TIME</label>
                              <input
                                type="datetime-local"
                                className="form-input"
                                value={formatDateTimeForInput(editingData.date)}
                                onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>TITLE</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editingData.title}
                                onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>CATEGORY</label>
                              <select
                                className="form-select"
                                value={editingData.category_id}
                                onChange={(e) => setEditingData({ ...editingData, category_id: parseInt(e.target.value) })}
                                style={{ background: 'white' }}
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>ACCOUNT</label>
                              <select
                                className="form-select"
                                value={editingData.account_id}
                                onChange={(e) => setEditingData({ ...editingData, account_id: parseInt(e.target.value) })}
                                style={{ background: 'white' }}
                              >
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>AMOUNT</label>
                              <input
                                type="number"
                                className="form-input"
                                value={editingData.amount}
                                onChange={(e) => setEditingData({ ...editingData, amount: parseFloat(e.target.value) })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>NOTE</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editingData.note || ''}
                                onChange={(e) => setEditingData({ ...editingData, note: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>TYPE</label>
                              <select
                                className="form-select"
                                value={editingData.is_income ? 'income' : 'expense'}
                                onChange={(e) => setEditingData({ ...editingData, is_income: e.target.value === 'income' })}
                                style={{ background: 'white' }}
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={handleSaveTransaction}
                            >
                              Save Changes
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Copy Row */}
                    {showModifyTransaction && copiedRowId === transaction.id && (
                      <tr style={{ background: '#d4edda', borderRadius: '8px' }}>
                        <td colSpan="8" style={{ padding: '1.5rem', background: '#d4edda' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>DATE & TIME</label>
                              <input
                                type="datetime-local"
                                className="form-input"
                                value={formatDateTimeForInput(copiedData.date)}
                                onChange={(e) => setCopiedData({ ...copiedData, date: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>TITLE</label>
                              <input
                                type="text"
                                className="form-input"
                                value={copiedData.title}
                                onChange={(e) => setCopiedData({ ...copiedData, title: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>CATEGORY</label>
                              <select
                                className="form-select"
                                value={copiedData.category_id}
                                onChange={(e) => setCopiedData({ ...copiedData, category_id: parseInt(e.target.value) })}
                                style={{ background: 'white' }}
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>ACCOUNT</label>
                              <select
                                className="form-select"
                                value={copiedData.account_id}
                                onChange={(e) => setCopiedData({ ...copiedData, account_id: parseInt(e.target.value) })}
                                style={{ background: 'white' }}
                              >
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>AMOUNT</label>
                              <input
                                type="number"
                                className="form-input"
                                value={copiedData.amount}
                                onChange={(e) => setCopiedData({ ...copiedData, amount: parseFloat(e.target.value) })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>NOTE</label>
                              <input
                                type="text"
                                className="form-input"
                                value={copiedData.note || ''}
                                onChange={(e) => setCopiedData({ ...copiedData, note: e.target.value })}
                                style={{ background: 'white' }}
                              />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#155724' }}>TYPE</label>
                              <select
                                className="form-select"
                                value={copiedData.is_income ? 'income' : 'expense'}
                                onChange={(e) => setCopiedData({ ...copiedData, is_income: e.target.value === 'income' })}
                                style={{ background: 'white' }}
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={handleCancelCopy}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={handleSaveCopiedRow}
                            >
                              Save as New Transaction
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div className="table-card">
            <div className="table-header">
              <h2 className="table-title">Monthly Budgets</h2>
              <button className="btn btn-primary" onClick={() => setShowAddBudget(true)}>
                <Plus size={18} />
                Add Budget
              </button>
            </div>

            {budgets.map(budget => (
              <div key={budget.id} className="budget-card">
                <div className="budget-header">
                  <span
                    className="category-badge"
                    style={{
                      background: `${budget.category_color}20`,
                      color: budget.category_color
                    }}
                  >
                    {budget.category_name}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: '#a0a0c0', marginBottom: '0.25rem' }}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: budget.percentage > 100 ? '#ef4444' : '#fff' }}>
                      {budget.percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${budget.percentage > 80 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>
                {budget.percentage > 80 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}>
                    ⚠️ {budget.percentage > 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <>
            <div className="table-card">
              <h2 className="table-title">Top Merchants</h2>
              <table>
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Total Spent</th>
                    <th>Visits</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topMerchants.map((merchant, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600 }}>{merchant.merchant}</td>
                      <td className="amount expense">{formatCurrency(merchant.total)}</td>
                      <td>{merchant.visits}</td>
                      <td>{formatCurrency(merchant.average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <>
            <div className="table-card">
              <div className="table-header">
                <h2 className="table-title">Import Transactions from Excel</h2>
                <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={18} />
                  Choose File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportXLSX}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {importedData.length > 0 && (
                <>
                  {/* Show Raw Data Preview immediately after upload */}
                  {importedData[0]?._isRaw && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
                        📋 Raw Data Preview - All rows
                      </h3>
                      <div style={{ overflowX: 'auto', border: `1px solid ${theme.accentLight}`, borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ fontSize: '0.85rem' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.cardBg, zIndex: 1 }}>
                            <tr>
                              {Object.keys(importedData[0]).filter(k => k !== 'id' && k !== '_isRaw').map(col => (
                                <th key={col} style={{ padding: '0.75rem', fontWeight: 600, borderBottom: `2px solid ${theme.accentLight}` }}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importedData.map((row, idx) => (
                              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? theme.accentLighter : 'transparent' }}>
                                {Object.keys(row).filter(k => k !== 'id' && k !== '_isRaw').map(col => (
                                  <td key={`${idx}-${col}`} style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}` }}>
                                    {String(row[col]).substring(0, 50)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary }}>
                        Total rows in file: {importedData.length}
                      </p>
                    </div>
                  )}

                  {/* Show Mapped Data Preview by default after upload */}
                  {importedData[0]?._isRaw && (columnMapping.title || columnMapping.amount) && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: theme.primary }}>
                        ✨ Mapped Data Preview - How it will look after import (All rows)
                      </h3>
                      <div style={{
                        overflowX: 'auto',
                        border: `2px solid ${theme.primary}`,
                        borderRadius: '8px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: theme.accentLighter
                      }}>
                        <table style={{ fontSize: '0.85rem' }}>
                          <thead style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#5b21b6',
                            background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
                            zIndex: 100,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                          }}>
                            <tr>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                              <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawImportData.map((row, idx) => {
                              // Helper function to parse amount
                              const parseAmount = (value) => {
                                if (value === null || value === undefined || value === '') return 0;
                                let numStr = String(value).replace(/[₹$€£¥]/g, '').replace(/,/g, '').trim();
                                const parsed = parseFloat(numStr);
                                return isNaN(parsed) ? 0 : parsed;
                              };

                              // Helper function to determine income/expense
                              const determineIsIncome = (row) => {
                                if (columnMapping.debitCredit) {
                                  const debitCreditValue = String(row[columnMapping.debitCredit] || '').toLowerCase().trim();
                                  return debitCreditValue.includes('cr') || debitCreditValue.includes('credit');
                                }
                                return false;
                              };

                              // Get selected category and account
                              let importedCategoryId = selectedCategoryForImport;
                              let selectedCategory = null;

                              if (!importedCategoryId) {
                                // Try to find "Imported" category
                                const importedCategory = categories.find(c => c.name.toLowerCase() === 'imported');
                                if (importedCategory) {
                                  importedCategoryId = importedCategory.id;
                                  selectedCategory = importedCategory;
                                }
                              } else {
                                selectedCategory = categories.find(c => c.id === parseInt(importedCategoryId));
                              }
                              const selectedAccount = accounts.find(a => a.id === parseInt(selectedAccountForImport));

                              // Helper function to clean UPI titles
                              const cleanUpiTitle = (title) => {
                                if (!title) return '';

                                // Check if title starts with UPI/ or UPICC/ (case insensitive)
                                const upperTitle = title.toUpperCase();
                                if (upperTitle.startsWith('UPI/') || upperTitle.startsWith('UPICC/')) {
                                  // Split by / and get the second part (merchant name)
                                  const parts = title.split('/');
                                  if (parts.length >= 2 && parts[1]) {
                                    return parts[1].trim();
                                  }
                                }

                                return title;
                              };

                              const rawTitle = columnMapping.title ? (row[columnMapping.title] || '') : '';
                              const title = cleanUpiTitle(rawTitle);
                              const amount = columnMapping.amount ? parseAmount(row[columnMapping.amount]) : 0;
                              const categoryName = selectedCategory?.name || 'Imported';
                              const accountName = selectedAccount?.name || '(Select Account)';
                              const date = columnMapping.date ? row[columnMapping.date] : new Date().toISOString();
                              const isIncome = determineIsIncome(row);
                              const note = columnMapping.note ? (row[columnMapping.note] || '') : '';

                              return (
                                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontWeight: 600 }}>
                                    {title || <span style={{ color: '#ef4444' }}>(Missing)</span>}
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontWeight: 600, color: isIncome ? '#10b981' : '#ef4444' }}>
                                    {amount > 0 ? formatCurrency(amount) : <span style={{ color: '#ef4444' }}>(Missing)</span>}
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}` }}>
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      background: selectedCategory?.color ? `${selectedCategory.color}20` : '#9ca3af20',
                                      color: selectedCategory?.color || '#6b7280',
                                      fontSize: '0.8rem',
                                      fontWeight: 600
                                    }}>
                                      {selectedCategory?.icon || '📥'} {categoryName}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}` }}>
                                    {accountName}
                                    {!selectedAccountForImport && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>(Required)</span>}
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontSize: '0.8rem' }}>
                                    {date ? new Date(date).toLocaleDateString('en-IN') : 'Today'}
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}` }}>
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      background: isIncome ? '#d1fae5' : '#fee2e2',
                                      color: isIncome ? '#065f46' : '#991b1b',
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}>
                                      {isIncome ? '💰 Income' : '💸 Expense'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontSize: '0.8rem', color: theme.textSecondary }}>
                                    {note || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                        💡 This preview shows how your data will appear after mapping. Total rows to import: {rawImportData.length}
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Show Map Columns button if data is raw */}
                    {importedData[0]?._isRaw && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowColumnMapping(true)}
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', fontWeight: 'bold' }}
                      >
                        <Upload size={18} />
                        Map Columns to Import
                      </button>
                    )}

                    {/* Show import controls if data is mapped */}
                    {!importedData[0]?._isRaw && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedImports.size === importedData.length && importedData.length > 0}
                            onChange={handleSelectAllImports}
                          />
                          <span>Select All ({selectedImports.size}/{importedData.length})</span>
                        </label>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowImportConfirm(true)}
                          disabled={selectedImports.size === 0}
                          style={{ opacity: selectedImports.size === 0 ? 0.5 : 1, cursor: selectedImports.size === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          <FileDown size={18} />
                          Import Selected ({selectedImports.size})
                        </button>
                      </>
                    )}
                  </div>

                  {/* Show mapped data table (not raw) */}
                  {!importedData[0]?._isRaw && (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '50px' }}>Select</th>
                            <th>Title</th>
                            <th>Amount</th>
                            <th>Category</th>
                            <th>Account</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Note</th>
                            <th style={{ width: '100px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importedData.map((row, index) => (
                            <tr key={index} style={{ opacity: selectedImports.has(index) ? 1 : 0.7 }}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedImports.has(index)}
                                  onChange={() => handleImportCheckChange(index)}
                                />
                              </td>
                              {editingImportId === index ? (
                                <>
                                  <td>
                                    <input
                                      type="text"
                                      value={editingImportData.title}
                                      onChange={e => setEditingImportData({ ...editingImportData, title: e.target.value })}
                                      className="form-input"
                                      style={{ padding: '0.5rem', minWidth: '150px' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editingImportData.amount}
                                      onChange={e => setEditingImportData({ ...editingImportData, amount: parseFloat(e.target.value) })}
                                      className="form-input"
                                      style={{ padding: '0.5rem', minWidth: '100px' }}
                                    />
                                  </td>
                                  <td style={{ color: theme.textSecondary }}>
                                    {editingImportData.category_name || row.category_name}
                                  </td>
                                  <td style={{ color: theme.textSecondary }}>
                                    {editingImportData.account_name || row.account_name}
                                  </td>
                                  <td>
                                    <input
                                      type="datetime-local"
                                      value={formatDateTimeForInput(editingImportData.date)}
                                      onChange={e => setEditingImportData({ ...editingImportData, date: new Date(e.target.value).toISOString() })}
                                      className="form-input"
                                      style={{ padding: '0.5rem', minWidth: '150px' }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={editingImportData.is_income ? 'income' : 'expense'}
                                      onChange={e => setEditingImportData({ ...editingImportData, is_income: e.target.value === 'income' })}
                                      className="form-select"
                                      style={{ padding: '0.5rem', minWidth: '100px' }}
                                    >
                                      <option value="expense">Expense</option>
                                      <option value="income">Income</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      value={editingImportData.note}
                                      onChange={e => setEditingImportData({ ...editingImportData, note: e.target.value })}
                                      className="form-input"
                                      style={{ padding: '0.5rem', minWidth: '150px' }}
                                    />
                                  </td>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    <button onClick={handleSaveImportEdit} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>Save</button>
                                    <button onClick={handleCancelImportEdit} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', marginLeft: '0.5rem' }}>Cancel</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{row.title}</td>
                                  <td className={row.is_income ? 'amount income' : 'amount expense'}>{formatCurrency(row.amount)}</td>
                                  <td>{row.category_name}</td>
                                  <td>{row.account_name}</td>
                                  <td>{formatDate(row.date)}</td>
                                  <td>{row.is_income ? 'Income' : 'Expense'}</td>
                                  <td>{row.note}</td>
                                  <td>
                                    <button onClick={() => handleEditImportRow(index)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>Edit</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {importedData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: theme.textSecondary }}>
                  <Upload size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Click "Choose File" to upload an Excel file with your transactions</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                    Required columns: Title, Amount | Optional: Date, Debit/Credit, Note | Select Category & Account in the mapping screen
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Column Mapping Modal - Popup */}
        {showColumnMapping && rawImportData.length > 0 && (
          <div className="modal-overlay" onClick={() => setShowColumnMapping(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="modal-title">Map Excel Columns</h2>
                <button className="close-btn" onClick={() => setShowColumnMapping(false)}>
                  <X size={24} />
                </button>
              </div>

              <div>
              <p style={{ marginBottom: '1.5rem', color: theme.textSecondary }}>
                Columns have been automatically detected based on headers. You can modify the mapping below. All transactions will use the same Category and Account. We found <strong>{Object.keys(rawImportData[0]).length}</strong> column(s).
              </p>

              {/* Auto-detect Success Indicator */}
              {(columnMapping.title || columnMapping.amount) && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  backgroundColor: '#ecfdf5',
                  border: `2px solid #10b981`,
                  borderRadius: '8px',
                  color: '#047857',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  ✓ Auto-detected: {[columnMapping.title && 'Title', columnMapping.amount && 'Amount', columnMapping.date && 'Date', columnMapping.debitCredit && 'Debit/Credit', columnMapping.note && 'Note'].filter(Boolean).join(', ')}
                </div>
              )}

              {/* Mapping Controls Only - No Grids */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: columnMapping.title ? '#10b981' : '#ef4444' }}>
                    Title * {columnMapping.title && '(Auto-detected)'}
                  </label>
                  <select
                    className="form-select"
                    value={columnMapping.title}
                    onChange={e => setColumnMapping({ ...columnMapping, title: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {Object.keys(rawImportData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: columnMapping.amount ? '#10b981' : '#ef4444' }}>
                    Amount * {columnMapping.amount && '(Auto-detected)'}
                  </label>
                  <select
                    className="form-select"
                    value={columnMapping.amount}
                    onChange={e => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {Object.keys(rawImportData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: selectedCategoryForImport ? '#10b981' : '#ef4444' }}>
                    Category * {selectedCategoryForImport && '(Selected)'}
                  </label>
                  <select
                    className="form-select"
                    value={selectedCategoryForImport}
                    onChange={e => setSelectedCategoryForImport(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: selectedAccountForImport ? '#10b981' : '#ef4444' }}>
                    Account * {selectedAccountForImport && '(Selected)'}
                  </label>
                  <select
                    className="form-select"
                    value={selectedAccountForImport}
                    onChange={e => setSelectedAccountForImport(e.target.value)}
                  >
                    <option value="">Select account for all transactions</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: columnMapping.date ? '#10b981' : theme.textSecondary }}>
                    Date {columnMapping.date && '(Auto-detected)'}
                  </label>
                  <select
                    className="form-select"
                    value={columnMapping.date}
                    onChange={e => setColumnMapping({ ...columnMapping, date: e.target.value })}
                  >
                    <option value="">Optional - Select column</option>
                    {Object.keys(rawImportData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Debit/Credit (Automatic Income/Expense)</label>
                  <select
                    className="form-select"
                    value={columnMapping.debitCredit}
                    onChange={e => setColumnMapping({ ...columnMapping, debitCredit: e.target.value })}
                  >
                    <option value="">Optional - Select column</option>
                    {Object.keys(rawImportData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '0.25rem', color: theme.textSecondary }}>
                    Select a column with CR/DR or Credit/Debit values. Credit = Income, Debit = Expense
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Note</label>
                  <select
                    className="form-select"
                    value={columnMapping.note}
                    onChange={e => setColumnMapping({ ...columnMapping, note: e.target.value })}
                  >
                    <option value="">Optional - Select column</option>
                    {Object.keys(rawImportData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const columns = Object.keys(rawImportData[0]);
                    const autoMapping = autoDetectColumns(columns);
                    setColumnMapping(autoMapping);
                  }}
                >
                  Re-detect Columns
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowColumnMapping(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApplyColumnMapping}
                  style={{ gap: '0.5rem' }}
                >
                  <FileDown size={18} />
                  Continue to Review
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Import */}
        {showImportConfirm && (
          <div className="modal-overlay" onClick={() => setShowImportConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Confirm Import</h2>
                <button className="close-btn" onClick={() => setShowImportConfirm(false)}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ marginBottom: '1rem', color: theme.textSecondary }}>
                  You are about to import <strong>{selectedImports.size}</strong> transaction(s). This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowImportConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmImport}
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={() => {
            setShowAddTransaction(false);
            fetchTransactions();
            fetchOverview();
            fetchAnalytics();
          }}
        />
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <AddBudgetModal
          categories={categories.filter(c => c.type === 'expense')}
          onClose={() => setShowAddBudget(false)}
          onSuccess={() => {
            setShowAddBudget(false);
            fetchBudgets();
          }}
        />
      )}
    </div>
  );
}

// Add Transaction Modal Component
function AddTransactionModal({ categories, accounts, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    account_id: '',
    category_id: '',
    amount: '',
    title: '',
    note: '',
    date: new Date().toISOString().slice(0, 16),
    is_income: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          account_id: parseInt(formData.account_id),
          category_id: parseInt(formData.category_id),
          date: new Date(formData.date).toISOString()
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      alert('Failed to add transaction');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Transaction</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={formData.is_income}
              onChange={e => setFormData({ ...formData, is_income: e.target.value === 'true' })}
              required
            >
              <option value="false">Expense</option>
              <option value="true">Income</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              {categories.filter(c => c.type === (formData.is_income ? 'income' : 'expense')).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Account</label>
            <select
              className="form-select"
              value={formData.account_id}
              onChange={e => setFormData({ ...formData, account_id: e.target.value })}
              required
            >
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date & Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note (Optional)</label>
            <textarea
              className="form-textarea"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add any additional details..."
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}

// Add Budget Modal Component
function AddBudgetModal({ categories, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          category_id: parseInt(formData.category_id)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      alert('Failed to add budget');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Set Budget</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Budget Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Period</label>
            <select
              className="form-select"
              value={formData.period}
              onChange={e => setFormData({ ...formData, period: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Set Budget
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
