import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { themes } from '../config/themes';

function Navigation({ currentTheme, setCurrentTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const theme = themes[currentTheme];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path === '/transactions') return 'transactions';
    if (path === '/budgets') return 'budgets';
    if (path === '/analytics') return 'analytics';
    if (path === '/import') return 'import';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'transactions', label: 'Transactions', path: '/transactions' },
    { id: 'budgets', label: 'Budgets', path: '/budgets' },
    { id: 'analytics', label: 'Analytics', path: '/analytics' },
    { id: 'import', label: 'Import', path: '/import' }
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">FinanceFlow</div>
        <nav className="nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span>{item.label}</span>
            </button>
          ))}
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
  );
}

export default Navigation;
