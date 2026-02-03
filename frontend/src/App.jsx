import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Analytics from './pages/Analytics';
import Import from './pages/Import';
import { themes } from './config/themes';

// Global Styles Component
function GlobalStyles({ theme }) {
  return (
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
        content: ' â†•';
        opacity: 0.5;
      }

      th.sorted-asc::after {
        content: ' â†‘';
        opacity: 1;
        color: ${theme.primary};
      }

      th.sorted-desc::after {
        content: ' â†“';
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
  );
}

const formatDate = (date) => {
  // Parse the date and convert to IST
  const dateObj = new Date(date);
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = istFormatter.formatToParts(dateObj);
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;

  return `${day}/${month}/${year}`;
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

// Main App Component
function App() {
  const [currentTheme, setCurrentTheme] = useState('facebookInspired');
  const theme = themes[currentTheme];

  return (
    <BrowserRouter>
      <div style={{ background: theme.bg, minHeight: '100vh', position: 'relative' }}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, ${theme.accentLight} 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, ${theme.accentLight} 0%, transparent 40%),
            radial-gradient(circle at 40% 80%, ${theme.accentLighter} 0%, transparent 40%)
          `,
          pointerEvents: 'none',
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Navigation currentTheme={currentTheme} setCurrentTheme={setCurrentTheme} />
          
          <Routes>
            <Route path="/" element={<Dashboard currentTheme={currentTheme} />} />
            <Route path="/transactions" element={<Transactions currentTheme={currentTheme} />} />
            <Route path="/budgets" element={<Budgets currentTheme={currentTheme} />} />
            <Route path="/analytics" element={<Analytics currentTheme={currentTheme} />} />
            <Route path="/import" element={<Import currentTheme={currentTheme} />} />
          </Routes>
        </div>
      </div>
      <GlobalStyles theme={theme} />
    </BrowserRouter>
  );
}

export default App;

