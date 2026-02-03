import React, { useState } from 'react';
import { Upload, X, FileDown, GitCompare, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchAccounts, fetchCategories, fetchMerchantMappings, API_BASE } from '../utils/api';
import { formatCurrency, formatDate, formatDateTimeForInput } from '../utils/formatters';
import { parseAmount, determineIsIncome, cleanUpiTitle, autoDetectColumns } from '../utils/constants';
import { themes } from '../config/themes';

function Utility({ currentTheme, defaultSection = 'import', hideSelector = false }) {
  const [selectedUtility, setSelectedUtility] = useState(defaultSection);

  // Hide selector when used as a wrapper page
  const showSelector = !hideSelector && defaultSection === 'import';
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
  // Match Transactions state
  const [matchAccountId, setMatchAccountId] = useState('');
  const [matchStartDate, setMatchStartDate] = useState('');
  const [matchEndDate, setMatchEndDate] = useState('');
  const [matchedTransactions, setMatchedTransactions] = useState([]);
  const [databaseTransactions, setDatabaseTransactions] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editingMatchData, setEditingMatchData] = useState({});

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

  React.useEffect(() => {
    if (selectedUtility === 'match') {
      // Reset when switching to match tab
      setMatchedTransactions([]);
      setDatabaseTransactions([]);
    }
  }, [selectedUtility]);

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

        // For Match Transactions: Auto-process the data with merchant mappings
        if (selectedUtility === 'match') {
          // Helper function to find better title and category from merchant mappings
          const findMerchantMapping = (amount, statementTitle) => {
            if (!statementTitle) return { title: '-', category: null };

            const cleanedTitle = cleanUpiTitle(statementTitle);

            // Strategy 1: Exact Match (Amount + Title)
            let match = merchantMappings.find(m =>
              Math.abs(m.amount - amount) < 0.01 &&
              (m.statement_title === statementTitle || m.clean_title === cleanedTitle)
            );

            // Strategy 2: Title contains match
            if (!match) {
              match = merchantMappings.find(m =>
                Math.abs(m.amount - amount) < 0.01 && m.clean_title &&
                (cleanedTitle.includes(m.clean_title) || m.clean_title.includes(cleanedTitle))
              );
            }

            // Strategy 3: Amount match only (last resort)
            if (!match) {
              match = merchantMappings.find(m => Math.abs(m.amount - amount) < 0.01);
            }

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

          // Process the imported data with merchant mappings
          const processedData = jsonData.map((row, index) => {
            const rawTitle = row[autoMapping.title] || '';
            const amount = parseAmount(row[autoMapping.amount]);
            const dateValue = row[autoMapping.date];
            const isIncome = determineIsIncome(row, autoMapping.debitCredit);
            const note = row[autoMapping.note] || '';

            // Apply merchant mapping
            const mapping = findMerchantMapping(amount, rawTitle);

            // Find category
            let categoryId = null;
            let categoryName = '';
            if (mapping.category) {
              const cat = categories.find(c => c.name.toLowerCase() === mapping.category.toLowerCase());
              if (cat) {
                categoryId = cat.id;
                categoryName = cat.name;
              }
            }

            return {
              id: index,
              title: mapping.title,
              original_title: rawTitle,
              amount: amount,
              category_name: categoryName,
              category_id: categoryId,
              account_name: supermoneyAccount?.name || '',
              account_id: supermoneyAccount?.id || null,
              date: dateValue || new Date().toISOString(),
              is_income: isIncome,
              note: note,
              _isProcessed: true
            };
          });

          setImportedData(processedData);
          setSelectedImports(new Set(processedData.map((_, i) => i)));
          showNotification(`Imported ${processedData.length} transactions with merchant mappings applied`, 'success');
        } else {
          // For Import Transactions: Load grid with raw data
          const rawGridData = jsonData.map((row, index) => ({
            id: index,
            ...row,
            _isRaw: true // Flag to indicate this is raw unmapped data
          }));
          setImportedData(rawGridData);
          setSelectedImports(new Set(rawGridData.map((_, i) => i)));

          // Don't show mapping modal immediately - user must click "Map Columns to Import" button
          setShowColumnMapping(false);
        }
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

  // New Match Transactions Functions
  const loadTransactionsForMatching = async () => {
    if (!matchAccountId || !matchStartDate || !matchEndDate) {
      showNotification('Please select account and date range', 'error');
      return;
    }

    setMatchLoading(true);
    try {
      const response = await fetch(`${API_BASE}/transactions?account_id=${matchAccountId}`);
      const allTrans = await response.json();

      // Filter by date range
      const startDate = new Date(matchStartDate);
      const endDate = new Date(matchEndDate);
      const filtered = allTrans.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
      });

      setDatabaseTransactions(filtered);
      showNotification(`Loaded ${filtered.length} transactions from database`, 'success');
    } catch (error) {
      showNotification('Failed to load transactions: ' + error.message, 'error');
    } finally {
      setMatchLoading(false);
    }
  };

  const compareTransactions = () => {
    if (importedData.length === 0 || databaseTransactions.length === 0) {
      showNotification('Please load imported data and database transactions first', 'error');
      return;
    }

    setMatchLoading(true);
    const matched = importedData.map(imported => {
      // Find matching transaction in database
      const dbMatch = databaseTransactions.find(db => {
        // Add null/undefined checks before calling toLowerCase()
        if (!imported.title || !db.title) return false;

        const titleMatch = imported.title.toLowerCase().includes(db.title.toLowerCase()) ||
          db.title.toLowerCase().includes(imported.title.toLowerCase());
        const amountMatch = Math.abs(imported.amount - db.amount) < 0.01;
        return titleMatch && amountMatch;
      });

      return {
        id: `imported_${Math.random()}`,
        ...imported,
        matched: !!dbMatch,
        matchedTransaction: dbMatch
      };
    });

    setMatchedTransactions(matched);
    const unmatchedCount = matched.filter(m => !m.matched).length;
    showNotification(`Comparison complete: ${matched.length - unmatchedCount} matched, ${unmatchedCount} unmatched`, 'success');
    setMatchLoading(false);
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'DELETE'
      });

      // Remove from matched list
      setMatchedTransactions(prev => prev.filter(t => t.id !== transactionId));
      showNotification('Transaction deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete transaction: ' + error.message, 'error');
    }
  };

  const handleSaveMatchEdit = async () => {
    if (!editingMatchId) return;

    try {
      // Check if it's an imported or database transaction
      if (editingMatchId.startsWith('imported_')) {
        // For imported, update in the matched list
        setMatchedTransactions(prev =>
          prev.map(t => t.id === editingMatchId ? { ...t, ...editingMatchData } : t)
        );
        showNotification('Transaction updated', 'success');
      } else {
        // For database, save to API
        await fetch(`${API_BASE}/transactions/${editingMatchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingMatchData)
        });

        setMatchedTransactions(prev =>
          prev.map(t => t.id === editingMatchId ? { ...t, ...editingMatchData } : t)
        );
        showNotification('Transaction saved successfully', 'success');
      }

      setEditingMatchId(null);
      setEditingMatchData({});
    } catch (error) {
      showNotification('Failed to save transaction: ' + error.message, 'error');
    }
  };

  const extractDateRangeFromImportedData = () => {
    if (importedData.length === 0) {
      showNotification('No imported data to extract dates from', 'error');
      return;
    }

    try {
      // Helper function to parse different date formats
      const parseDate = (dateValue) => {
        if (!dateValue) return null;

        // If already a Date object
        if (dateValue instanceof Date) {
          return !isNaN(dateValue.getTime()) ? dateValue : null;
        }

        // If it's a number (Excel serial date)
        if (typeof dateValue === 'number') {
          const date = new Date((dateValue - 25569) * 86400 * 1000);
          return !isNaN(date.getTime()) ? date : null;
        }

        // If it's a string, try different formats
        if (typeof dateValue === 'string') {
          const dateStr = dateValue.trim();

          // Try dd-mm-yyyy format (with -, /, or . separators)
          const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
          if (ddmmyyyyMatch) {
            const day = parseInt(ddmmyyyyMatch[1]);
            const month = parseInt(ddmmyyyyMatch[2]);
            const year = parseInt(ddmmyyyyMatch[3]);

            // Validate day and month
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
              const date = new Date(year, month - 1, day);
              return !isNaN(date.getTime()) ? date : null;
            }
          }

          // Try yyyy-mm-dd format (ISO)
          const isoMatch = dateStr.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
          if (isoMatch) {
            const year = parseInt(isoMatch[1]);
            const month = parseInt(isoMatch[2]);
            const day = parseInt(isoMatch[3]);

            // Validate day and month
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
              const date = new Date(year, month - 1, day);
              return !isNaN(date.getTime()) ? date : null;
            }
          }

          // Try standard JavaScript date parsing as fallback
          const date = new Date(dateStr);
          return !isNaN(date.getTime()) ? date : null;
        }

        return null;
      };

      // Extract all dates from imported data
      const dates = importedData
        .map(row => parseDate(row.date))
        .filter(date => date !== null);

      if (dates.length === 0) {
        showNotification('Could not find valid dates in imported data. Ensure your date column contains dates in dd-mm-yyyy, yyyy-mm-dd, or other common formats.', 'error');
        return;
      }

      // Find min and max dates
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Format dates as YYYY-MM-DD for input fields
      const startDateStr = minDate.toISOString().split('T')[0];
      const endDateStr = maxDate.toISOString().split('T')[0];

      // Set the date range
      setMatchStartDate(startDateStr);
      setMatchEndDate(endDateStr);

      showNotification(`Date range set: ${startDateStr} to ${endDateStr} (${dates.length} dates found)`, 'success');
    } catch (error) {
      showNotification('Error extracting dates: ' + error.message, 'error');
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

      {/* Utilities Selector - Only show when not in wrapper mode */}
      {showSelector && (
        <div className="table-card" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
          <div className="table-header">
            <h2 className="table-title">Select a Utility</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', padding: '1rem 2px' }}>
            {/* Import Transactions Utility */}
            <div
              onClick={() => setSelectedUtility('import')}
              style={{
                padding: '1rem 0.75rem',
                borderRadius: '16px',
                border: selectedUtility === 'import' ? `3px solid ${theme.primary}` : `2px solid ${theme.accentLight}`,
                background: selectedUtility === 'import' ? `${theme.primary}15` : theme.cardBg,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedUtility === 'import' ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: selectedUtility === 'import' ? `0 8px 24px ${theme.primary}30` : '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                if (selectedUtility !== 'import') {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUtility !== 'import') {
                  e.currentTarget.style.borderColor = theme.accentLight;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${theme.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Upload size={28} color={theme.primary} />
                </div>
                <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem', fontWeight: 700 }}>Import Transactions</h3>
              </div>
              <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
                Import financial data from Excel files with intelligent column mapping and merchant matching.
              </p>
            </div>

            {/* Match Transactions Utility */}
            <div
              onClick={() => setSelectedUtility('match')}
              style={{
                padding: '1rem 0.75rem',
                borderRadius: '16px',
                border: selectedUtility === 'match' ? `3px solid ${theme.primary}` : `2px solid ${theme.accentLight}`,
                background: selectedUtility === 'match' ? `${theme.primary}15` : theme.cardBg,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedUtility === 'match' ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: selectedUtility === 'match' ? `0 8px 24px ${theme.primary}30` : '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                if (selectedUtility !== 'match') {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUtility !== 'match') {
                  e.currentTarget.style.borderColor = theme.accentLight;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${theme.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <GitCompare size={28} color={theme.primary} />
                </div>
                <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem', fontWeight: 700 }}>Match Transactions</h3>
              </div>
              <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
                Find and match duplicate or similar transactions across your accounts to consolidate data.
              </p>
            </div>

            {/* Tag Person Utility */}
            <div
              onClick={() => setSelectedUtility('tag')}
              style={{
                padding: '1rem 0.75rem',
                borderRadius: '16px',
                border: selectedUtility === 'tag' ? `3px solid ${theme.primary}` : `2px solid ${theme.accentLight}`,
                background: selectedUtility === 'tag' ? `${theme.primary}15` : theme.cardBg,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedUtility === 'tag' ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: selectedUtility === 'tag' ? `0 8px 24px ${theme.primary}30` : '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                if (selectedUtility !== 'tag') {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.primary}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUtility !== 'tag') {
                  e.currentTarget.style.borderColor = theme.accentLight;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${theme.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Tag size={28} color={theme.primary} />
                </div>
                <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem', fontWeight: 700 }}>Tag Person</h3>
              </div>
              <p style={{ margin: 0, color: theme.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
                Tag and categorize people involved in transactions for better tracking and insights.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Transactions Content */}
      {selectedUtility === 'import' && (
        <div className="table-card">

          {importedData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: theme.textSecondary }}>
              <Upload size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', color: theme.text, marginBottom: '1rem' }}>Import Transactions from Excel</h3>
              <p style={{ marginBottom: '2rem' }}>Import your financial data from an Excel file with intelligent column mapping and merchant matching.</p>
              <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0, fontSize: '1rem', padding: '0.75rem 2rem' }}>
                <Upload size={20} />
                Choose File to Import
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportXLSX}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
                Required columns: Title, Amount | Optional: Date, Debit/Credit, Note
              </p>
            </div>
          )}

          {importedData.length > 0 && (
            <>
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: theme.accentLight, borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: theme.text, fontWeight: 600 }}>
                  📥 Importing from Excel
                </h3>
                <p style={{ marginBottom: '1rem', color: theme.textSecondary }}>
                  Follow the steps below to complete your import. You can adjust column mappings and edit individual transactions before importing.
                </p>
                <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
                  <Upload size={18} />
                  Choose Different File
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportXLSX}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
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
                Columns have been automatically detected based on headers. You can modify the mapping below. All transactions will use the same Account. Merchant titles and Categories will be automatically applied from your database mappings. We found <strong>{Object.keys(rawImportData[0] || {}).length}</strong> column(s).
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

      {/* Match Transactions Content */}
      {selectedUtility === 'match' && (
        <div className="table-card">
          <div className="table-header">
            <h2 className="table-title">Match Transactions</h2>
          </div>
          <div style={{ padding: '2rem' }}>
            {/* Step 1: Import File & Select Filters */}
            {matchedTransactions.length === 0 && (
              <div>
                {/* Import Section - Always Visible */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: theme.surfaceLight, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  <h3 style={{ color: theme.text, marginBottom: '1rem' }}>Step 1: Import Excel File</h3>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.text, cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleImportXLSX}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Choose Excel/CSV file</span>
                    </label>
                    {importedData.length > 0 && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>✓ {importedData.length} transactions imported</span>
                    )}
                  </div>
                </div>

                {/* Display Imported Data Table with Merchant Mappings Applied */}
                {importedData.length > 0 && (
                  <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: theme.surfaceLight, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    <h3 style={{ color: theme.text, marginBottom: '1rem' }}>📋 Imported Data Preview (with Merchant Mappings)</h3>
                    <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: theme.primary, color: 'white', zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Title</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Amount</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Date</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Category</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Type</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: `2px solid ${theme.border}` }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importedData.map((row, idx) => {
                            // Get the original raw title for merchant mapping lookup
                            const rawTitle = row.original_title || row.title || '';
                            const amount = row.amount || 0;

                            // Apply merchant mapping to get better title and category
                            const findMerchantMapping = (amount, statementTitle) => {
                              if (!statementTitle) return { title: '-', category: null };

                              const cleanedTitle = cleanUpiTitle(statementTitle);

                              // Strategy 1: Exact Match (Amount + Title)
                              let match = merchantMappings.find(m =>
                                Math.abs(m.amount - amount) < 0.01 &&
                                (m.statement_title === statementTitle || m.clean_title === cleanedTitle)
                              );

                              // Strategy 2: Title contains match
                              if (!match) {
                                match = merchantMappings.find(m =>
                                  Math.abs(m.amount - amount) < 0.01 && m.clean_title &&
                                  (cleanedTitle.includes(m.clean_title) || m.clean_title.includes(cleanedTitle))
                                );
                              }

                              // Strategy 3: Amount match only (last resort)
                              if (!match) {
                                match = merchantMappings.find(m => Math.abs(m.amount - amount) < 0.01);
                              }

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

                            const categoryName = selectedCategory?.name || mappedCategoryName || '';

                            return (
                              <tr
                                key={idx}
                                style={{
                                  backgroundColor: idx % 2 === 0 ? theme.surface : 'transparent',
                                  borderBottom: `1px solid ${theme.accentLight}`,
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = theme.accentLight;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? theme.surface : 'transparent';
                                }}
                              >
                                <td style={{ padding: '0.75rem', color: theme.text, fontWeight: 500, maxWidth: '90px', wordWrap: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
                                  {mappedTitle || '-'}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: row.is_income ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                  {formatCurrency(amount || 0)}
                                </td>
                                <td style={{ padding: '0.75rem', color: theme.textSecondary, fontSize: '0.85rem' }}>
                                  {row.date ? formatDate(row.date) : '-'}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  {categoryName ? (
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      backgroundColor: selectedCategory?.color ? `${selectedCategory.color}20` : '#9ca3af20',
                                      color: selectedCategory?.color || '#6b7280',
                                      fontSize: '0.8rem',
                                      fontWeight: 600
                                    }}>
                                      {selectedCategory?.icon || '📥'} {categoryName}
                                    </span>
                                  ) : (
                                    <span style={{ color: theme.textSecondary }}>-</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: row.is_income ? '#d1fae5' : '#fee2e2',
                                    color: row.is_income ? '#065f46' : '#991b1b',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    {row.is_income ? '💰 Income' : '💸 Expense'}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', color: theme.textSecondary, fontSize: '0.85rem' }}>
                                  {row.note || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: theme.textSecondary }}>
                      Total rows: <strong>{importedData.length}</strong>
                    </p>
                  </div>
                )}

                {importedData.length > 0 && (
                  <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: theme.surfaceLight, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    <h3 style={{ color: theme.text, marginBottom: '1rem' }}>Step 2: Select Account & Date Range</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text, fontSize: '0.875rem' }}>Account</label>
                        <select
                          value={matchAccountId}
                          onChange={(e) => setMatchAccountId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: theme.surface,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px'
                          }}
                        >
                          <option value="">Select Account</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text, fontSize: '0.875rem' }}>Start Date</label>
                        <input
                          type="date"
                          value={matchStartDate}
                          onChange={(e) => setMatchStartDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: theme.surface,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: theme.text, fontSize: '0.875rem' }}>End Date</label>
                        <input
                          type="date"
                          value={matchEndDate}
                          onChange={(e) => setMatchEndDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: theme.surface,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={extractDateRangeFromImportedData}
                        className="btn btn-secondary"
                        title="Automatically set date range from imported data"
                      >
                        📅 Auto-Set Dates from Import
                      </button>
                    </div>
                    <button
                      onClick={loadTransactionsForMatching}
                      disabled={matchLoading}
                      className="btn btn-primary"
                      style={{ marginRight: '1rem' }}
                    >
                      {matchLoading ? 'Loading...' : `Load Transactions (${databaseTransactions.length})`}
                    </button>
                    {databaseTransactions.length > 0 && (
                      <button
                        onClick={compareTransactions}
                        className="btn btn-primary"
                        style={{ backgroundColor: theme.success || '#28a745' }}
                      >
                        <GitCompare size={18} style={{ marginRight: '0.5rem' }} />
                        Compare & Match
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Match Results */}
            {matchedTransactions.length > 0 && (
              <div>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: theme.text, marginBottom: '0.5rem' }}>Match Results</h3>
                    <p style={{ fontSize: '0.875rem', color: theme.textSecondary }}>
                      {matchedTransactions.filter(t => !t.matched).length} unmatched rows out of {matchedTransactions.length}
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.text, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showOnlyUnmatched}
                      onChange={(e) => setShowOnlyUnmatched(e.target.checked)}
                    />
                    Show only unmatched
                  </label>
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.text, fontWeight: '500' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.text, fontWeight: '500', maxWidth: '90px', wordWrap: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>Title</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.text, fontWeight: '500' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.text, fontWeight: '500' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', color: theme.text, fontWeight: '500' }}>Matched With</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', color: theme.text, fontWeight: '500' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedTransactions
                        .filter(t => !showOnlyUnmatched || !t.matched)
                        .map((transaction, idx) => (
                          <tr
                            key={transaction.id}
                            style={{
                              backgroundColor: transaction.matched ? theme.surface : '#ffebee',
                              borderBottom: `1px solid ${theme.border}`,
                              transition: 'all 0.2s'
                            }}
                          >
                            <td style={{ padding: '0.75rem', color: theme.text }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                backgroundColor: transaction.matched ? '#d4edda' : '#ffcdd2',
                                color: transaction.matched ? '#155724' : '#c62828'
                              }}>
                                {transaction.matched ? '✓ Matched' : '✗ Unmatched'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', color: theme.text }}>
                              {editingMatchId === transaction.id ? (
                                <input
                                  type="text"
                                  value={editingMatchData.title || transaction.title}
                                  onChange={(e) => setEditingMatchData({ ...editingMatchData, title: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    backgroundColor: theme.surface,
                                    color: theme.text,
                                    border: `1px solid ${theme.primary}`,
                                    borderRadius: '4px'
                                  }}
                                />
                              ) : (
                                transaction.title
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', color: theme.text }}>
                              {editingMatchId === transaction.id ? (
                                <input
                                  type="number"
                                  value={editingMatchData.amount || transaction.amount}
                                  onChange={(e) => setEditingMatchData({ ...editingMatchData, amount: parseFloat(e.target.value) })}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    backgroundColor: theme.surface,
                                    color: theme.text,
                                    border: `1px solid ${theme.primary}`,
                                    borderRadius: '4px'
                                  }}
                                />
                              ) : (
                                formatCurrency(transaction.amount)
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', color: theme.text }}>
                              {editingMatchId === transaction.id ? (
                                <input
                                  type="date"
                                  value={editingMatchData.date || transaction.date}
                                  onChange={(e) => setEditingMatchData({ ...editingMatchData, date: e.target.value })}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    backgroundColor: theme.surface,
                                    color: theme.text,
                                    border: `1px solid ${theme.primary}`,
                                    borderRadius: '4px'
                                  }}
                                />
                              ) : (
                                formatDate(transaction.date)
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', color: theme.text, fontSize: '0.875rem' }}>
                              {transaction.matched && transaction.matchedTransaction ? (
                                <div>
                                  <p><strong>{transaction.matchedTransaction.title}</strong></p>
                                  <p style={{ color: theme.textSecondary }}>{formatCurrency(transaction.matchedTransaction.amount)}</p>
                                </div>
                              ) : (
                                <span style={{ color: theme.textSecondary }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              {editingMatchId === transaction.id ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={handleSaveMatchEdit}
                                    style={{
                                      padding: '0.4rem 0.8rem',
                                      backgroundColor: theme.primary,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMatchId(null);
                                      setEditingMatchData({});
                                    }}
                                    style={{
                                      padding: '0.4rem 0.8rem',
                                      backgroundColor: theme.border,
                                      color: theme.text,
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => {
                                      setEditingMatchId(transaction.id);
                                      setEditingMatchData(transaction);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.8rem',
                                      backgroundColor: theme.accentLight,
                                      color: theme.primary,
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    style={{
                                      padding: '0.4rem 0.8rem',
                                      backgroundColor: '#ffcdd2',
                                      color: '#c62828',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => {
                    setMatchedTransactions([]);
                    setImportedData([]);
                    setDatabaseTransactions([]);
                    setMatchAccountId('');
                    setMatchStartDate('');
                    setMatchEndDate('');
                    setShowOnlyUnmatched(false);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: theme.border,
                    color: theme.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Start New Comparison
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tag Person Content */}
      {selectedUtility === 'tag' && (
        <div className="table-card">
          <div className="table-header">
            <h2 className="table-title">Tag Person Against Transaction</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: theme.textSecondary }}>
            <Tag size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', color: theme.text, marginBottom: '1rem' }}>Tag People to Transactions</h3>
            <p style={{ marginBottom: '2rem' }}>
              Associate people or parties with specific transactions. Track who you've paid, who paid you, and manage personal finance records with more detail.
            </p>
            <button
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              <Tag size={20} />
              Manage Tags
            </button>
            <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: theme.textSecondary }}>
              Coming soon: Tag management interface with bulk operations
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default Utility;
