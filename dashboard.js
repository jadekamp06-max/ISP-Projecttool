/* ==========================================================================
   ISP BARENDRECHT — TAB 2 CONTROLLER (dashboard.js)
   Beheert: "Dit is hoe het ervoor staat", KPI-Diagnosekaarten, AI-Advies,
   Bewerkbare Vergelijkingstabel & Chart.js Grafieken
   ========================================================================== */

(function (window) {
  'use strict';

  let hoursChartInstance = null;
  let financeChartInstance = null;

  /**
   * Render Weergave 2: Apart Scherm — "Dit is hoe het ervoor staat"
   */
  function renderProjectDashboard(populateFormInputs = true) {
    if (!window.AppState) return;

    const project = AppState.getCurrentProject();
    if (!project) return;

    const m = calculateProjectMetrics(project);
    const fullIspTitle = formatIspProjectTitle(project, AppState.clientViewActive);

    // Vul het quick-jump veld met het huidige projectnummer
    const quickJumpInput = document.getElementById('dashboardQuickJumpInput');
    if (quickJumpInput && document.activeElement !== quickJumpInput) {
      quickJumpInput.value = project.projectnummer;
    }

    // Render de 5 recent bekeken / belangrijkste projectnummers als snelle pills
    const pillsContainer = document.getElementById('quickProjectPillsContainer');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      const pillIds = Array.from(new Set([project.projectnummer, ...(AppState.recentProjectIds || [])])).slice(0, 5);

      pillIds.forEach(pid => {
        const p = AppState.projects.find(item => item.projectnummer === pid);
        if (!p) return;
        const pm = calculateProjectMetrics(p);
        const isCurrent = p.projectnummer === project.projectnummer;
        const dotColor = pm.statusLevel === 'ROOD' ? 'bg-rose-500' : (pm.statusLevel === 'ORANJE' ? 'bg-amber-500' : 'bg-emerald-500');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isCurrent
          ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#0a2246] text-white shadow-2xs cursor-pointer shrink-0'
          : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#f4f7fb] hover:bg-[#eef3f9] text-[#0a2246] border border-[#dbe4f0] cursor-pointer shrink-0';
        btn.innerHTML = `
          <span class="w-2 h-2 rounded-full ${dotColor}"></span>
          <span class="font-mono-num">${p.projectnummer}</span>
          <span class="max-w-[110px] truncate hidden sm:inline">${AppState.clientViewActive ? p.projectnaam : p.klant}</span>
        `;
        btn.addEventListener('click', () => {
          openProjectStatusScreen(p.projectnummer);
        });
        pillsContainer.appendChild(btn);
      });
    }

    // 1. ISP Project Titel & Stamdata
    const headerProjId = document.getElementById('headerProjectId');
    if (headerProjId) headerProjId.textContent = project.projectnummer;

    const subProjNum = document.getElementById('subProjectNumber');
    if (subProjNum) subProjNum.textContent = project.projectnummer;

    const headerTitle = document.getElementById('headerFullIspTitle');
    if (headerTitle) headerTitle.textContent = fullIspTitle;

    const headerClient = document.getElementById('headerClientName');
    if (headerClient) headerClient.textContent = AppState.clientViewActive ? 'Vertrouwelijk (Klantweergave)' : project.klant;

    const headerDesc = document.getElementById('headerProjectName');
    if (headerDesc) headerDesc.textContent = project.projectnaam;

    const headerRate = document.getElementById('headerHourlyRate');
    if (headerRate) headerRate.textContent = `${formatEuro(m.uurtarief)}/u`;

    const headerSales = document.getElementById('headerSalesPrice');
    if (headerSales) headerSales.textContent = formatEuro(m.verkoopprijs);

    const headerMarginBadge = document.getElementById('headerSalesMarginBadge');
    if (headerMarginBadge) {
      headerMarginBadge.textContent = `Marge: ${formatSignedEuro(m.gerealiseerdeMargeEuro)} (${m.gerealiseerdeMargePct.toFixed(1).replace('.', ',')}%)`;
    }

    const printPhase = document.getElementById('printProjectPhase');
    if (printPhase) printPhase.textContent = project.status;

    // Fase Toggles
    const isLopend = project.status === 'Lopend';
    const btnLopend = document.getElementById('statusToggleLopend');
    const btnAfgerond = document.getElementById('statusToggleAfgerond');
    if (btnLopend && btnAfgerond) {
      if (isLopend) {
        btnLopend.className = 'px-3.5 py-1.5 text-xs font-extrabold bg-white text-[#0a2246] shadow-xs transition cursor-pointer';
        btnAfgerond.className = 'px-3.5 py-1.5 text-xs font-semibold text-blue-200 hover:text-white transition cursor-pointer';
      } else {
        btnLopend.className = 'px-3.5 py-1.5 text-xs font-semibold text-blue-200 hover:text-white transition cursor-pointer';
        btnAfgerond.className = 'px-3.5 py-1.5 text-xs font-extrabold bg-white text-[#0a2246] shadow-xs transition cursor-pointer';
      }
    }

    // AI Focus Omschrijving
    const aiFocus = document.getElementById('aiFocusDescription');
    if (aiFocus) {
      if (isLopend) {
        aiFocus.innerHTML = 'Analysefocus: <strong>Lopend Project</strong> &mdash; In simpele taal: stand van zaken, aandachtspunten en acties.';
      } else {
        aiFocus.innerHTML = 'Analysefocus: <strong>Afgerond Project</strong> &mdash; In simpele taal: eindresultaat en handige lessen voor nieuwe offertes.';
      }
    }

    // =========================================================================
    // 2. STATUS BANNER (Verborgen — gebruiker wil enkel de 4 KPI-kaarten zien)
    // =========================================================================
    const banner = document.getElementById('mainStatusBanner');
    const iconBox = document.getElementById('mainStatusIconBox');
    const mainTitle = document.getElementById('mainStatusTitle');
    const mainReason = document.getElementById('mainStatusReason');

    if (banner) {
      banner.classList.add('hidden');
    }

    // =========================================================================
    // 3. KERNINDICATOREN: BUDGET, UREN, MATERIAAL, LEVERANCIERS (GOED / MATIG / SLECHT)
    // =========================================================================
    // KPI 1: Budget
    const cardBudget = document.getElementById('cardDiagBudget');
    const chipBudget = document.getElementById('kpiBudgetChip');
    const verdictBudget = document.getElementById('kpiBudgetVerdictWord');
    const diffEuroBudget = document.getElementById('kpiBudgetDiffEuro');
    const subtextBudget = document.getElementById('kpiBudgetSubtext');

    if (cardBudget && chipBudget && verdictBudget && diffEuroBudget) {
      if (m.afwijkingBudgetPct >= 10) {
        // Slecht (Rood)
        cardBudget.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-rose-500 border-x border-b border-rose-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictBudget.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 shrink-0';
        verdictBudget.textContent = 'Slecht';
        chipBudget.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-rose-50 text-rose-700 border border-rose-200';
        diffEuroBudget.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight mt-1 text-rose-700';
      } else if (m.afwijkingBudgetPct > 0) {
        // Matig (Oranje)
        cardBudget.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-amber-500 border-x border-b border-amber-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictBudget.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 shrink-0';
        verdictBudget.textContent = 'Matig';
        chipBudget.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-amber-50 text-amber-800 border border-amber-200';
        diffEuroBudget.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight mt-1 text-amber-800';
      } else {
        // Goed (Groen)
        cardBudget.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-emerald-500 border-x border-b border-emerald-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictBudget.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0';
        verdictBudget.textContent = 'Goed';
        chipBudget.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        diffEuroBudget.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight mt-1 text-slate-900';
      }

      chipBudget.textContent = formatSignedPct(m.afwijkingBudgetPct);
      diffEuroBudget.textContent = formatSignedEuro(m.verschilBudget);
      subtextBudget.textContent = m.verschilBudget >= 0 ? 'Binnen begroot budget' : 'Boven begroot budget';

      const plannedEl = document.getElementById('kpiBudgetTotalPlanned');
      const actualEl = document.getElementById('kpiBudgetTotalActual');
      const salesEl = document.getElementById('kpiBudgetSalesPrice');
      const clientPctEl = document.getElementById('kpiBudgetClientPct');
      if (plannedEl) plannedEl.textContent = formatEuro(m.totaalBegrootBudget);
      if (actualEl) actualEl.textContent = formatEuro(m.totaleWerkelijkeKosten);
      if (salesEl) salesEl.textContent = formatEuro(m.verkoopprijs);
      if (clientPctEl) clientPctEl.textContent = formatSignedPct(m.afwijkingBudgetPct);
    }

    // KPI 2: Uren
    const cardHours = document.getElementById('cardDiagHours');
    const chipHours = document.getElementById('kpiHoursChip');
    const verdictHours = document.getElementById('kpiHoursVerdictWord');
    const actualHoursEl = document.getElementById('kpiHoursActual');
    const plannedHoursEl = document.getElementById('kpiHoursPlanned');
    const diffHoursEl = document.getElementById('kpiHoursDiffText');
    const barHours = document.getElementById('kpiHoursProgressBar');

    if (cardHours && chipHours && verdictHours && actualHoursEl) {
      if (m.afwijkingUrenPct >= 10) {
        // Slecht (Rood)
        cardHours.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-rose-500 border-x border-b border-rose-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictHours.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 shrink-0';
        verdictHours.textContent = 'Slecht';
        chipHours.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-rose-50 text-rose-700 border border-rose-200';
        actualHoursEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-rose-700';
        if (diffHoursEl) diffHoursEl.className = 'text-xs text-rose-600 mt-1';
        if (barHours) barHours.className = 'h-full bg-rose-600 rounded-full transition-all duration-300';
      } else if (m.afwijkingUrenPct > 0) {
        // Matig (Oranje)
        cardHours.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-amber-500 border-x border-b border-amber-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictHours.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 shrink-0';
        verdictHours.textContent = 'Matig';
        chipHours.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-amber-50 text-amber-800 border border-amber-200';
        actualHoursEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-amber-800';
        if (diffHoursEl) diffHoursEl.className = 'text-xs text-amber-700 mt-1';
        if (barHours) barHours.className = 'h-full bg-amber-500 rounded-full transition-all duration-300';
      } else {
        // Goed (Groen)
        cardHours.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-emerald-500 border-x border-b border-emerald-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictHours.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0';
        verdictHours.textContent = 'Goed';
        chipHours.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        actualHoursEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-slate-900';
        if (diffHoursEl) diffHoursEl.className = 'text-xs text-slate-500 mt-1';
        if (barHours) barHours.className = 'h-full bg-emerald-500 rounded-full transition-all duration-300';
      }

      chipHours.textContent = formatSignedPct(m.afwijkingUrenPct);
      actualHoursEl.textContent = formatNumber(m.werkelijkeUren);
      if (plannedHoursEl) plannedHoursEl.textContent = formatNumber(m.begroteUren);

      const hoursRem = m.begroteUren - m.werkelijkeUren;
      if (diffHoursEl) {
        diffHoursEl.textContent = hoursRem >= 0 ? `Nog ${formatNumber(hoursRem)} u beschikbaar` : `${formatNumber(Math.abs(hoursRem))} u overschrijding`;
      }

      if (barHours) {
        const pctBar = m.begroteUren > 0 ? Math.min(100, Math.round((m.werkelijkeUren / m.begroteUren) * 100)) : 100;
        barHours.style.width = `${pctBar}%`;
      }

      const laborPlanned = document.getElementById('kpiLaborPlanned');
      const laborActual = document.getElementById('kpiLaborActual');
      if (laborPlanned) laborPlanned.textContent = formatEuro(m.arbeidBegroot);
      if (laborActual) laborActual.textContent = formatEuro(m.arbeidWerkelijk);
    }

    // KPI 3: Materiaal
    const cardMat = document.getElementById('cardDiagMaterial');
    const chipMat = document.getElementById('kpiMaterialChip');
    const verdictMat = document.getElementById('kpiMaterialVerdictWord');
    const actualMatEl = document.getElementById('kpiMaterialActual');
    const plannedMatEl = document.getElementById('kpiMaterialPlanned');
    const diffMatEl = document.getElementById('kpiMaterialDiffEuro');

    if (cardMat && chipMat && verdictMat && actualMatEl) {
      if (m.afwijkingMateriaalPct >= 10) {
        // Slecht (Rood)
        cardMat.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-rose-500 border-x border-b border-rose-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictMat.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 shrink-0';
        verdictMat.textContent = 'Slecht';
        chipMat.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-rose-50 text-rose-700 border border-rose-200';
        actualMatEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-rose-700';
        if (diffMatEl) diffMatEl.className = 'font-mono-num font-bold text-rose-700';
      } else if (m.afwijkingMateriaalPct > 0) {
        // Matig (Oranje)
        cardMat.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-amber-500 border-x border-b border-amber-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictMat.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 shrink-0';
        verdictMat.textContent = 'Matig';
        chipMat.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-amber-50 text-amber-800 border border-amber-200';
        actualMatEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-amber-800';
        if (diffMatEl) diffMatEl.className = 'font-mono-num font-bold text-amber-800';
      } else {
        // Goed (Groen)
        cardMat.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-emerald-500 border-x border-b border-emerald-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictMat.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0';
        verdictMat.textContent = 'Goed';
        chipMat.className = 'px-2 py-0.5 rounded text-xs font-mono-num font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        actualMatEl.className = 'text-2xl sm:text-3xl font-extrabold font-mono-num text-slate-900';
        if (diffMatEl) diffMatEl.className = 'font-mono-num font-bold text-slate-700';
      }

      chipMat.textContent = formatSignedPct(m.afwijkingMateriaalPct);
      actualMatEl.textContent = formatEuro(m.werkelijkMateriaal);
      if (plannedMatEl) plannedMatEl.textContent = formatEuro(m.begrootMateriaal);
      if (diffMatEl) diffMatEl.textContent = formatSignedEuro(m.verschilMateriaal);
      const matClientPct = document.getElementById('kpiMaterialClientPct');
      if (matClientPct) matClientPct.textContent = formatSignedPct(m.afwijkingMateriaalPct);
    }

    // KPI 4: Leveranciers
    const cardSup = document.getElementById('cardDiagSupplier');
    const badgeSup = document.getElementById('kpiSupplierBadge');
    const verdictSup = document.getElementById('kpiSupplierVerdictWord');
    const textSup = document.getElementById('kpiSupplierStatusText');
    const flagSup = document.getElementById('kpiMorningEscalationFlag');

    if (cardSup && badgeSup && verdictSup && textSup) {
      if (m.heeftVertraging) {
        // Matig of Slecht
        const isCriticalDelay = project.bestelstatus.toLowerCase().includes('kritiek') || m.statusLevel === 'ROOD';
        if (isCriticalDelay) {
          cardSup.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-rose-500 border-x border-b border-rose-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
          verdictSup.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-300 shrink-0';
          verdictSup.textContent = 'Slecht';
          badgeSup.className = 'px-2 py-0.5 rounded text-xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200';
          badgeSup.textContent = 'Vertraging';
          textSup.className = 'text-base sm:text-lg font-bold text-rose-700 tracking-tight truncate mt-1';
        } else {
          cardSup.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-amber-500 border-x border-b border-amber-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
          verdictSup.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 shrink-0';
          verdictSup.textContent = 'Matig';
          badgeSup.className = 'px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200';
          badgeSup.textContent = 'Vertraging';
          textSup.className = 'text-base sm:text-lg font-bold text-amber-800 tracking-tight truncate mt-1';
        }
        if (flagSup) {
          flagSup.className = 'font-bold text-amber-700';
          flagSup.textContent = 'Bespreken in overleg';
        }
      } else {
        // Goed (Groen)
        cardSup.className = 'bg-white rounded-xl shadow-xs border-t-4 border-t-emerald-500 border-x border-b border-emerald-200 p-4 sm:p-5 flex flex-col justify-between print-card print-break-inside-avoid transition-all';
        verdictSup.className = 'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0';
        verdictSup.textContent = 'Goed';
        badgeSup.className = 'px-2 py-0.5 rounded text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200';
        badgeSup.textContent = 'Op schema';
        textSup.className = 'text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate mt-1';
        if (flagSup) {
          flagSup.className = 'font-bold text-emerald-600';
          flagSup.textContent = 'Geen actie nodig';
        }
      }
      textSup.textContent = project.bestelstatus;
    }

    // AI Checkbox & Advies weergave
    const humanCheckbox = document.getElementById('humanVerifiedCheckbox');
    if (humanCheckbox) humanCheckbox.checked = Boolean(project.aiVerified);

    renderAiReportContent(project, m);

    // Formulier velden invullen indien gewenst
    if (populateFormInputs) {
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };
      setVal('inputProjectId', project.projectnummer);
      setVal('inputClientName', project.klant);
      setVal('inputProjectName', project.projectnaam);
      setVal('inputPlannedHours', project.begroteUren);
      setVal('inputActualHours', project.werkelijkeUren);
      setVal('inputHourlyRate', m.uurtarief);
      setVal('inputPlannedMaterial', project.begrootMateriaal);
      setVal('inputActualMaterial', project.werkelijkMateriaal);
      setVal('inputSalesPrice', m.verkoopprijs);
      setVal('inputSupplierStatus', project.bestelstatus);
      const delayFlag = document.getElementById('inputSupplierDelayFlag');
      if (delayFlag) delayFlag.checked = Boolean(m.heeftVertraging);
    }

    // Bewerkbare vergelijkingstabel bijwerken
    updateComparisonTableCells(m);

    // Grafieken bijwerken
    updateCharts(project, m, AppState.clientViewActive);
  }

  /**
   * Update de cellen van de vergelijkingstabel
   */
  function updateComparisonTableCells(m) {
    const hoursDiffEl = document.getElementById('tableHoursDiff');
    const hoursPctEl = document.getElementById('tableHoursPct');
    if (hoursDiffEl) {
      hoursDiffEl.textContent = `${formatSignedPct(m.afwijkingUrenPct)} (${formatNumber(Math.abs(m.verschilUren))} u ${m.verschilUren >= 0 ? 'over' : 'te veel'})`;
      hoursDiffEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.verschilUren >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
      hoursPctEl.textContent = formatSignedPct(m.afwijkingUrenPct);
      hoursPctEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.afwijkingUrenPct <= 0 ? 'text-emerald-700' : (m.afwijkingUrenPct < 10 ? 'text-amber-800' : 'text-rose-700')}`;
    }

    const labPlanEl = document.getElementById('tableLaborPlanned');
    if (labPlanEl) {
      labPlanEl.textContent = formatEuro(m.arbeidBegroot);
      document.getElementById('tableLaborActual').textContent = formatEuro(m.arbeidWerkelijk);
      const labDiffEl = document.getElementById('tableLaborDiff');
      labDiffEl.textContent = formatSignedEuro(m.verschilArbeid);
      labDiffEl.className = `py-2.5 px-4 text-right font-mono-num font-bold ${m.verschilArbeid >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
      document.getElementById('tableLaborPct').textContent = formatSignedPct(m.afwijkingUrenPct);
    }

    const matDiffEl = document.getElementById('tableMaterialDiff');
    if (matDiffEl) {
      matDiffEl.textContent = formatSignedEuro(m.verschilMateriaal);
      matDiffEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.verschilMateriaal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
      const matPctEl = document.getElementById('tableMaterialPct');
      matPctEl.textContent = formatSignedPct(m.afwijkingMateriaalPct);
      matPctEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.afwijkingMateriaalPct <= 0 ? 'text-emerald-700' : (m.afwijkingMateriaalPct < 10 ? 'text-amber-800' : 'text-rose-700')}`;
    }

    const totPlanEl = document.getElementById('tableTotalPlanned');
    if (totPlanEl) {
      totPlanEl.textContent = formatEuro(m.totaalBegrootBudget);
      document.getElementById('tableTotalActual').textContent = formatEuro(m.totaleWerkelijkeKosten);
      const totDiffEl = document.getElementById('tableTotalDiff');
      const totPctEl = document.getElementById('tableTotalPct');
      totDiffEl.textContent = formatSignedEuro(m.verschilBudget);
      totPctEl.textContent = formatSignedPct(m.afwijkingBudgetPct);
      totDiffEl.className = `py-4 px-4 text-right font-mono-num text-sm ${m.verschilBudget >= 0 ? 'text-emerald-300' : 'text-rose-300'}`;
      totPctEl.className = `py-4 px-4 text-right font-mono-num text-sm ${m.afwijkingBudgetPct <= 0 ? 'text-emerald-300' : (m.afwijkingBudgetPct < 10 ? 'text-amber-300' : 'text-rose-300')}`;
    }

    const salesMarginEuroEl = document.getElementById('tableSalesMarginEuro');
    const salesMarginPctEl = document.getElementById('tableSalesMarginPct');
    if (salesMarginEuroEl) {
      salesMarginEuroEl.textContent = formatSignedEuro(m.gerealiseerdeMargeEuro);
      salesMarginEuroEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.gerealiseerdeMargeEuro >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
    }
    if (salesMarginPctEl) {
      salesMarginPctEl.textContent = `${m.gerealiseerdeMargePct.toFixed(1).replace('.', ',')}%`;
      salesMarginPctEl.className = `py-3.5 px-4 text-right font-mono-num font-bold ${m.gerealiseerdeMargePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
    }
  }

  /**
   * Update de twee Chart.js grafieken
   */
  function updateCharts(project, metrics, isClientView) {
    const hoursCanvas = document.getElementById('hoursChartCanvas');
    const financeCanvas = document.getElementById('financeChartCanvas');
    if (!hoursCanvas || !financeCanvas || typeof Chart === 'undefined') return;

    const hoursCtx = hoursCanvas.getContext('2d');
    const financeCtx = financeCanvas.getContext('2d');

    let actualHoursColor = '#10b981';
    if (metrics.afwijkingUrenPct >= 10) {
      actualHoursColor = '#e11d48';
    } else if (metrics.afwijkingUrenPct > 0) {
      actualHoursColor = '#f59e0b';
    }

    const hoursBadge = document.getElementById('chartHoursBadge');
    if (hoursBadge) {
      hoursBadge.textContent = `${formatNumber(metrics.werkelijkeUren)} / ${formatNumber(metrics.begroteUren)} u (${formatSignedPct(metrics.afwijkingUrenPct)})`;
    }

    if (hoursChartInstance) {
      hoursChartInstance.destroy();
    }

    hoursChartInstance = new Chart(hoursCtx, {
      type: 'bar',
      data: {
        labels: ['Begrote Uren (Voorcalculatie)', 'Werkelijke Uren (Nacalculatie)'],
        datasets: [{
          label: 'Uren (werkplaats)',
          data: [metrics.begroteUren, metrics.werkelijkeUren],
          backgroundColor: ['#0a2246', actualHoursColor],
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw} uur (${metrics.uurtarief ? formatEuro(ctx.raw * metrics.uurtarief) : ''})`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: val => `${val} u` },
            grid: { color: '#eef3f9' }
          },
          x: { grid: { display: false } }
        }
      }
    });

    const financeBadge = document.getElementById('chartFinanceBadge');
    if (financeBadge) {
      financeBadge.textContent = isClientView ? 'Kostenopbouw' : `Tot. Werkelijk: ${formatEuro(metrics.totaleWerkelijkeKosten)}`;
    }

    if (financeChartInstance) {
      financeChartInstance.destroy();
    }

    const plannedLabor = isClientView ? 50 : metrics.arbeidBegroot;
    const actualLabor = isClientView ? 50 : metrics.arbeidWerkelijk;
    const plannedMat = isClientView ? 50 : metrics.begrootMateriaal;
    const actualMat = isClientView ? 50 : metrics.werkelijkMateriaal;

    financeChartInstance = new Chart(financeCtx, {
      type: 'bar',
      data: {
        labels: ['Voorcalculatie', 'Werkelijk (Nacalculatie)'],
        datasets: [
          {
            label: 'Arbeidskosten (€)',
            data: [plannedLabor, actualLabor],
            backgroundColor: '#0a2246',
            borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 8, bottomRight: 8 },
            barThickness: 42
          },
          {
            label: 'Materiaal & Inkoop (€)',
            data: [plannedMat, actualMat],
            backgroundColor: '#2b5fb3',
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
            barThickness: 42
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
          tooltip: {
            callbacks: {
              label: ctx => isClientView ? ` ${ctx.dataset.label}` : ` ${ctx.dataset.label}: ${formatEuro(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { callback: val => isClientView ? `${val}%` : `€ ${val.toLocaleString('nl-NL')}` },
            grid: { color: '#eef3f9' }
          }
        }
      }
    });
  }

  // =========================================================================
  // AI-ADVIES ENGINE (GEMINI REST API & FALLBACK)
  // =========================================================================
  function renderAiReportContent(project, metrics) {
    const analysis = generateRealisticDemoAnalysis(prepareProjectDataForAi(project, metrics, AppState.anonymizeBeforeAi));

    const vEl = document.getElementById('aiSectionVerdict');
    const bEl = document.getElementById('aiSectionBottlenecks');
    const aEl = document.getElementById('aiSectionAdvice');

    if (vEl) vEl.innerHTML = analysis.verdictHtml;
    if (bEl) bEl.innerHTML = analysis.bottlenecksHtml;
    if (aEl) aEl.innerHTML = analysis.adviceHtml;

    const timeEl = document.getElementById('aiLastGeneratedTime');
    if (timeEl && !timeEl.textContent) {
      timeEl.textContent = `Laatst bijgewerkt: ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  function prepareProjectDataForAi(project, metrics, anonymize) {
    return {
      projectnummer: project.projectnummer,
      klant: anonymize ? 'OPDRACHTGEVER_GEANONYMISEERD' : project.klant,
      projectnaam: anonymize ? 'Machinebouw_Project' : project.projectnaam,
      status: project.status,
      begroteUren: metrics.begroteUren,
      werkelijkeUren: metrics.werkelijkeUren,
      verschilUren: metrics.verschilUren,
      afwijkingUrenPct: metrics.afwijkingUrenPct.toFixed(1),
      uurtarief: metrics.uurtarief,
      arbeidBegroot: metrics.arbeidBegroot,
      arbeidWerkelijk: metrics.arbeidWerkelijk,
      begrootMateriaal: metrics.begrootMateriaal,
      werkelijkMateriaal: metrics.werkelijkMateriaal,
      verschilMateriaal: metrics.verschilMateriaal,
      afwijkingMateriaalPct: metrics.afwijkingMateriaalPct.toFixed(1),
      totaalBegrootBudget: metrics.totaalBegrootBudget,
      totaleWerkelijkeKosten: metrics.totaleWerkelijkeKosten,
      verschilBudget: metrics.verschilBudget,
      afwijkingBudgetPct: metrics.afwijkingBudgetPct.toFixed(1),
      bestelstatus: project.bestelstatus,
      heeftVertraging: metrics.heeftVertraging,
      statusLevel: metrics.statusLevel,
      statusLabel: metrics.statusLabel
    };
  }

  function generateRealisticDemoAnalysis(payload) {
    const isLopend = payload.status === 'Lopend';
    const isRed = payload.statusLevel === 'ROOD';
    const isOrange = payload.statusLevel === 'ORANJE';
    const hasDelay = payload.heeftVertraging;

    let verdictHtml = '';
    let bottlenecksHtml = '';
    let adviceHtml = '';

    if (isLopend) {
      if (isRed) {
        verdictHtml = `
          <div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-extrabold text-xs">
            Aandacht vereist &mdash; Overschrijding van het budget
          </div>
          <p class="text-xs leading-relaxed text-slate-700 mt-2">
            Dit project loopt op dit moment niet volgens plan. Het budget wordt overschreden met <strong>${payload.afwijkingBudgetPct}%</strong> (&euro;&nbsp;${Math.abs(payload.verschilBudget).toLocaleString('nl-NL')}). Tijd om even bij te sturen.
          </p>
        `;
        bottlenecksHtml = `
          <ul class="text-xs space-y-1.5 list-disc list-inside text-slate-700">
            <li><strong>Uren in de werkplaats:</strong> Er zijn ${Math.abs(payload.verschilUren)} uur meer gemaakt dan begroot (+${payload.afwijkingUrenPct}%).</li>
            <li><strong>Materiaalkosten:</strong> Inkoop valt &euro;&nbsp;${Math.abs(payload.verschilMateriaal).toLocaleString('nl-NL')} hoger uit (+${payload.afwijkingMateriaalPct}%).</li>
            ${hasDelay ? `<li class="text-amber-800 font-bold"><strong>Levering onderdelen:</strong> ${payload.bestelstatus}</li>` : '<li><strong>Onderdelen:</strong> Alle bestelde delen zijn aanwezig in de werkplaats.</li>'}
          </ul>
        `;
        adviceHtml = `
          <div class="space-y-1.5 text-xs text-slate-700">
            <p><strong>Wat kun je nu doen?</strong></p>
            <ol class="list-decimal list-inside space-y-1 text-slate-700">
              <li>Bespreek de uren direct bij het overleg van 07:00 met de werkplaats.</li>
              <li>${hasDelay ? 'Bel vandaag met de leverancier om de exacte levertermijn vast te leggen.' : 'Controleer hoeveel werk er nog precies moet gebeuren om het project af te ronden.'}</li>
              <li>Overleg met de klant over eventueel meerwerk voor de extra gemaakte uren.</li>
            </ol>
          </div>
        `;
      } else if (isOrange) {
        verdictHtml = `
          <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-extrabold text-xs">
            Matig &mdash; Let op de uren en planning
          </div>
          <p class="text-xs leading-relaxed text-slate-700 mt-2">
            Het project loopt nog redelijk, maar er zijn een paar punten die aandacht vragen (+${payload.afwijkingBudgetPct}% op het budget). Met wat extra oplettendheid blijft het netjes binnen de perken.
          </p>
        `;
        bottlenecksHtml = `
          <ul class="text-xs space-y-1.5 list-disc list-inside text-slate-700">
            <li><strong>Resterende uren:</strong> Er zijn nog ${Math.max(0, payload.verschilUren)} van de ${payload.begroteUren} begrote uren over.</li>
            <li><strong>Leverancier &amp; bestellingen:</strong> ${payload.bestelstatus}</li>
          </ul>
        `;
        adviceHtml = `
          <div class="space-y-1.5 text-xs text-slate-700">
            <p><strong>Wat kun je nu doen?</strong></p>
            <ol class="list-decimal list-inside space-y-1 text-slate-700">
              <li>Stem tijdens het overleg van 07:00 even af met de voorman in de werkplaats.</li>
              <li>${hasDelay ? 'Houd de levering van de vertraagde onderdelen scherp in de gaten.' : 'Zorg dat de resterende werkzaamheden binnen het beschikbare urenbudget blijven.'}</li>
              <li>Check alvast of de volgende bewerking direct kan starten.</li>
            </ol>
          </div>
        `;
      } else {
        verdictHtml = `
          <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-extrabold text-xs">
            Goed &mdash; Loopt keurig volgens planning
          </div>
          <p class="text-xs leading-relaxed text-slate-700 mt-2">
            Dit project loopt uitstekend. Zowel de uren in de werkplaats als de materiaalkosten blijven netjes binnen de begroting (ruimte van &euro;&nbsp;${payload.verschilBudget.toLocaleString('nl-NL')}).
          </p>
        `;
        bottlenecksHtml = `
          <p class="text-xs text-slate-700">
            Geen knelpunten. Alle onderdelen zijn op tijd binnen en de uren lopen precies volgens verwachting. Er is nog <strong>${payload.verschilUren} uur</strong> begroot.
          </p>
        `;
        adviceHtml = `
          <div class="space-y-1.5 text-xs text-slate-700">
            <p><strong>Wat kun je nu doen?</strong></p>
            <ol class="list-decimal list-inside space-y-1 text-slate-700">
              <li>Lekker zo doorgaan, geen actie nodig voor het ochtendoverleg.</li>
              <li>Alvast de eindcontrole en het transport naar de klant inplannen.</li>
            </ol>
          </div>
        `;
      }
    } else {
      // Afgerond project
      verdictHtml = `
        <div class="p-2.5 rounded-lg ${isRed ? 'bg-rose-50 border border-rose-200 text-rose-950' : 'bg-blue-50 border border-blue-200 text-[#0a2246]'} font-extrabold text-xs">
          Afgerond &mdash; ${isRed ? 'Project met overschrijding afgesloten' : 'Project succesvol en binnen budget afgerond'}
        </div>
        <p class="text-xs leading-relaxed text-slate-700 mt-2">
          Eindresultaat: <strong>${payload.verschilBudget >= 0 ? '+' : ''}&euro;&nbsp;${payload.verschilBudget.toLocaleString('nl-NL')}</strong> (${payload.afwijkingBudgetPct}% afwijking t.o.v. de begroting).
        </p>
      `;
      bottlenecksHtml = `
        <div class="text-xs space-y-1 text-slate-700">
          <p><strong>Overzicht nacalculatie:</strong></p>
          <p>Werkelijke uren: <strong>${payload.werkelijkeUren} u</strong> (begroot: ${payload.begroteUren} u). Materiaalkosten: <strong>&euro;&nbsp;${payload.werkelijkMateriaal.toLocaleString('nl-NL')}</strong> (begroot: &euro;&nbsp;${payload.begrootMateriaal.toLocaleString('nl-NL')}).</p>
        </div>
      `;
      adviceHtml = `
        <div class="space-y-1 text-xs text-slate-700">
          <p><strong>Wat leren we hiervan voor volgende offertes?</strong></p>
          <ol class="list-decimal list-inside space-y-1 text-slate-700">
            <li>${isRed ? 'Reken bij een volgend soortgelijk project wat extra uren en materiaalmarge in de offerte.' : 'Deze calculatie klopte heel goed; bewaar dit project als handig sjabloon voor nieuwe aanvragen.'}</li>
            <li>Dossier is compleet en klaar voor het archief.</li>
          </ol>
        </div>
      `;
    }

    return { verdictHtml, bottlenecksHtml, adviceHtml };
  }

  async function callGeminiApi(payload, apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `
Je bent een ervaren senior projectcontroller en technisch adviseur bij machinebouw- en constructiebedrijf "Industrial Solution Partner" (ISP Barendrecht).
Analyseer onderstaande voorcalculatie vs. nacalculatie gegevens van een project:

Projectgegevens:
- Projectnummer: ${payload.projectnummer}
- Klant: ${payload.klant}
- Projectnaam: ${payload.projectnaam}
- Fase: ${payload.status} (Lopend of Afgerond)
- Begrote uren: ${payload.begroteUren} u | Werkelijke uren: ${payload.werkelijkeUren} u (Afwijking: ${payload.afwijkingUrenPct}%)
- Uurtarief: € ${payload.uurtarief}/u
- Begroot materiaal: € ${payload.begrootMateriaal} | Werkelijk materiaal: € ${payload.werkelijkMateriaal} (Afwijking: ${payload.afwijkingMateriaalPct}%)
- Totaal begroot budget: € ${payload.totaalBegrootBudget} | Totale werkelijke kosten: € ${payload.totaleWerkelijkeKosten}
- Marge / Verschil Budget: € ${payload.verschilBudget} (${payload.afwijkingBudgetPct}%)
- Bestel- en toeleveranciersstatus: ${payload.bestelstatus}
- Heeft vertraging: ${payload.heeftVertraging ? 'JA' : 'NEE'}

Geef je analyse in heldere, simpele en begrijpelijke mensentaal (geen moeilijke managementtaal of jargon). Structureer in exact 3 delen:
DEEL 1: HOE STAAT HET ERVOOR? (Loopt het project goed, matig of is er een overschrijding?)
DEEL 2: WAAR MOET JE OP LETTEN? (Wat zijn de concrete aandachtspunten qua uren, materiaal of levering?)
DEEL 3: WAT MOET ER NU GEBEUREN? (Concreet en praktisch advies voor het ochtendoverleg of de volgende stap)

Houd de taal vriendelijk, duidelijk en praktisch gericht op de werkplaats en projectleiding van ISP.
`;

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawAiText) throw new Error('Geen tekst ontvangen van Gemini API');

    return parseGeminiResponseText(rawAiText, payload);
  }

  function parseGeminiResponseText(text, payload) {
    const lines = text.split('\n');
    let part1 = [];
    let part2 = [];
    let part3 = [];
    let currentPart = 1;

    for (let line of lines) {
      const upper = line.toUpperCase();
      if (upper.includes('DEEL 1') || upper.includes('HOE STAAT') || upper.includes('DIRECT OORDEEL')) {
        currentPart = 1;
        continue;
      }
      if (upper.includes('DEEL 2') || upper.includes('WAAR MOET JE OP LETTEN') || upper.includes('KNELPUNT') || upper.includes('AANDACHTSPUNT')) {
        currentPart = 2;
        continue;
      }
      if (upper.includes('DEEL 3') || upper.includes('WAT MOET ER NU GEBEUREN') || upper.includes('OPERATIONEEL ADVIES') || upper.includes('ADVIES')) {
        currentPart = 3;
        continue;
      }

      if (currentPart === 1) part1.push(line);
      else if (currentPart === 2) part2.push(line);
      else if (currentPart === 3) part3.push(line);
    }

    const formatBlock = arr => {
      const str = arr.join('\n').trim();
      if (!str) return '<p class="text-xs text-slate-600">Geen specifieke bijzonderheden.</p>';
      return str.split('\n\n').map(p => `<p class="text-xs leading-relaxed text-slate-800">${p.replace(/\n/g, '<br>')}</p>`).join('');
    };

    return {
      verdictHtml: formatBlock(part1.length ? part1 : [text.slice(0, 300)]),
      bottlenecksHtml: formatBlock(part2.length ? part2 : ['Alles loopt volgens verwachting.']),
      adviceHtml: formatBlock(part3.length ? part3 : ['Bespreek de planning tijdens het ochtendoverleg.'])
    };
  }

  async function triggerAiReportGeneration() {
    const project = AppState.getCurrentProject();
    if (!project) return;

    const btn = document.getElementById('generateAiReportBtn');
    const btnText = document.getElementById('aiBtnText');
    const originalText = btnText.textContent;
    btn.disabled = true;
    btnText.textContent = 'Bezig met genereren...';

    const metrics = calculateProjectMetrics(project);
    const payload = prepareProjectDataForAi(project, metrics, AppState.anonymizeBeforeAi);

    try {
      if (AppState.geminiApiKey && AppState.geminiApiKey.trim().length > 5) {
        const liveAnalysis = await callGeminiApi(payload, AppState.geminiApiKey.trim());
        document.getElementById('aiSectionVerdict').innerHTML = liveAnalysis.verdictHtml;
        document.getElementById('aiSectionBottlenecks').innerHTML = liveAnalysis.bottlenecksHtml;
        document.getElementById('aiSectionAdvice').innerHTML = liveAnalysis.adviceHtml;
        showToast('Live Gemini AI Voortgangsrapport succesvol gegenereerd!');
      } else {
        const dummy = generateRealisticDemoAnalysis(payload);
        document.getElementById('aiSectionVerdict').innerHTML = dummy.verdictHtml;
        document.getElementById('aiSectionBottlenecks').innerHTML = dummy.bottlenecksHtml;
        document.getElementById('aiSectionAdvice').innerHTML = dummy.adviceHtml;
        showToast('Demo-analyse geladen (Voeg Gemini API-sleutel toe voor live LLM)');
      }

      const timeEl = document.getElementById('aiLastGeneratedTime');
      if (timeEl) {
        timeEl.textContent = `Laatst gegenereerd: ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      }
    } catch (err) {
      console.error('Fout bij AI aanroep:', err);
      showToast(`AI Fout: ${err.message}. Teruggevallen op demo-advies.`);
      const dummy = generateRealisticDemoAnalysis(payload);
      document.getElementById('aiSectionVerdict').innerHTML = dummy.verdictHtml;
      document.getElementById('aiSectionBottlenecks').innerHTML = dummy.bottlenecksHtml;
      document.getElementById('aiSectionAdvice').innerHTML = dummy.adviceHtml;
    } finally {
      btn.disabled = false;
      btnText.textContent = originalText;
    }
  }

  /**
   * Event listeners voor Tab 2
   */
  function setupDashboardListeners() {
    // Terug naar zoeker
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        switchTab('home');
      });
    }

    // Quick jump invoerveld
    const jumpForm = document.getElementById('dashboardQuickJumpForm');
    const jumpInput = document.getElementById('dashboardQuickJumpInput');
    if (jumpForm && jumpInput) {
      jumpForm.addEventListener('submit', e => {
        e.preventDefault();
        const val = jumpInput.value.trim();
        if (!val) return;
        const matches = findProjectsBySmartQuery(val);
        if (matches.length > 0) {
          openProjectStatusScreen(matches[0].projectnummer);
        } else {
          showToast(`Project "${val}" niet gevonden.`);
        }
      });
    }

    // Vorige / Volgende Projectnummer knoppen
    const prevBtn = document.getElementById('prevProjectNumBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const current = AppState.getCurrentProject();
        if (!current) return;
        const currentInt = extractProjectNumberInt(current.projectnummer);
        const sortedLower = AppState.projects
          .filter(p => extractProjectNumberInt(p.projectnummer) < currentInt)
          .sort((a, b) => extractProjectNumberInt(b.projectnummer) - extractProjectNumberInt(a.projectnummer));
        if (sortedLower.length > 0) {
          openProjectStatusScreen(sortedLower[0].projectnummer);
        } else {
          showToast(`Geen voorgaand project voor ${current.projectnummer}.`);
        }
      });
    }

    const nextBtn = document.getElementById('nextProjectNumBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const current = AppState.getCurrentProject();
        if (!current) return;
        const currentInt = extractProjectNumberInt(current.projectnummer);
        const sortedHigher = AppState.projects
          .filter(p => extractProjectNumberInt(p.projectnummer) > currentInt)
          .sort((a, b) => extractProjectNumberInt(a.projectnummer) - extractProjectNumberInt(b.projectnummer));
        if (sortedHigher.length > 0) {
          openProjectStatusScreen(sortedHigher[0].projectnummer);
        } else {
          showToast(`Geen volgend project voor ${current.projectnummer}.`);
        }
      });
    }

    // Status toggles [Lopend | Afgerond]
    const btnLopend = document.getElementById('statusToggleLopend');
    if (btnLopend) {
      btnLopend.addEventListener('click', () => {
        const proj = AppState.getCurrentProject();
        if (proj) {
          proj.status = 'Lopend';
          syncCurrentFormToProjectAndRender(false, false);
          showToast(`Projectstatus gewijzigd naar [Lopend]. AI-advies focus aangepast op acute bijsturing.`);
        }
      });
    }

    const btnAfgerond = document.getElementById('statusToggleAfgerond');
    if (btnAfgerond) {
      btnAfgerond.addEventListener('click', () => {
        const proj = AppState.getCurrentProject();
        if (proj) {
          proj.status = 'Afgerond';
          syncCurrentFormToProjectAndRender(false, false);
          showToast(`Projectstatus gewijzigd naar [Afgerond]. AI-advies focus aangepast op post-mortem nacalculatie.`);
        }
      });
    }

    // Step knoppen voor uren (-8, -1, +1, +8)
    document.querySelectorAll('[data-step-hours]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.getAttribute('data-step-hours'), 10) || 0;
        const input = document.getElementById('inputActualHours');
        if (!input) return;
        const current = parseFloat(input.value) || 0;
        input.value = Math.max(0, Math.round((current + delta) * 100) / 100);
        syncCurrentFormToProjectAndRender(false, false);
      });
    });

    // Step knoppen voor materiaal (-500, +500, +1000)
    document.querySelectorAll('[data-step-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseFloat(btn.getAttribute('data-step-material')) || 0;
        const input = document.getElementById('inputActualMaterial');
        if (!input) return;
        const current = parseFloat(input.value) || 0;
        input.value = Math.max(0, Math.round((current + delta) * 100) / 100);
        syncCurrentFormToProjectAndRender(false, false);
      });
    });

    // Leveranciersstatus presets
    document.querySelectorAll('[data-supplier-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-supplier-preset');
        const hasDelay = btn.getAttribute('data-supplier-delay') === 'true';
        const statusInput = document.getElementById('inputSupplierStatus');
        const delayFlag = document.getElementById('inputSupplierDelayFlag');
        if (statusInput) statusInput.value = text;
        if (delayFlag) delayFlag.checked = hasDelay;
        syncCurrentFormToProjectAndRender(false, false);
      });
    });

    // Live form inputs herberekening & automatische opslag
    ['inputClientName', 'inputProjectName', 'inputPlannedHours', 'inputActualHours', 'inputHourlyRate', 'inputPlannedMaterial', 'inputActualMaterial', 'inputSalesPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => syncCurrentFormToProjectAndRender(false, false));
      }
    });

    const idInputEl = document.getElementById('inputProjectId');
    if (idInputEl) {
      idInputEl.addEventListener('change', () => syncCurrentFormToProjectAndRender(true, true));
    }

    const supDelay = document.getElementById('inputSupplierDelayFlag');
    if (supDelay) {
      supDelay.addEventListener('change', () => syncCurrentFormToProjectAndRender(false, false));
    }

    const supStatus = document.getElementById('inputSupplierStatus');
    if (supStatus) {
      supStatus.addEventListener('input', () => {
        if (supDelay) {
          supDelay.checked = detectSupplierDelayFromText(supStatus.value);
        }
        syncCurrentFormToProjectAndRender(false, false);
      });
    }

    // Formulier Opslaan
    const editForm = document.getElementById('projectEditForm');
    if (editForm) {
      editForm.addEventListener('submit', e => {
        e.preventDefault();
        const saved = syncCurrentFormToProjectAndRender(true, true);
        if (saved) {
          showToast('Projectwijzigingen succesvol opgeslagen!');
        }
      });
    }

    // Project Verwijderen
    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const proj = AppState.getCurrentProject();
        if (!proj) return;
        if (confirm(`Weet je zeker dat je project ${proj.projectnummer} (${proj.projectnaam}) wilt verwijderen?`)) {
          AppState.projects = AppState.projects.filter(p => p.projectnummer !== proj.projectnummer);
          if (AppState.projects.length === 0) {
            AppState.resetToDemoData();
          } else {
            AppState.selectedProjectId = AppState.projects[0].projectnummer;
            AppState.saveProjects();
          }
          renderAll(true);
          showToast(`Project ${proj.projectnummer} is verwijderd.`);
        }
      });
    }

    // AI Knoppen
    const genAiBtn = document.getElementById('generateAiReportBtn');
    if (genAiBtn) {
      genAiBtn.addEventListener('click', triggerAiReportGeneration);
    }

    const copyAiBtn = document.getElementById('copyAiReportBtn');
    if (copyAiBtn) {
      copyAiBtn.addEventListener('click', () => {
        const v = document.getElementById('aiSectionVerdict').innerText;
        const b = document.getElementById('aiSectionBottlenecks').innerText;
        const a = document.getElementById('aiSectionAdvice').innerText;
        const fullText = `ISP BARENDRECHT — AI VOORTGANGSANALYSE\n${formatIspProjectTitle(AppState.getCurrentProject())}\n\n1. DIRECT OORDEEL:\n${v}\n\n2. WAAR ZIT HET KNELPUNT:\n${b}\n\n3. CONCREET OPERATIONEEL ADVIES:\n${a}\n\n[Geverifieerd door projectleider]`;
        navigator.clipboard.writeText(fullText).then(() => {
          showToast('AI-advies gekopieerd naar klembord!');
        }).catch(() => {
          showToast('Kopiëren niet toegestaan door browser.');
        });
      });
    }

    const anonToggle = document.getElementById('anonymizeAiToggle');
    if (anonToggle) {
      anonToggle.addEventListener('change', e => {
        AppState.anonymizeBeforeAi = e.target.checked;
        AppState.saveSettings();
        const pText = document.getElementById('aiPrivacyStatusText');
        if (AppState.anonymizeBeforeAi) {
          pText.innerHTML = '<strong>Privacy-filter actief:</strong> Klantnaam en persoonsnamen worden automatisch gestript vóór verzending naar de AI.';
        } else {
          pText.innerHTML = '<strong>Privacy-filter uitgeschakeld:</strong> Volledige project- en klantnaam worden meegestuurd in de AI-analyse.';
        }
        showToast(`Privacy filter ${AppState.anonymizeBeforeAi ? 'ingeschakeld' : 'uitgeschakeld'}`);
      });
    }

    const humanVerified = document.getElementById('humanVerifiedCheckbox');
    if (humanVerified) {
      humanVerified.addEventListener('change', e => {
        const proj = AppState.getCurrentProject();
        if (proj) {
          proj.aiVerified = e.target.checked;
          AppState.saveProjects();
          showToast(e.target.checked ? 'Advies gemarkeerd als gecontroleerd & akkoord.' : 'Markering verwijderd.');
        }
      });
    }
  }

  // Registreer module globaal
  window.ProjectDashboardModule = {
    render: renderProjectDashboard,
    updateCharts: updateCharts,
    updateComparisonTableCells: updateComparisonTableCells,
    triggerAiReport: triggerAiReportGeneration,
    setupListeners: setupDashboardListeners
  };

})(window);
