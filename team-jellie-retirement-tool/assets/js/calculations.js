(function (window) {
  'use strict';

  const ACCOUNT_KEYS = ['cash', 'taxable', 'roth', 'hsa', 'traditional'];

  const DEFAULT_RMD_DIVISORS = {
    73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
    81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
    89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function monthlyRate(annualPercent) {
    return Math.pow(1 + (Number(annualPercent) || 0) / 100, 1 / 12) - 1;
  }

  function pickSSBenefit(benefits, age) {
    const target = Number(age);
    if (benefits[target]) return Number(benefits[target]);
    const ages = Object.keys(benefits).map(Number).sort((a, b) => a - b);
    if (!ages.length) return 0;
    if (target <= ages[0]) return Number(benefits[ages[0]]);
    if (target >= ages[ages.length - 1]) return Number(benefits[ages[ages.length - 1]]);
    for (let i = 0; i < ages.length - 1; i++) {
      const a1 = ages[i];
      const a2 = ages[i + 1];
      if (target >= a1 && target <= a2) {
        const b1 = Number(benefits[a1]);
        const b2 = Number(benefits[a2]);
        const t = (target - a1) / (a2 - a1);
        return b1 + (b2 - b1) * t;
      }
    }
    return 0;
  }

  function calcMonthlySpending(baseMonthly, inflationAnnual, monthIndex, avgAge, phases) {
    const years = monthIndex / 12;
    const inflated = baseMonthly * Math.pow(1 + inflationAnnual / 100, years);
    const phase = (phases || []).find((p) => avgAge >= p.startAge && avgAge <= p.endAge);
    return inflated * (phase ? Number(phase.multiplier || 1) : 1);
  }

  function currentHousingMonthly(h) {
    return (Number(h.mortgagePayment) || 0)
      + (Number(h.helocPayment) || 0)
      + (Number(h.taxes) || 0)
      + (Number(h.insurance) || 0)
      + (Number(h.maintenance) || 0)
      + (Number(h.improvementBudgetMonthly) || 0);
  }

  function mergedHousingMonthly(h) {
    return (Number(h.mergedLoanPayment) || 0)
      + (Number(h.taxes) || 0)
      + (Number(h.insurance) || 0)
      + (Number(h.maintenance) || 0)
      + (Number(h.improvementBudgetMonthly) || 0);
  }

  function resolvedHousingMonthly(h) {
    const strategy = h.strategy || 'compare';
    if (strategy === 'keep') return currentHousingMonthly(h);
    if (strategy === 'combine') return mergedHousingMonthly(h);
    return Math.min(currentHousingMonthly(h), mergedHousingMonthly(h));
  }

  function taxableSocialSecurity(annualSS, annualOtherIncome) {
    const base = 32000;
    const secondBase = 44000;
    const provisional = annualOtherIncome + (annualSS * 0.5);
    if (provisional <= base) return 0;
    if (provisional <= secondBase) return Math.min(annualSS * 0.5, (provisional - base) * 0.5);
    const over = provisional - secondBase;
    const tier1 = (secondBase - base) * 0.5;
    return Math.min(annualSS * 0.85, tier1 + over * 0.85);
  }

  function federalTaxFromBrackets(income, taxConfig) {
    const brackets = (taxConfig.brackets || []).slice().sort((a, b) => a.upTo - b.upTo);
    let remaining = Math.max(0, income - Number(taxConfig.standardDeduction || 0));
    let prev = 0;
    let tax = 0;
    for (const b of brackets) {
      if (remaining <= 0) break;
      const cap = b.upTo === null ? Number.MAX_SAFE_INTEGER : Number(b.upTo);
      const width = Math.max(0, cap - prev);
      const taxableAtRate = Math.min(remaining, width);
      tax += taxableAtRate * (Number(b.rate || 0) / 100);
      remaining -= taxableAtRate;
      prev = cap;
    }
    return tax;
  }

  function irmaaMonthlySurcharge(annualMAGI, irmaaConfig) {
    const tiers = (irmaaConfig.thresholds || []).slice().sort((a, b) => a.incomeOver - b.incomeOver);
    let surcharge = 0;
    for (const t of tiers) {
      if (annualMAGI > Number(t.incomeOver || 0)) surcharge = Number(t.monthlySurcharge || 0);
    }
    return surcharge;
  }

  function rmdDivisorForAge(age, table) {
    const key = Math.round(age);
    if (table[key]) return table[key];
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (key <= keys[0]) return table[keys[0]];
    return table[keys[keys.length - 1]];
  }

  function calculatePlan(input) {
    const data = JSON.parse(JSON.stringify(input));
    const household = data.household;
    const ss = data.socialSecurity;
    const spend = data.spending;
    const housing = data.housing;
    const lines = data.warningLines;
    const taxConfig = data.taxModel || {};
    const irmaaConfig = data.irmaa || {};
    const rmdConfig = data.rmd || {};

    const startJasonAge = Number(household.jasonAge);
    const startKellieAge = Number(household.kellieAge);
    const retirementAge = Number(household.retirementAge);
    const maxAge = Number(household.maxAge || 95);

    const horizonMonths = Math.max(12, Math.round((maxAge - Math.min(startJasonAge, startKellieAge)) * 12));
    const balances = {};
    ACCOUNT_KEYS.forEach((k) => (balances[k] = Number(data.accounts[k]?.balance || 0)));

    const rates = {};
    ACCOUNT_KEYS.forEach((k) => (rates[k] = monthlyRate(data.accounts[k]?.annualGrowth || 0)));

    const monthlyRows = [];
    const annual = new Map();
    let depletedMonth = null;

    const jasonBase = pickSSBenefit(ss.jasonBenefits || {}, ss.jasonClaimAge);
    const kellieBase = pickSSBenefit(ss.kellieBenefits || {}, ss.kellieClaimAge);
    const cola = Number(household.socialSecurityCOLA || 0) / 100;

    const withdrawalOrder = Array.isArray(data.withdrawalOrder) && data.withdrawalOrder.length
      ? data.withdrawalOrder
      : ['cash', 'roth', 'hsa', 'traditional', 'housingRestructure', 'reverseMortgage'];

    for (let m = 0; m < horizonMonths; m++) {
      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() + m);
      const year = currentDate.getFullYear();
      const monthInYear = currentDate.getMonth();

      const jasonAge = startJasonAge + (m / 12);
      const kellieAge = startKellieAge + (m / 12);
      const avgAge = (jasonAge + kellieAge) / 2;

      const ssInflationMult = household.socialSecurityInflation ? Math.pow(1 + cola, m / 12) : 1;
      const socialSecurityMonthly = (jasonAge >= retirementAge ? jasonBase : 0) + (kellieAge >= retirementAge ? kellieBase : 0);
      const socialSecurity = socialSecurityMonthly * ssInflationMult;

      const housingMonthly = resolvedHousingMonthly(housing);
      const nonHousingBase = Math.max(0, Number(spend.baseMonthly || 0) - currentHousingMonthly(housing));
      const modeledNonHousing = calcMonthlySpending(nonHousingBase, Number(spend.inflation || 0), m, avgAge, spend.phases || []);
      const monthlySpending = modeledNonHousing + housingMonthly;

      ACCOUNT_KEYS.forEach((k) => {
        balances[k] = balances[k] * (1 + rates[k]);
      });

      let gap = Math.max(0, monthlySpending - socialSecurity);
      const sourceBreakdown = {
        socialSecurity,
        cash: 0,
        taxable: 0,
        roth: 0,
        hsa: 0,
        traditional: 0,
        housingRestructure: 0,
        reverseMortgage: 0,
        unmet: 0,
        rmd: 0
      };

      withdrawalOrder.forEach((source) => {
        if (gap <= 0) return;
        if (ACCOUNT_KEYS.includes(source)) {
          const take = Math.min(gap, balances[source]);
          balances[source] -= take;
          sourceBreakdown[source] += take;
          gap -= take;
        } else if (source === 'housingRestructure') {
          const savings = Math.max(0, currentHousingMonthly(housing) - mergedHousingMonthly(housing));
          const take = Math.min(gap, savings);
          sourceBreakdown.housingRestructure += take;
          gap -= take;
        } else if (source === 'reverseMortgage' && housing.enableReverseMortgage) {
          const take = Math.min(gap, Number(housing.reverseMortgageMonthly || 0));
          sourceBreakdown.reverseMortgage += take;
          gap -= take;
        }
      });

      if (rmdConfig.enabled && avgAge >= Number(rmdConfig.startAge || 73)) {
        const divisor = rmdDivisorForAge(avgAge, rmdConfig.divisors || DEFAULT_RMD_DIVISORS);
        const requiredAnnualRmd = balances.traditional / divisor;
        const requiredMonthly = requiredAnnualRmd / 12;
        const extraRmd = Math.max(0, requiredMonthly - sourceBreakdown.traditional);
        if (extraRmd > 0) {
          const draw = Math.min(extraRmd, balances.traditional);
          balances.traditional -= draw;
          sourceBreakdown.traditional += draw;
          sourceBreakdown.rmd += draw;
        }
      }

      sourceBreakdown.unmet = gap;

      if (depletedMonth === null) {
        const allEmpty = ACCOUNT_KEYS.every((k) => balances[k] <= 1);
        if (allEmpty || gap > 0) depletedMonth = m + 1;
      }

      const countableIncome = socialSecurity
        + (data.accounts.taxable.countableIncome ? sourceBreakdown.taxable : 0)
        + (data.accounts.traditional.countableIncome ? sourceBreakdown.traditional : 0)
        + (data.accounts.cash.countableIncome ? sourceBreakdown.cash : 0)
        + (data.accounts.roth.countableIncome ? sourceBreakdown.roth : 0)
        + (data.accounts.hsa.countableIncome ? sourceBreakdown.hsa : 0);

      const taxSensitive = (data.accounts.taxable.taxSensitive ? sourceBreakdown.taxable : 0)
        + (data.accounts.traditional.taxSensitive ? sourceBreakdown.traditional : 0);

      const annualOther = taxSensitive * 12;
      const annualSS = socialSecurity * 12;
      const taxableSS = taxableSocialSecurity(annualSS, annualOther);
      const annualTaxableIncome = annualOther + taxableSS;
      const annualFederalTax = taxConfig.enabled ? federalTaxFromBrackets(annualTaxableIncome, taxConfig) : 0;
      const monthlyFederalTax = annualFederalTax / 12;

      const annualMAGI = (socialSecurity + sourceBreakdown.taxable + sourceBreakdown.traditional) * 12;
      const irmaaMonthly = irmaaConfig.enabled ? irmaaMonthlySurcharge(annualMAGI, irmaaConfig) : 0;

      const lineStatus = {
        snapOver: countableIncome > Number(lines.snapGrossMonthly || 0),
        medicalOver: countableIncome > Number(lines.medicalMonthly || 0),
        customOver: countableIncome > Number(lines.customCountableMonthly || 0)
      };

      const row = {
        monthIndex: m,
        date: currentDate.toISOString().slice(0, 10),
        year,
        monthInYear,
        jasonAge,
        kellieAge,
        socialSecurity,
        monthlySpending,
        gapAfterSS: Math.max(0, monthlySpending - socialSecurity),
        countableIncome,
        taxSensitive,
        annualTaxableIncome,
        monthlyFederalTax,
        irmaaMonthly,
        housingMonthly,
        lineStatus,
        balances: { ...balances },
        sourceBreakdown
      };
      monthlyRows.push(row);

      if (!annual.has(year)) {
        annual.set(year, {
          year,
          socialSecurity: 0,
          spending: 0,
          countableIncome: 0,
          taxSensitive: 0,
          federalTax: 0,
          irmaa: 0,
          rmd: 0,
          unmet: 0,
          withdrawals: { cash: 0, taxable: 0, roth: 0, hsa: 0, traditional: 0, housingRestructure: 0, reverseMortgage: 0 }
        });
      }
      const y = annual.get(year);
      y.socialSecurity += socialSecurity;
      y.spending += monthlySpending;
      y.countableIncome += countableIncome;
      y.taxSensitive += taxSensitive;
      y.federalTax += monthlyFederalTax;
      y.irmaa += irmaaMonthly;
      y.rmd += sourceBreakdown.rmd;
      y.unmet += sourceBreakdown.unmet;
      Object.keys(y.withdrawals).forEach((k) => {
        y.withdrawals[k] += sourceBreakdown[k] || 0;
      });
    }

    const annualRows = Array.from(annual.values());
    const totalBalances = ACCOUNT_KEYS.reduce((acc, k) => acc + balances[k], 0);

    const monthsOver = {
      snap: monthlyRows.filter((r) => r.lineStatus.snapOver).length,
      medical: monthlyRows.filter((r) => r.lineStatus.medicalOver).length,
      custom: monthlyRows.filter((r) => r.lineStatus.customOver).length,
      annualTax: annualRows.filter((r) => r.taxSensitive > Number(lines.taxAnnual || 0)).length
    };

    const statusScore = clamp(
      (depletedMonth ? 0 : 20)
      + (monthsOver.custom === 0 ? 20 : 5)
      + (monthsOver.annualTax === 0 ? 20 : 8)
      + (annualRows[0] && annualRows[0].federalTax < Number(lines.taxAnnual || 0) ? 20 : 8)
      + (monthlyRows[0] && monthlyRows[0].sourceBreakdown.unmet === 0 ? 20 : 0),
      0,
      100
    );

    const planStatus = statusScore >= 80 ? 'Stable' : statusScore >= 55 ? 'Tight' : statusScore >= 30 ? 'Warning' : 'Over line';

    return {
      monthlyRows,
      annualRows,
      balancesFinal: balances,
      totalBalances,
      monthsOver,
      depletedMonth,
      statusScore,
      planStatus,
      housingComparison: {
        current: currentHousingMonthly(housing),
        merged: mergedHousingMonthly(housing),
        difference: mergedHousingMonthly(housing) - currentHousingMonthly(housing),
        note: housing.mergedLoanTermNote || ''
      },
      ssMonthlyAtRetirement: jasonBase + kellieBase,
      ssAnnualAtRetirement: (jasonBase + kellieBase) * 12
    };
  }

  function randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function quantile(arr, q) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    return sorted[base] || 0;
  }

  function runMonteCarlo(input, opts) {
    const years = Number(opts.years || 30);
    const iterations = Number(opts.iterations || 300);
    const startTotal = ACCOUNT_KEYS.reduce((sum, k) => sum + Number(input.accounts[k].balance || 0), 0);
    const monthlySpend = Number(input.spending.baseMonthly || 0);
    const ss = pickSSBenefit(input.socialSecurity.jasonBenefits, input.socialSecurity.jasonClaimAge)
      + pickSSBenefit(input.socialSecurity.kellieBenefits, input.socialSecurity.kellieClaimAge);
    const netDrawAnnual = Math.max(0, (monthlySpend - ss) * 12);

    const assumptions = input.monteCarlo || {};
    const samplesByYear = Array.from({ length: years + 1 }, () => []);

    for (let i = 0; i < iterations; i++) {
      let value = startTotal;
      samplesByYear[0].push(value);
      for (let y = 1; y <= years; y++) {
        const mean = Number(assumptions.expectedReturn || 5) / 100;
        const std = Number(assumptions.volatility || 10) / 100;
        const shock = mean + randomNormal() * std;
        value = Math.max(0, (value - netDrawAnnual) * (1 + shock));
        samplesByYear[y].push(value);
      }
    }

    const percentileBands = samplesByYear.map((vals, idx) => ({
      year: idx,
      p10: quantile(vals, 0.1),
      p50: quantile(vals, 0.5),
      p90: quantile(vals, 0.9),
      failRate: vals.filter((v) => v <= 1).length / vals.length
    }));

    return { years, iterations, percentileBands };
  }

  window.TeamJellieCalc = {
    calculatePlan,
    currentHousingMonthly,
    mergedHousingMonthly,
    pickSSBenefit,
    runMonteCarlo
  };
})(window);
