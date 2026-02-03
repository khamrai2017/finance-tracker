import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchBudgets, fetchCategories, API_BASE } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { themes } from '../config/themes';

function Budgets({ currentTheme }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddBudget, setShowAddBudget] = useState(false);

  const theme = themes[currentTheme];

  useEffect(() => {
    const loadData = async () => {
      const [budgetData, categoryData] = await Promise.all([
        fetchBudgets(),
        fetchCategories()
      ]);
      setBudgets(budgetData);
      setCategories(categoryData.filter(c => c.type === 'expense'));
    };

    loadData();
  }, []);

  return (
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

      {/* Add Budget Modal */}
      {showAddBudget && (
        <AddBudgetModal
          categories={categories}
          onClose={() => setShowAddBudget(false)}
          onSuccess={async () => {
            setShowAddBudget(false);
            const updatedBudgets = await fetchBudgets();
            setBudgets(updatedBudgets);
          }}
        />
      )}
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

export default Budgets;
