import React, { useState, useEffect } from 'react';
import { Plus, FileDown, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchTransactions, fetchAccounts, fetchCategories, updateTransaction, createTransaction } from '../utils/api';
import { formatCurrency, formatDate, formatMonth, formatDateTimeForInput } from '../utils/formatters';
import { calculateTotalAmount, calculateSumByAccount } from '../utils/constants';
import { themes } from '../config/themes';

function Transactions({ currentTheme }) {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showModifyTransaction, setShowModifyTransaction] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [copiedRowId, setCopiedRowId] = useState(null);
  const [copiedData, setCopiedData] = useState({});

  const theme = themes[currentTheme];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const [txnData, accData, catData] = await Promise.all([
        fetchTransactions(searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate),
        fetchAccounts(),
        fetchCategories()
      ]);
      setTransactions(txnData);
      setAccounts(accData);
      setCategories(catData);
    };

    loadData();
  }, [searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate]);

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
      const response = await updateTransaction(editingRowId, {
        account_id: editingData.account_id,
        category_id: editingData.category_id,
        amount: editingData.amount,
        title: editingData.title,
        note: editingData.note,
        date: editingData.date,
        is_income: editingData.is_income,
        merchant: editingData.merchant
      });

      if (response.ok) {
        const updatedTxns = await fetchTransactions(searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate);
        setTransactions(updatedTxns);
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

  const handleSaveCopiedRow = async () => {
    try {
      const response = await createTransaction({
        account_id: copiedData.account_id,
        category_id: copiedData.category_id,
        amount: copiedData.amount,
        title: copiedData.title,
        note: copiedData.note,
        date: copiedData.date,
        is_income: copiedData.is_income,
        merchant: copiedData.merchant
      });

      if (response.ok) {
        const updatedTxns = await fetchTransactions(searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate);
        setTransactions(updatedTxns);
        setCopiedRowId(null);
        setCopiedData({});
        alert('Transaction copied and saved successfully!');
      }
    } catch (error) {
      console.error('Error creating copied transaction:', error);
      alert('Failed to save copied transaction');
    }
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

  // Filter and sort transactions
  const filteredTransactions = transactions.sort((a, b) => {
    let aVal, bVal;

    if (sortConfig.key === 'date') {
      aVal = new Date(a.date).getTime();
      bVal = new Date(b.date).getTime();
    } else if (sortConfig.key === 'month') {
      const aMonth = new Date(a.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const bMonth = new Date(b.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      aVal = new Date(aMonth).getMonth();
      bVal = new Date(bMonth).getMonth();
    } else if (sortConfig.key === 'amount') {
      aVal = parseFloat(a[sortConfig.key]);
      bVal = parseFloat(b[sortConfig.key]);
    } else {
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
    <div className="table-card">
      <div className="table-header">
        <h2 className="table-title">All Transactions</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
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

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={async () => {
            setShowAddTransaction(false);
            const updatedTxns = await fetchTransactions(searchTerm, filterCategory, filterAccount, filterStartDate, filterEndDate);
            setTransactions(updatedTxns);
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
      const response = await createTransaction({
        ...formData,
        amount: parseFloat(formData.amount),
        account_id: parseInt(formData.account_id),
        category_id: parseInt(formData.category_id),
        date: new Date(formData.date).toISOString()
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

export default Transactions;
