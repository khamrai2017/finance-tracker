import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon } from 'lucide-react';
import { fetchOverview, fetchAnalytics } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { themes } from '../config/themes';

function Dashboard({ currentTheme }) {
  const [overview, setOverview] = useState({});
  const [analytics, setAnalytics] = useState({
    categoryBreakdown: [],
    monthlyTrend: [],
    accountDistribution: [],
    topMerchants: []
  });

  const theme = themes[currentTheme];

  useEffect(() => {
    const loadData = async () => {
      const overviewData = await fetchOverview();
      setOverview(overviewData);
      
      const analyticsData = await fetchAnalytics();
      setAnalytics(analyticsData);
    };

    loadData();
  }, []);

  return (
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
  );
}

export default Dashboard;
