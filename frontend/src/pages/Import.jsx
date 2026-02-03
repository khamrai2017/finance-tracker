import React, { useState } from 'react';
import { Upload, X, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchAccounts, fetchCategories, fetchMerchantMappings, API_BASE } from '../utils/api';
import { formatCurrency, formatDate, formatDateTimeForInput } from '../utils/formatters';
import { parseAmount, determineIsIncome, cleanUpiTitle, autoDetectColumns } from '../utils/constants';
import { themes } from '../config/themes';

function Import({ currentTheme }) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [importedData, setImportedData] = useState([]);
  const [selectedImports, setSelectedImports] = useState(new Set());
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
  const [rawImportData, setRawImportData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [editingImportId, setEditingImportId] = useState(null);
  const [editingImportData, setEditingImportData] = useState({});
  const [merchantMappings, setMerchantMappings] = useState([]);

  const theme = themes[currentTheme];

  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  React.useEffect(() => {
    const loadData = async () => {
      const [accData, catData] = await Promise.all([
        fetchAccounts(),
        fetchCategories()
      ]);
      setAccounts(accData);
      setCategories(catData);
    };

    loadData();
  }, []);

  const handleImportXLSX = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showNotification('File is empty', 'error');
          return;
        }

        // Fetch merchant mappings for preview
        const mappings = await fetchMerchantMappings();
        setMerchantMappings(mappings);

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

  const handleApplyColumnMapping = async () => {
    // Use selected category (now required)
    const importedCategoryId = selectedCategoryForImport;

    // Validate that required columns are mapped
    if (!columnMapping.title || !columnMapping.amount || !selectedAccountForImport) {
      showNotification('Please map all required fields: Title, Amount, and select Account', 'error');
      return;
    }

    // Helper function to find better title and category from merchant mappings
    const findMerchantMapping = (amount, statementTitle) => {
      // Clean the statement title first
      const cleanedTitle = cleanUpiTitle(statementTitle);

      // Strategy 1: Exact Match (Amount + Title) - Best for recurring subscriptions or specific items
      let match = merchantMappings.find(m =>
        Math.abs(m.amount - amount) < 0.01 && // Allow small floating point differences
        (
          m.statement_title === statementTitle ||
          m.clean_title === cleanedTitle ||
          (m.mapped_title && m.mapped_title.toLowerCase() === cleanedTitle.toLowerCase())
        )
      );

      if (match) {
        return {
          title: match.mapped_title || cleanedTitle,
          category_id: match.category_id || null
        };
      }

      // Strategy 2: Fallback to Title Match Only (Ignore Amount) - To infer category for same merchant
      const fallbackMatch = merchantMappings.find(m =>
        m.category_id && ( // Only fallback if the match actually HAS a category
          m.statement_title === statementTitle ||
          m.clean_title === cleanedTitle ||
          (m.mapped_title && m.mapped_title.toLowerCase() === cleanedTitle.toLowerCase())
        )
      );

      if (fallbackMatch) {
        return {
          title: fallbackMatch.mapped_title || cleanedTitle, // Use mapped title if available
          category_id: fallbackMatch.category_id // Use category from previous transaction
        };
      }

      // If no match found, return the cleaned title and no category
      return {
        title: cleanedTitle,
        category_id: null
      };
    };

    const selectedAccount = accounts.find(a => a.id === parseInt(selectedAccountForImport));

    // Show loading notification
    showNotification('Applying merchant mappings...', 'info');

    // Process the data using the mapping with merchant title lookup
    const processedDataPromises = rawImportData.map(async (row, index) => {
      const rawTitle = row[columnMapping.title] || '';
      const amount = parseAmount(row[columnMapping.amount]);

      // Get better title and category from merchant mappings
      const mapping = findMerchantMapping(amount, rawTitle);

      // Try to find category ID if category name exists
      // Use mapped category_id if available
      let matchedCategoryId = mapping.category_id;
      let matchedCategoryName = '';

      if (matchedCategoryId) {
        const cat = categories.find(c => c.id === matchedCategoryId);
        if (cat) {
          matchedCategoryName = cat.name;
        }
      } else if (selectedCategoryForImport) {
        // Fallback to selected category if specified and mapping didn't find one
        const cat = categories.find(c => c.id === parseInt(selectedCategoryForImport));
        if (cat) {
          matchedCategoryId = cat.id;
          matchedCategoryName = cat.name;
        }
      }

      return {
        id: index,
        title: mapping.title,
        original_title: rawTitle, // Added for comparison as requested
        amount: amount,
        category_name: matchedCategoryName,
        category_id: matchedCategoryId,
        account_name: selectedAccount?.name || '',
        account_id: parseInt(selectedAccountForImport),
        date: columnMapping.date ? row[columnMapping.date] : new Date().toISOString(),
        is_income: determineIsIncome(row, columnMapping.debitCredit),
        note: columnMapping.note ? (row[columnMapping.note] || '') : ''
      };
    });

    try {
      const processedData = await Promise.all(processedDataPromises);
      setImportedData(processedData);
      setSelectedImports(new Set(processedData.map((_, i) => i)));
      setShowColumnMapping(false);
      setRawImportData([]);
      showNotification('Merchant mappings applied successfully!', 'success');
    } catch (error) {
      showNotification('Error applying merchant mappings: ' + error.message, 'error');
    }
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
    } catch (error) {
      showNotification('Import failed: ' + error.message, 'error');
    }
  };

  return (
    <>
      {notification && (
        <div className="notification-toast" style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          backgroundColor: notification.type === 'error' ? '#fee2e2' : notification.type === 'info' ? '#dbeafe' : '#dcfce7',
          color: notification.type === 'error' ? '#991b1b' : notification.type === 'info' ? '#1e40af' : '#166534',
          border: `2px solid ${notification.type === 'error' ? '#fca5a5' : notification.type === 'info' ? '#93c5fd' : '#86efac'}`,
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
                        <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Title</th>
                        <th style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#ffffff', borderBottom: '2px solid rgba(255,255,255,0.3)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mapped Title</th>
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
                        const rawTitle = columnMapping.title ? (row[columnMapping.title] || '') : '';
                        const amount = columnMapping.amount ? parseAmount(row[columnMapping.amount]) : 0;

                        // Apply merchant mapping to get better title and category
                        const findMerchantMapping = (amount, statementTitle) => {
                          const cleanedTitle = cleanUpiTitle(statementTitle);
                          const match = merchantMappings.find(m =>
                            Math.abs(m.amount - amount) < 0.01 && 
                            (m.statement_title === statementTitle || m.clean_title === cleanedTitle)
                          );
                          if (match) {
                            return {
                              title: match.mapped_title || cleanedTitle,
                              category: match.category_name || null
                            };
                          }
                          return {
                            title: cleanedTitle,
                            category: null
                          };
                        };

                        const mapping = findMerchantMapping(amount, rawTitle);
                        const mappedTitle = mapping.title;
                        const mappedCategoryName = mapping.category;

                        let selectedCategory = null;
                        if (mappedCategoryName) {
                          selectedCategory = categories.find(c => c.name.toLowerCase() === mappedCategoryName.toLowerCase());
                        }

                        const categoryName = selectedCategory?.name || '';
                        const accountName = accounts.find(a => a.id === parseInt(selectedAccountForImport))?.name || '(Select Account)';
                        const date = columnMapping.date ? row[columnMapping.date] : new Date().toISOString();
                        const isIncome = determineIsIncome(row, columnMapping.debitCredit);
                        const note = columnMapping.note ? (row[columnMapping.note] || '') : '';

                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
                            <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontSize: '0.8rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                              {rawTitle || <span style={{ color: '#ef4444' }}>(Missing)</span>}
                            </td>
                            <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontWeight: 600 }}>
                              {mappedTitle || <span style={{ color: '#ef4444' }}>(Missing)</span>}
                            </td>
                            <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}`, fontWeight: 600, color: isIncome ? '#10b981' : '#ef4444' }}>
                              {amount > 0 ? formatCurrency(amount) : <span style={{ color: '#ef4444' }}>(Missing)</span>}
                            </td>
                            <td style={{ padding: '0.75rem', borderBottom: `1px solid ${theme.accentLight}` }}>
                              {categoryName ? (
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
                              ) : (
                                <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Select Category</span>
                              )}
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
                <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                  ✅ Merchant mappings from the database have been applied to show better titles and categories where available.
                </p>
                <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                  ⚠️ Rows marked "Select Category" require you to choose a category before importing.
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
                      <th>Original Title</th>
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
                            <td style={{ fontSize: '0.75rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                              {row.original_title || '-'}
                            </td>
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
                            <td>
                              <select
                                value={editingImportData.category_id || ''}
                                onChange={e => {
                                  const cat = categories.find(c => c.id === parseInt(e.target.value));
                                  setEditingImportData({
                                    ...editingImportData,
                                    category_id: cat?.id || null,
                                    category_name: cat?.name || ''
                                  });
                                }}
                                className="form-select"
                                style={{ padding: '0.5rem', minWidth: '150px' }}
                              >
                                <option value="">-- Select Category --</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                              </select>
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
                            <td style={{ fontSize: '0.75rem', color: theme.textSecondary, fontStyle: 'italic' }}>
                              {row.original_title || '-'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{row.title}</td>
                            <td className={row.is_income ? 'amount income' : 'amount expense'}>{formatCurrency(row.amount)}</td>
                            <td>
                              {row.category_name ? (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  background: categories.find(c => c.id === row.category_id)?.color + '20' || '#9ca3af20',
                                  color: categories.find(c => c.id === row.category_id)?.color || '#6b7280',
                                  fontSize: '0.8rem',
                                  fontWeight: 600
                                }}>
                                  {categories.find(c => c.id === row.category_id)?.icon || '📥'} {row.category_name}
                                </span>
                              ) : (
                                <span style={{ color: '#f59e0b', fontSize: '0.86rem', fontWeight: 700 }}>⚠️ Select Cat</span>
                              )}
                            </td>
                            <td>
                              {row.account_name}
                              {!row.account_id && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>(Req)</span>}
                            </td>
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
                Columns have been automatically detected based on headers. You can modify the mapping below. All transactions will use the same Account. Merchant titles and Categories will be automatically applied from your database mappings. We found <strong>{Object.keys(rawImportData[0]).length}</strong> column(s).
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
                  <label className="form-label" style={{ color: selectedCategoryForImport ? '#10b981' : theme.textSecondary }}>
                    Category (Fallback) {selectedCategoryForImport && '(Selected)'}
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
    </>
  );
}

export default Import;
