import React, { useState, useEffect, useCallback, useRef } from 'react';
import { USERS, ADMIN_USER, CATEGORY_COLORS, USER_COLORS } from '../constants';
import { fetchReportSummary, fetchEntries } from '../api';
import { formatDuration, currentMonthISO, exportCSV } from '../utils';

export default function Report({ activeUser, isAdmin }) {
  const [month, setMonth] = useState(currentMonthISO());
  const [selectedUser, setSelectedUser] = useState(isAdmin ? '' : activeUser);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queryUser = isAdmin ? (selectedUser || activeUser) : activeUser;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await fetchReportSummary({ user: queryUser, month });
      setData(summary);
    } catch (e) {
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [queryUser, month]);

  useEffect(() => { load(); }, [load]);

  const handleExportCSV = async () => {
    try {
      const entries = await fetchEntries({ user: queryUser, month });
      exportCSV(entries, `report-${month}${selectedUser ? '-' + selectedUser : ''}.csv`);
    } catch (e) {
      alert('Failed to export data.');
    }
  };

  const totalHours = data ? (data.totals.totalMinutes / 60).toFixed(1) : '—';
  const avgHours = data && data.totals.activeDays > 0
    ? (data.totals.totalMinutes / 60 / data.totals.activeDays).toFixed(1)
    : '0.0';

  return (
    <div className="report-page">
      <div className="page-header">
        <h2 className="page-title">Report</h2>
        <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
          ↓ Export CSV
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Month</label>
          <input
            className="form-input filter-input"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
        {isAdmin && (
          <div className="filter-group">
            <label className="filter-label">User</label>
            <select
              className="form-select filter-input"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">All Users</option>
              {USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="loading-msg">Loading report…</div>}

      {!loading && data && (
        <>
          {/* Stat cards */}
          <div className="stat-cards">
            <StatCard label="Total Hours" value={totalHours} unit="hrs" accent="#4f8ef7" />
            <StatCard label="Avg Hours / Active Day" value={avgHours} unit="hrs" accent="#4fde8a" />
            <StatCard
              label="Top Category"
              value={data.totals.topCategory || '—'}
              isText
              accent={data.totals.topCategory ? CATEGORY_COLORS[data.totals.topCategory] : '#6b7594'}
            />
            <StatCard label="Active Days" value={data.totals.activeDays} unit="days" accent="#f7c94f" />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Hours by Category</h3>
              <HBarChart
                data={data.byCategory}
                labelKey="category"
                valueKey="hours"
                colorFn={d => CATEGORY_COLORS[d.category] || '#6b7594'}
              />
            </div>

            {isAdmin && (
              <div className="chart-card">
                <h3 className="chart-title">Hours by Team Member</h3>
                <HBarChart
                  data={data.byUser}
                  labelKey="user"
                  valueKey="hours"
                  colorFn={d => USER_COLORS[d.user] || '#6b7594'}
                />
              </div>
            )}

            <div className="chart-card">
              <h3 className="chart-title">Hours by Customer / Ticket (Top 8)</h3>
              <HBarChart
                data={data.byCustomer}
                labelKey="customer"
                valueKey="hours"
                colorFn={() => '#4f8ef7'}
                uniformColor
              />
            </div>

            <div className={`chart-card${isAdmin ? '' : ' chart-card--wide'}`}>
              <h3 className="chart-title">Weekly Trend (Last 10 Weeks)</h3>
              <LineChart data={data.weeklyTrend} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, isText, accent }) {
  return (
    <div className="stat-card" style={{ '--accent': accent }}>
      <div className="stat-card-accent" />
      <div className="stat-label">{label}</div>
      {isText ? (
        <div className="stat-value stat-value--text">{value}</div>
      ) : (
        <div className="stat-value mono">
          {value}<span className="stat-unit">{unit}</span>
        </div>
      )}
    </div>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────
function HBarChart({ data, labelKey, valueKey, colorFn }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const Chart = window.Chart;
    if (!Chart) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = data.map(d => d[labelKey]);
    const values = data.map(d => d[valueKey]);
    const colors = data.map(colorFn);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.x.toFixed(1)} hrs`,
            },
            backgroundColor: '#1c2030',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: '#252a3a',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { color: '#252a3a' },
            ticks: { color: '#6b7594', font: { family: 'IBM Plex Mono', size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#e2e8f0', font: { family: 'IBM Plex Sans', size: 12 } },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, labelKey, valueKey, colorFn]);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>;
  }

  const height = Math.max(120, data.length * 40 + 40);

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ── Line Chart ───────────────────────────────────────────────────────────────
function LineChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const Chart = window.Chart;
    if (!Chart) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = data.map(d => d.week_start || d.week_key);
    const values = data.map(d => d.hours);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79,142,247,0.15)',
          pointBackgroundColor: '#4f8ef7',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toFixed(1)} hrs`,
            },
            backgroundColor: '#1c2030',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: '#252a3a',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { color: '#252a3a' },
            ticks: { color: '#6b7594', font: { family: 'IBM Plex Mono', size: 11 }, maxRotation: 45 },
          },
          y: {
            grid: { color: '#252a3a' },
            ticks: { color: '#6b7594', font: { family: 'IBM Plex Mono', size: 11 } },
            beginAtZero: true,
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>;
  }

  return (
    <div style={{ height: '240px', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
