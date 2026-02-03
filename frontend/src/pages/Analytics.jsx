import React, { useState, useEffect } from 'react';
import { fetchAnalytics } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { themes } from '../config/themes';

function Analytics({ currentTheme }) {
  const [analytics, setAnalytics] = useState({
    categoryBreakdown: [],
    monthlyTrend: [],
    accountDistribution: [],
    topMerchants: []
  });

  const theme = themes[currentTheme];

  useEffect(() => {
    const loadData = async () => {
      const analyticsData = await fetchAnalytics();
      setAnalytics(analyticsData);
    };

    loadData();
  }, []);

  return (
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
  );
}

export default Analytics;
