// Constants and shared utilities

export const calculateTotalAmount = (transactionList) => {
  return transactionList.reduce((sum, transaction) => {
    if (transaction.category_name === 'Balance Correction') return sum;
    return sum + (transaction.is_income ? transaction.amount : -transaction.amount);
  }, 0);
};

export const calculateSumByAccount = (transactionList) => {
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

export const autoDetectColumns = (columns) => {
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

export const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  // Convert to string and remove common currency symbols and spaces
  let numStr = String(value)
    .replace(/[₹$€£¥]/g, '')
    .replace(/,/g, '')
    .trim();

  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0 : parsed;
};

export const determineIsIncome = (row, debitCreditColumn) => {
  if (debitCreditColumn) {
    const debitCreditValue = String(row[debitCreditColumn] || '').toLowerCase().trim();
    // Credit = Income, Debit = Expense
    return debitCreditValue.includes('cr') || debitCreditValue.includes('credit');
  }
  return false; // Default to expense if no debit/credit column
};

export const cleanUpiTitle = (title) => {
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
