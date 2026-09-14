// ══════════════════════════════════════════════════
// Dashboard Page — หน้าหลัก
// ══════════════════════════════════════════════════

import { getUser } from '../auth.js';
import { fetchTodayPrices, fetchAiWarnings, fetchTransactions, fetchWeeklySparklines } from '../services/api.js';
import { formatCurrency, formatNumber, formatPercent, formatDate, getChangeColor, getChangeArrow, formatRelativeTime } from '../utils/format.js';

export async function renderDashboard() {
  const user = getUser();
  const prices = await fetchTodayPrices();
  const warnings = await fetchAiWarnings();
  const txns = await fetchTransactions();
  const sparklines = await fetchWeeklySparklines();
  const recentTxns = txns.filter(t => t.status === 'completed').slice(0, 3);

  const warningColors = {
    danger: { bg: 'rgba(239,68,68,0.1)', border: 'var(--color-danger-600)', text: 'var(--color-danger-400)', icon: '🚨' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'var(--color-warning-600)', text: 'var(--color-warning-400)', icon: '⚠️' },
    success: { bg: 'rgba(22,180,96,0.1)', border: 'var(--color-primary-600)', text: 'var(--color-primary-400)', icon: '✅' },
  };

  function miniSparkline(data, color) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const h = 32, w = 80;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  return `
    <div class="page">
      <div class="container page-content">
        <!-- Header -->
        <div class="dashboard-header animate-fade-in-up">
          <div>
            <h1 style="font-size:var(--text-2xl);margin-bottom:var(--space-1)">
              สวัสดี, ${user?.lineDisplayName?.split(' ')[0] || 'เกษตรกร'} 👋
            </h1>
            <p style="color:var(--color-text-tertiary);font-size:var(--text-sm)">ข้อมูลราคาวันที่ ${formatDate(new Date().toISOString().split('T')[0])}</p>
          </div>
          <div class="flex gap-3">
            <button class="btn btn-primary" onclick="window.location.hash='/calculator'" id="btn-quick-calc">
              🧮 คำนวณราคา
            </button>
          </div>
        </div>

        <!-- AI Warnings -->
        ${warnings.filter(w => w.warningLevel !== 'success').length > 0 ? `
        <div class="section animate-fade-in-up delay-1">
          <h2 style="font-size:var(--text-lg);margin-bottom:var(--space-4)">🔔 สัญญาณเตือนภัย AI</h2>
          <div class="warnings-list">
            ${warnings.filter(w => w.warningLevel !== 'success').map(w => {
              const wc = warningColors[w.warningLevel];
              return `
                <div class="warning-card" style="background:${wc.bg};border-left:3px solid ${wc.border}">
                  <div class="flex items-center gap-3" style="margin-bottom:var(--space-2)">
                    <span style="font-size:var(--text-xl)">${wc.icon}</span>
                    <span class="badge badge-${w.warningLevel === 'danger' ? 'danger' : 'warning'}">${w.warningLabel}</span>
                    <span style="font-size:var(--text-xl)">${w.cropIcon}</span>
                    <span style="font-weight:var(--font-semibold);font-size:var(--text-sm)">${w.cropName}</span>
                  </div>
                  <p style="font-size:var(--text-sm);color:${wc.text};font-weight:var(--font-medium);margin-bottom:var(--space-2)">${w.title}</p>
                  <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-2)">${w.description}</p>
                  <div style="font-size:var(--text-xs);color:var(--color-primary-400);background:rgba(22,180,96,0.1);padding:var(--space-2) var(--space-3);border-radius:var(--radius-lg)">
                    💡 ${w.recommendation}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Market Prices -->
        <div class="section animate-fade-in-up delay-2">
          <div class="flex justify-between items-center" style="margin-bottom:var(--space-4)">
            <h2 style="font-size:var(--text-lg)">📊 ราคาตลาดวันนี้</h2>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/predictions'">ดูพยากรณ์ →</button>
          </div>

          <div class="price-cards-grid">
            ${[
              { key: 'rice', icon: '🌾', name: 'ข้าวเปลือก', color: 'var(--color-gold-400)' },
              { key: 'cassava', icon: '🥔', name: 'มันสำปะหลัง', color: 'var(--color-earth-400)' },
              { key: 'sugarcane', icon: '🎋', name: 'อ้อย', color: 'var(--color-primary-400)' },
            ].map(crop => {
              const p = prices[crop.key];
              return `
                <div class="price-card card card-interactive" onclick="window.location.hash='/calculator?crop=${crop.key}'">
                  <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                      <span style="font-size:2rem">${crop.icon}</span>
                      <div>
                        <div style="font-size:var(--text-sm);color:var(--color-text-tertiary)">${crop.name}</div>
                        <div style="font-size:var(--text-2xl);font-weight:var(--font-extrabold);color:${crop.color}">
                          ${crop.key === 'sugarcane' ? formatNumber(p.basePrice, 0) : p.basePrice.toFixed(2)}
                        </div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.unit}</div>
                      </div>
                    </div>
                    <div style="text-align:right">
                      ${miniSparkline(sparklines[crop.key], crop.color)}
                      <div style="font-size:var(--text-xs);color:${getChangeColor(p.change)};margin-top:var(--space-1)">
                        ${getChangeArrow(p.change)} ${p.change > 0 ? '+' : ''}${crop.key === 'sugarcane' ? formatNumber(p.change, 0) : p.change.toFixed(2)} (${formatPercent(p.changePercent)})
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section animate-fade-in-up delay-3">
          <h2 style="font-size:var(--text-lg);margin-bottom:var(--space-4)">⚡ เครื่องมือ</h2>
          <div class="quick-actions-grid">
            <div class="quick-action card card-interactive" onclick="window.location.hash='/calculator'">
              <span class="quick-action-icon">🧮</span>
              <span class="quick-action-label">คำนวณราคา</span>
            </div>
            <div class="quick-action card card-interactive" onclick="window.location.hash='/map'">
              <span class="quick-action-icon">🗺️</span>
              <span class="quick-action-label">ค้นหาจุดรับซื้อ</span>
            </div>
            <div class="quick-action card card-interactive" onclick="window.location.hash='/predictions'">
              <span class="quick-action-icon">📈</span>
              <span class="quick-action-label">พยากรณ์ราคา</span>
            </div>
            <div class="quick-action card card-interactive" onclick="window.location.hash='/transactions'">
              <span class="quick-action-icon">📋</span>
              <span class="quick-action-label">ประวัติธุรกรรม</span>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        ${recentTxns.length > 0 ? `
        <div class="section animate-fade-in-up delay-4">
          <div class="flex justify-between items-center" style="margin-bottom:var(--space-4)">
            <h2 style="font-size:var(--text-lg)">📋 ธุรกรรมล่าสุด</h2>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='/transactions'">ดูทั้งหมด →</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            ${recentTxns.map(tx => `
              <div class="card" style="padding:var(--space-4)">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-3">
                    <span style="font-size:1.5rem">${tx.cropIcon}</span>
                    <div>
                      <div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">${tx.cropName} — ${tx.facilityName}</div>
                      <div style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${formatRelativeTime(tx.date)} • ${formatNumber(tx.totalWeight)} ${tx.cropId === 'sugarcane' ? 'ตัน' : 'กก.'}</div>
                    </div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-weight:var(--font-bold);color:var(--color-gold-400)">${formatCurrency(tx.actualReceived)}</div>
                    ${tx.priceDifference !== null ? `
                      <div style="font-size:var(--text-xs);color:${getChangeColor(tx.priceDifference)}">
                        ${tx.priceDifference > 0 ? '+' : ''}${formatCurrency(tx.priceDifference)} จากประเมิน
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <style>
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-8);
        flex-wrap: wrap;
        gap: var(--space-4);
      }

      .warnings-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .warning-card {
        padding: var(--space-4) var(--space-5);
        border-radius: var(--radius-xl);
      }

      .price-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--space-4);
      }

      .price-card {
        padding: var(--space-5);
      }

      .quick-actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: var(--space-3);
      }

      .quick-action {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-6) var(--space-4);
        text-align: center;
      }

      .quick-action-icon {
        font-size: 2rem;
      }

      .quick-action-label {
        font-size: var(--text-sm);
        font-weight: var(--font-medium);
      }
    </style>
  `;
}
