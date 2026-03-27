(function (window) {
  'use strict';

  const ACCOUNT_KEYS = ['cash', 'taxable', 'roth', 'hsa', 'traditional'];

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

  function calculatePlan(input) {
    const data = JSON.parse(JSON.stringify(input));
    const household = data.household;
    const ss = data.socialSecurity;
    const spend = data.spending;
    const housing = data.housing;
    const lines = data.warningLines;

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
        unmet: 0
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

      const lineStatus = {
        snapOver: countableIncome > Number(lines.snapGrossMonthly || 0),
        medicalOver: countableIncome > Number(lines.medicalMonthly || 0),
        customOver: countableIncome > Number(lines.customCountableMonthly || 0)
      };

      const row = {
        monthIndex: m,
        date: currentDate.toISOString().slice(0, 10),
        year,
        jasonAge,
        kellieAge,
        socialSecurity,
        monthlySpending,
        gapAfterSS: Math.max(0, monthlySpending - socialSecurity),
        countableIncome,
        taxSensitive,
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
          unmet: 0,
          withdrawals: { cash: 0, taxable: 0, roth: 0, hsa: 0, traditional: 0, housingRestructure: 0, reverseMortgage: 0 }
        });
      }
      const y = annual.get(year);
      y.socialSecurity += socialSecurity;
      y.spending += monthlySpending;
      y.countableIncome += countableIncome;
      y.taxSensitive += taxSensitive;
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
      (depletedMonth ? 0 : 25)
      + (monthsOver.custom === 0 ? 25 : 5)
      + (monthsOver.annualTax === 0 ? 25 : 10)
      + (monthlyRows[0] && monthlyRows[0].sourceBreakdown.unmet === 0 ? 25 : 0),
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

  window.TeamJellieCalc = {
    calculatePlan,
    currentHousingMonthly,
    mergedHousingMonthly,
    pickSSBenefit
  };
})(window);
