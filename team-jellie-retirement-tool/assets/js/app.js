(function () {
  'use strict';

  const state = {
    data: null,
    result: null,
    charts: {},
    compareSelection: []
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  async function init() {
    bindTabs();
    bindActions();
    await loadInitialData();
    bindFormInputs();
    recalcAndRender();
  }

  function bindTabs() {
    $$('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach((b) => b.classList.remove('active'));
        $$('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
  }

  function bindActions() {
    $('#exportJsonBtn').addEventListener('click', () => {
      TeamJellieStorage.downloadJSON(`team-jellie-${Date.now()}.json`, state.data);
    });

    $('#importJsonInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        state.data = await TeamJellieStorage.readJSONFile(file);
        syncFormFromData();
        recalcAndRender(true);
      } catch (err) {
        notify(`Import failed: ${err.message}`, 'error');
      }
    });

    $('#resetSampleBtn').addEventListener('click', async () => {
      await loadSampleData(true);
      notify('Reset to Team Jellie sample data.', 'ok');
    });

    $('#saveScenarioBtn').addEventListener('click', () => {
      const name = prompt('Scenario name');
      if (!name) return;
      state.data.scenarioLab.saved.push({ name, createdAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(state.data)), metrics: summarizeMetrics() });
      renderScenarioList();
      persist();
    });

    $('#statementInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      $('#ingestStatus').textContent = 'Reading statement...';
      const result = await TeamJellieImporters.ingestStatement(file);
      renderIngestResult(result);
    });

    $('#printSummaryBtn').addEventListener('click', () => window.print());
  }

  function bindFormInputs() {
    $$('.model-input').forEach((input) => {
      input.addEventListener('change', () => {
        applyFormToState();
        recalcAndRender(true);
      });
    });

    $('#withdrawalOrder').addEventListener('change', () => {
      state.data.withdrawalOrder = $('#withdrawalOrder').value.split(',').map((v) => v.trim()).filter(Boolean);
      recalcAndRender(true);
    });
  }

  async function loadInitialData() {
    const cached = TeamJellieStorage.load();
    if (cached) {
      state.data = cached;
      syncFormFromData();
      return;
    }
    await loadSampleData(false);
  }

  async function loadSampleData(sync = true) {
    const res = await fetch('./assets/data/sample-team-jellie.json');
    state.data = await res.json();
    if (sync) syncFormFromData();
    persist();
  }

  function syncFormFromData() {
    const d = state.data;
    const map = {
      '#jasonAge': d.household.jasonAge,
      '#kellieAge': d.household.kellieAge,
      '#retirementAge': d.household.retirementAge,
      '#maxAge': d.household.maxAge,
      '#jasonClaimAge': d.socialSecurity.jasonClaimAge,
      '#kellieClaimAge': d.socialSecurity.kellieClaimAge,
      '#baseMonthly': d.spending.baseMonthly,
      '#spendInflation': d.spending.inflation,
      '#ssCola': d.household.socialSecurityCOLA,
      '#snapLine': d.warningLines.snapGrossMonthly,
      '#medicalLine': d.warningLines.medicalMonthly,
      '#customLine': d.warningLines.customCountableMonthly,
      '#taxLine': d.warningLines.taxAnnual,
      '#mortgagePayment': d.housing.mortgagePayment,
      '#helocPayment': d.housing.helocPayment,
      '#housingTaxes': d.housing.taxes,
      '#housingInsurance': d.housing.insurance,
      '#housingMaint': d.housing.maintenance,
      '#housingImprove': d.housing.improvementBudgetMonthly,
      '#mergedPayment': d.housing.mergedLoanPayment,
      '#cashBalance': d.accounts.cash.balance,
      '#taxableBalance': d.accounts.taxable.balance,
      '#rothBalance': d.accounts.roth.balance,
      '#hsaBalance': d.accounts.hsa.balance,
      '#traditionalBalance': d.accounts.traditional.balance
    };
    Object.entries(map).forEach(([selector, value]) => {
      const el = $(selector);
      if (el) el.value = value;
    });

    $('#ssInflation').checked = !!d.household.socialSecurityInflation;
    $('#housingStrategy').value = d.housing.strategy;
    $('#withdrawalOrder').value = (d.withdrawalOrder || []).join(', ');
  }

  function applyFormToState() {
    const d = state.data;
    const num = (sel) => Number($(sel).value || 0);

    d.household.jasonAge = num('#jasonAge');
    d.household.kellieAge = num('#kellieAge');
    d.household.retirementAge = num('#retirementAge');
    d.household.maxAge = num('#maxAge');
    d.household.socialSecurityInflation = $('#ssInflation').checked;
    d.household.socialSecurityCOLA = num('#ssCola');

    d.socialSecurity.jasonClaimAge = num('#jasonClaimAge');
    d.socialSecurity.kellieClaimAge = num('#kellieClaimAge');

    d.spending.baseMonthly = num('#baseMonthly');
    d.spending.inflation = num('#spendInflation');

    d.warningLines.snapGrossMonthly = num('#snapLine');
    d.warningLines.medicalMonthly = num('#medicalLine');
    d.warningLines.customCountableMonthly = num('#customLine');
    d.warningLines.taxAnnual = num('#taxLine');

    d.housing.strategy = $('#housingStrategy').value;
    d.housing.mortgagePayment = num('#mortgagePayment');
    d.housing.helocPayment = num('#helocPayment');
    d.housing.taxes = num('#housingTaxes');
    d.housing.insurance = num('#housingInsurance');
    d.housing.maintenance = num('#housingMaint');
    d.housing.improvementBudgetMonthly = num('#housingImprove');
    d.housing.mergedLoanPayment = num('#mergedPayment');

    d.accounts.cash.balance = num('#cashBalance');
    d.accounts.taxable.balance = num('#taxableBalance');
    d.accounts.roth.balance = num('#rothBalance');
    d.accounts.hsa.balance = num('#hsaBalance');
    d.accounts.traditional.balance = num('#traditionalBalance');
  }

  function recalcAndRender(save = false) {
    state.result = TeamJellieCalc.calculatePlan(state.data);
    renderSummaryCards();
    renderTables();
    renderWarnings();
    renderHousing();
    renderCharts();
    renderScenarioList();
    if (save) persist();
  }

  function summarizeMetrics() {
    const r = state.result;
    const first = r.monthlyRows[0] || {};
    const end = r.monthlyRows[r.monthlyRows.length - 1] || { balances: {} };
    return {
      planStatus: r.planStatus,
      monthlyGap: first.gapAfterSS || 0,
      taxSensitiveYear1: (r.annualRows[0] || {}).taxSensitive || 0,
      depletedMonth: r.depletedMonth,
      endingBalance: Object.values(end.balances || {}).reduce((a, b) => a + b, 0),
      housingMonthly: r.housingComparison.current
    };
  }

  function renderSummaryCards() {
    const r = state.result;
    const m0 = r.monthlyRows[0] || { sourceBreakdown: {} };
    const y0 = r.annualRows[0] || {};

    const longevity = r.depletedMonth ? `${Math.floor(r.depletedMonth / 12)}y ${r.depletedMonth % 12}m` : `> ${Math.floor(r.monthlyRows.length / 12)} years`;

    const cards = [
      ['Plan status', r.planStatus, r.planStatus],
      ['Monthly Social Security total', fmt(r.ssMonthlyAtRetirement), 'Stable'],
      ['Monthly spending target', fmt(m0.monthlySpending), ''],
      ['Monthly gap after Social Security', fmt(m0.gapAfterSS), m0.gapAfterSS < 2000 ? 'Tight' : 'Warning'],
      ['Countable income this month', fmt(m0.countableIncome), m0.countableIncome > state.data.warningLines.customCountableMonthly ? 'Over line' : 'Stable'],
      ['Tax-sensitive withdrawals this year', fmt(y0.taxSensitive), y0.taxSensitive > state.data.warningLines.taxAnnual ? 'Warning' : 'Stable'],
      ['Total liquid/retirement balance', fmt(r.totalBalances), ''],
      ['Estimated account longevity', longevity, r.depletedMonth ? 'Warning' : 'Stable']
    ];

    $('#summaryCards').innerHTML = cards.map(([label, value, badge]) => `
      <article class="card">
        <div class="card-label">${label}</div>
        <div class="card-value">${value}</div>
        ${badge ? `<span class="badge badge-${badge.toLowerCase().replace(' ', '-')}">${badge}</span>` : ''}
      </article>
    `).join('');

    $('#stickyBar').innerHTML = `<strong>${r.planStatus}</strong> · Gap ${fmt(m0.gapAfterSS)} · Countable ${fmt(m0.countableIncome)} · Tax-sensitive ${fmt(y0.taxSensitive || 0)}`;
  }

  function renderWarnings() {
    const r = state.result;
    const firstSnap = r.monthlyRows.find((row) => row.lineStatus.snapOver);
    const firstMedical = r.monthlyRows.find((row) => row.lineStatus.medicalOver);
    const firstCustom = r.monthlyRows.find((row) => row.lineStatus.customOver);

    $('#warningsPanel').innerHTML = `
      <li>SNAP-style monthly line over in <strong>${r.monthsOver.snap}</strong> months; first over: <strong>${firstSnap ? firstSnap.date : 'None'}</strong></li>
      <li>Medical line over in <strong>${r.monthsOver.medical}</strong> months; first over: <strong>${firstMedical ? firstMedical.date : 'None'}</strong></li>
      <li>Custom countable-income line over in <strong>${r.monthsOver.custom}</strong> months; first over: <strong>${firstCustom ? firstCustom.date : 'None'}</strong></li>
      <li>Annual tax warning line over in <strong>${r.monthsOver.annualTax}</strong> years.</li>
    `;
  }

  function renderHousing() {
    const h = state.result.housingComparison;
    $('#housingCompare').innerHTML = `
      <div><span>Current housing total:</span> <strong>${fmt(h.current)}</strong></div>
      <div><span>Merged loan total:</span> <strong>${fmt(h.merged)}</strong></div>
      <div><span>Monthly difference:</span> <strong class="${h.difference <= 0 ? 'good' : 'bad'}">${fmt(h.difference)}</strong></div>
      <div><span>Term note:</span> <strong>${h.note || 'No note entered.'}</strong></div>
    `;
  }

  function renderTables() {
    const monthlyRows = state.result.monthlyRows.slice(0, 180);
    $('#monthlyTable tbody').innerHTML = monthlyRows.map((r) => `
      <tr>
        <td>${r.date}</td><td>${fmt(r.socialSecurity)}</td><td>${fmt(r.monthlySpending)}</td><td>${fmt(r.gapAfterSS)}</td>
        <td>${fmt(r.countableIncome)}</td><td>${fmt(r.taxSensitive)}</td><td>${fmt(r.sourceBreakdown.unmet)}</td>
      </tr>
    `).join('');

    $('#annualTable tbody').innerHTML = state.result.annualRows.map((r) => `
      <tr><td>${r.year}</td><td>${fmt(r.socialSecurity)}</td><td>${fmt(r.spending)}</td><td>${fmt(r.countableIncome)}</td><td>${fmt(r.taxSensitive)}</td><td>${fmt(r.unmet)}</td></tr>
    `).join('');

    $('#withdrawalTable tbody').innerHTML = state.result.annualRows.map((r) => `
      <tr>
        <td>${r.year}</td>
        <td>${fmt(r.withdrawals.cash)}</td>
        <td>${fmt(r.withdrawals.roth)}</td>
        <td>${fmt(r.withdrawals.hsa)}</td>
        <td>${fmt(r.withdrawals.traditional)}</td>
        <td>${fmt(r.withdrawals.housingRestructure)}</td>
        <td>${fmt(r.withdrawals.reverseMortgage)}</td>
      </tr>
    `).join('');
  }

  function renderScenarioList() {
    const saved = state.data.scenarioLab.saved || [];
    $('#scenarioList').innerHTML = saved.length ? saved.map((s, i) => `
      <div class="scenario-item">
        <label><input type="checkbox" class="scenario-compare" data-index="${i}"> ${s.name}</label>
        <button data-load="${i}">Load</button>
      </div>
    `).join('') : '<p class="muted">No saved scenarios yet.</p>';

    $$('.scenario-item button').forEach((btn) => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.load);
      state.data = JSON.parse(JSON.stringify(saved[idx].data));
      syncFormFromData();
      recalcAndRender(true);
    }));

    $$('.scenario-compare').forEach((cb) => cb.addEventListener('change', buildScenarioCompareTable));
    buildScenarioCompareTable();
  }

  function buildScenarioCompareTable() {
    const selected = $$('.scenario-compare:checked').map((el) => Number(el.dataset.index)).slice(0, 3);
    if (!selected.length) {
      $('#scenarioCompareWrap').innerHTML = '<p class="muted">Select up to 3 scenarios to compare A/B/C.</p>';
      return;
    }

    const rows = selected.map((idx) => {
      const s = state.data.scenarioLab.saved[idx];
      return `<tr><td>${s.name}</td><td>${s.metrics.planStatus}</td><td>${fmt(s.metrics.monthlyGap)}</td><td>${fmt(s.metrics.taxSensitiveYear1)}</td><td>${s.metrics.depletedMonth ? s.metrics.depletedMonth + ' months' : 'Not depleted'}</td><td>${fmt(s.metrics.endingBalance)}</td><td>${fmt(s.metrics.housingMonthly)}</td></tr>`;
    }).join('');

    $('#scenarioCompareWrap').innerHTML = `
      <table class="data-table">
        <thead><tr><th>Scenario</th><th>Status</th><th>Gap</th><th>Tax-sensitive</th><th>Depletion</th><th>Ending balance</th><th>Housing burden</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderCharts() {
    renderLineChart('balanceChart', 'Account Balance Timeline', state.result.monthlyRows.filter((_, i) => i % 12 === 0).map((r) => r.date.slice(0, 4)), [
      { label: 'Cash', data: state.result.monthlyRows.filter((_, i) => i % 12 === 0).map((r) => r.balances.cash), borderColor: '#52b6ff' },
      { label: 'Roth', data: state.result.monthlyRows.filter((_, i) => i % 12 === 0).map((r) => r.balances.roth), borderColor: '#2de2a6' },
      { label: 'Traditional', data: state.result.monthlyRows.filter((_, i) => i % 12 === 0).map((r) => r.balances.traditional), borderColor: '#f8c055' }
    ]);

    const first60 = state.result.monthlyRows.slice(0, 60);
    renderLineChart('incomeChart', 'Spending vs Income', first60.map((r) => r.date), [
      { label: 'Spending', data: first60.map((r) => r.monthlySpending), borderColor: '#ff738d' },
      { label: 'Social Security + Withdrawals', data: first60.map((r) => r.monthlySpending - r.sourceBreakdown.unmet), borderColor: '#7bd0ff' }
    ]);

    renderLineChart('warningChart', 'Countable Income vs Warning Lines', first60.map((r) => r.date), [
      { label: 'Countable income', data: first60.map((r) => r.countableIncome), borderColor: '#8e8efc' },
      { label: 'Custom line', data: first60.map(() => state.data.warningLines.customCountableMonthly), borderColor: '#f9ce67', borderDash: [6, 4] }
    ]);

    renderBarChart('housingChart', ['Current', 'Merged'], [state.result.housingComparison.current, state.result.housingComparison.merged]);
  }

  function renderLineChart(id, title, labels, datasets) {
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(document.getElementById(id), {
      type: 'line',
      data: { labels, datasets: datasets.map((d) => ({ ...d, tension: 0.25, pointRadius: 0 })) },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#d9e5ff' } }, title: { display: true, text: title, color: '#d9e5ff' } }, scales: { x: { ticks: { color: '#9fb0d6' } }, y: { ticks: { color: '#9fb0d6' } } } }
    });
  }

  function renderBarChart(id, labels, data) {
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(document.getElementById(id), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Monthly housing cost', data, backgroundColor: ['#59c8ff', '#8dff8b'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#d9e5ff' } } }, scales: { x: { ticks: { color: '#9fb0d6' } }, y: { ticks: { color: '#9fb0d6' } } } }
    });
  }

  function renderIngestResult(result) {
    const status = $('#ingestStatus');
    const wrap = $('#ingestPreview');
    if (!result.success) {
      status.textContent = `Ingest failed: ${result.error}`;
      wrap.innerHTML = `<ul>${result.help.map((h) => `<li>${h}</li>`).join('')}</ul>`;
      return;
    }

    status.textContent = 'Detected values found. Review and apply.';
    const entries = Object.entries(result.detected).filter(([, v]) => v !== null && !Number.isNaN(v));
    if (!entries.length) {
      wrap.innerHTML = '<p class="muted">No reliable values detected. Use manual entry.</p>';
      return;
    }

    wrap.innerHTML = entries.map(([k, v]) => `
      <label class="detected-row"><input type="checkbox" checked data-field="${k}" data-value="${v}"> ${k} → <strong>${fmt(v)}</strong></label>
    `).join('') + '<button id="applyDetectedBtn">Apply selected</button>';

    $('#applyDetectedBtn').addEventListener('click', () => {
      $$('#ingestPreview input[type="checkbox"]:checked').forEach((cb) => applyDetectedField(cb.dataset.field, Number(cb.dataset.value)));
      syncFormFromData();
      recalcAndRender(true);
      notify('Detected values applied.', 'ok');
    });
  }

  function applyDetectedField(field, value) {
    const d = state.data;
    if (field in d.accounts) d.accounts[field].balance = value;
    if (field === 'mortgagePayment') d.housing.mortgagePayment = value;
    if (field === 'helocPayment') d.housing.helocPayment = value;
    if (field === 'socialSecurityMonthly') {
      const half = value / 2;
      d.socialSecurity.jasonBenefits[String(d.socialSecurity.jasonClaimAge)] = half;
      d.socialSecurity.kellieBenefits[String(d.socialSecurity.kellieClaimAge)] = half;
    }
  }

  function persist() {
    TeamJellieStorage.save(state.data);
  }

  function notify(msg, type = 'ok') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    setTimeout(() => el.className = 'toast', 2800);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
