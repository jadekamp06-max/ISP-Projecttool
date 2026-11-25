/* ==========================================================================
   ISP BARENDRECHT — TAB 3 CONTROLLER (ochtendoverleg.js)
   Beheert: Overleg & Knelpunten, Risicoprojecten & Projectoverzicht (Lopend / Afgerond)
   ========================================================================== */

(function (window) {
  'use strict';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Genereert een strakke, goed leesbare statusbadge ZONDER de kleurnaam erin
   * (geen 'GROEN —', 'ORANJE —', 'ROOD —' meer, nooit meer afbreken op 2 regels)
   */
  function renderCleanStatusBadge(metrics) {
    if (metrics.statusLevel === 'GROEN') {
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs"><span class="isp-dot isp-dot-green"></span> Binnen Budget</span>`;
    } else if (metrics.statusLevel === 'ORANJE') {
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs"><span class="isp-dot isp-dot-amber"></span> Risico</span>`;
    } else {
      return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap shadow-2xs"><span class="isp-dot isp-dot-red"></span> Kritieke Overschrijding</span>`;
    }
  }

  /**
   * Render Tab 3: Overleg Weergave & Projectoverzicht
   */
  function renderMorningMeetingView() {
    if (!window.AppState) return;

    // Filter status voor de overzichtstabel (standaard 'Lopend')
    AppState.morningTableFilter = AppState.morningTableFilter || 'Lopend';

    const toggle = document.getElementById('morningOnlyActiveToggle');
    if (toggle) toggle.checked = AppState.morningOnlyActive;

    const enriched = AppState.projects.map(p => ({
      project: p,
      metrics: calculateProjectMetrics(p)
    }));

    const scopedForCounts = AppState.morningOnlyActive
      ? enriched.filter(x => x.project.status === 'Lopend')
      : enriched;

    const manualNotes = Array.isArray(AppState.morningNotes) ? AppState.morningNotes : [];
    const manualRed = manualNotes.filter(n => n.status === 'rood').length;
    const manualOrange = manualNotes.filter(n => n.status === 'oranje').length;
    const manualSupplier = manualNotes.filter(n => n.status === 'leverancier').length;

    const redCount = scopedForCounts.filter(x => x.metrics.statusLevel === 'ROOD').length + manualRed;
    const orangeCount = scopedForCounts.filter(x => x.metrics.statusLevel === 'ORANJE').length + manualOrange;
    const supplierCount = scopedForCounts.filter(x => x.metrics.heeftVertraging).length + manualSupplier;

    const redCountEl = document.getElementById('morningCountRed');
    if (redCountEl) redCountEl.textContent = String(redCount);

    const orangeCountEl = document.getElementById('morningCountOrange');
    if (orangeCountEl) orangeCountEl.textContent = String(orangeCount);

    const supCountEl = document.getElementById('morningCountSupplier');
    if (supCountEl) supCountEl.textContent = String(supplierCount);

    const bottleneckItems = scopedForCounts.filter(item => item.metrics.needsMorningAttention);

    const container = document.getElementById('morningCardsContainer');
    if (container) {
      container.innerHTML = '';

      // Render handmatig opgeslagen meldingen uit het Snel-invoer paneel
      manualNotes.forEach(note => {
        let statusKleur = 'bg-[#eef3f9] text-[#0a2246] border border-[#dbe4f0]';
        let statusTekst = 'Toeleverancier';
        let borderAccent = 'border-l-8 border-l-[#0a2246]';
        if (note.status === 'rood') {
          statusKleur = 'bg-rose-100 text-rose-800 border border-rose-300';
          statusTekst = 'Kritiek (Rood)';
          borderAccent = 'border-l-8 border-l-rose-600';
        } else if (note.status === 'oranje') {
          statusKleur = 'bg-amber-100 text-amber-900 border border-amber-300';
          statusTekst = 'Risico (Oranje)';
          borderAccent = 'border-l-8 border-l-amber-500';
        }

        const matchedProjects = typeof findProjectsBySmartQuery === 'function'
          ? findProjectsBySmartQuery(note.project)
          : [];
        const matchedProj = matchedProjects.length > 0 ? matchedProjects[0] : null;

        const noteCard = document.createElement('div');
        noteCard.className = `bg-white p-4 sm:p-5 rounded-2xl border border-[#dbe4f0] ${borderAccent} shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`;
        noteCard.innerHTML = `
          <div class="space-y-1.5 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold ${statusKleur}">${statusTekst}</span>
              <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">Handmatige melding</span>
              <h4 class="font-extrabold text-[#0a2246] text-sm sm:text-base">${escapeHtml(note.project)}</h4>
            </div>
            <p class="text-xs text-slate-600"><strong>Omvang:</strong> ${escapeHtml(note.omvang || 'Niet opgegeven')}</p>
            <p class="text-xs text-slate-700"><strong>Toelichting:</strong> ${escapeHtml(note.toelichting || 'Geen toelichting')}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0 no-print">
            ${matchedProj ? `<button type="button" data-open-project="${escapeHtml(matchedProj.projectnummer)}" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#0a2246] hover:bg-[#12356b] text-white transition cursor-pointer">Bekijk Status →</button>` : ''}
            <button type="button" data-remove-morning-note="${escapeHtml(note.id)}" class="px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer">Afhandelen</button>
          </div>
        `;
        container.appendChild(noteCard);
      });

      if (bottleneckItems.length === 0 && manualNotes.length === 0) {
        container.innerHTML = `
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-900">
            <div class="text-lg font-extrabold">Geen acute knelpunten voor het overleg!</div>
            <p class="text-xs text-emerald-700 mt-1">Alle geselecteerde projecten lopen binnen uren, budget en leveranciersschema.</p>
          </div>
        `;
      } else {
        bottleneckItems.slice(0, 30).forEach(({ project, metrics }) => {
          const isRed = metrics.statusLevel === 'ROOD';
          const borderClass = isRed ? 'border-l-8 border-l-rose-600 border-[#dbe4f0]' : 'border-l-8 border-l-amber-500 border-[#dbe4f0]';
          const fullTitle = formatIspProjectTitle(project, AppState.clientViewActive);

          const card = document.createElement('div');
          card.className = `bg-white rounded-2xl shadow-xs border ${borderClass} p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4`;

          card.innerHTML = `
            <div class="space-y-2 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono-num text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#0a2246] text-white">${project.projectnummer}</span>
                <span class="text-xs font-bold uppercase px-2.5 py-0.5 rounded-lg ${project.status === 'Lopend' ? 'bg-blue-100 text-[#0a2246]' : 'bg-slate-200 text-slate-700'}">${project.status}</span>
                ${renderCleanStatusBadge(metrics)}
                ${metrics.heeftVertraging ? '<span class="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">Leveranciersvertraging</span>' : ''}
                <span class="text-xs font-mono-num font-bold px-2.5 py-0.5 rounded-lg bg-[#eef3f9] text-[#0a2246] border border-[#dbe4f0]">Verkoop: ${formatEuro(metrics.verkoopprijs)}</span>
              </div>
              <h4 class="text-base sm:text-lg font-extrabold text-[#0a2246]">${fullTitle}</h4>
              <div class="text-xs text-slate-600">
                <strong>Waar zit het knelpunt:</strong> <span class="font-bold text-[#0a2246]">${metrics.statusReason}</span>
              </div>
              <div class="text-xs bg-[#f4f7fb] p-3 rounded-xl border border-[#dbe4f0] text-[#0a2246]">
                <strong>Bestel- &amp; Werkplaatsstatus:</strong> ${project.bestelstatus}
              </div>
            </div>

            <div class="flex flex-wrap sm:flex-nowrap items-center gap-5 lg:border-l lg:border-slate-200 lg:pl-6">
              <div class="text-right font-mono-num">
                <div class="text-[11px] uppercase text-slate-400 font-sans font-bold">Uren</div>
                <div class="text-sm font-extrabold ${metrics.afwijkingUrenPct > 0 ? 'text-rose-600' : 'text-[#0a2246]'}">
                  ${formatNumber(metrics.werkelijkeUren)} / ${formatNumber(metrics.begroteUren)} u
                </div>
                <div class="text-xs text-slate-500">${formatSignedPct(metrics.afwijkingUrenPct)}</div>
              </div>

              <div class="text-right font-mono-num ${AppState.clientViewActive ? 'hidden' : ''}">
                <div class="text-[11px] uppercase text-slate-400 font-sans font-bold">Budgetverschil</div>
                <div class="text-sm font-extrabold ${metrics.verschilBudget < 0 ? 'text-rose-600' : 'text-emerald-600'}">
                  ${formatSignedEuro(metrics.verschilBudget)}
                </div>
                <div class="text-xs text-slate-500">${formatSignedPct(metrics.afwijkingBudgetPct)}</div>
              </div>

              <button
                type="button"
                data-open-project="${project.projectnummer}"
                class="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#0a2246] hover:bg-[#12356b] text-white transition shrink-0 cursor-pointer"
              >
                Bekijk Status →
              </button>
            </div>
          `;
          container.appendChild(card);
        });
      }
    }

    // =========================================================================
    // OVERZICHT PROJECTEN TABEL (MET FILTER VOOR LOPEND / AFGEROND / ALLES)
    // =========================================================================
    const currentFilter = AppState.morningTableFilter || 'Lopend';
    let tableProjects = enriched;

    if (currentFilter === 'Lopend') {
      tableProjects = enriched.filter(x => x.project.status === 'Lopend');
    } else if (currentFilter === 'Afgerond') {
      tableProjects = enriched.filter(x => x.project.status === 'Afgerond');
    }

    // Update filterknoppen actieve toestand
    const btnActive = document.getElementById('morningFilterActive');
    const btnCompleted = document.getElementById('morningFilterCompleted');
    const btnAll = document.getElementById('morningFilterAll');

    const updateFilterBtn = (btn, isActive) => {
      if (!btn) return;
      if (isActive) {
        btn.className = 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-white text-[#0a2246] shadow-xs';
      } else {
        btn.className = 'px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-blue-200 hover:text-white';
      }
    };

    updateFilterBtn(btnActive, currentFilter === 'Lopend');
    updateFilterBtn(btnCompleted, currentFilter === 'Afgerond');
    updateFilterBtn(btnAll, currentFilter === 'Alles');

    const countLabel = document.getElementById('totalProjectsCountLabel');
    if (countLabel) {
      if (currentFilter === 'Lopend') {
        countLabel.textContent = `${tableProjects.length} lopende projecten (toon eerste 35)`;
      } else if (currentFilter === 'Afgerond') {
        countLabel.textContent = `${tableProjects.length} afgeronde projecten (toon eerste 35)`;
      } else {
        countLabel.textContent = `${tableProjects.length} projecten in totaal (toon eerste 35)`;
      }
    }

    const tbody = document.getElementById('allProjectsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tableProjects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="py-8 px-4 text-center text-slate-500 text-sm">
            Geen projecten gevonden in deze categorie (${currentFilter}).
          </td>
        </tr>
      `;
      return;
    }

    const displaySample = tableProjects.slice(0, 35);

    displaySample.forEach(({ project, metrics }) => {
      const fullTitle = formatIspProjectTitle(project, AppState.clientViewActive);
      const isLopend = project.status === 'Lopend';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#f4f7fb] transition cursor-pointer group';
      tr.setAttribute('data-open-project', project.projectnummer);

      tr.innerHTML = `
        <td class="py-3.5 px-4">
          <div class="font-bold text-[#0a2246] group-hover:text-blue-700 transition">${fullTitle}</div>
          <div class="text-xs text-slate-500 font-mono-num">Nummer: ${project.projectnummer} • Klant: ${AppState.clientViewActive ? 'Vertrouwelijk' : project.klant}</div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${isLopend ? 'bg-blue-100 text-[#0a2246] border border-blue-200' : 'bg-slate-200 text-slate-700 border border-slate-300'}">${project.status}</span>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          ${renderCleanStatusBadge(metrics)}
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap">
          ${formatNumber(metrics.werkelijkeUren)} / ${formatNumber(metrics.begroteUren)} u
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-extrabold text-[#0a2246] whitespace-nowrap">
          ${formatEuro(metrics.verkoopprijs)}
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-bold ${AppState.clientViewActive ? 'hidden' : 'internal-cost-field'} whitespace-nowrap ${metrics.verschilBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
          ${formatSignedEuro(metrics.verschilBudget)}
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-bold whitespace-nowrap ${metrics.afwijkingBudgetPct <= 0 ? 'text-emerald-600' : (metrics.afwijkingBudgetPct < 10 ? 'text-amber-600' : 'text-rose-600')}">
          ${formatSignedPct(metrics.afwijkingBudgetPct)}
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate" title="${project.bestelstatus}">
          ${project.bestelstatus}
        </td>
        <td class="py-3.5 px-4 text-right no-print whitespace-nowrap">
          <button
            type="button"
            data-open-project="${project.projectnummer}"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#eef3f9] text-[#0a2246] hover:bg-[#0a2246] hover:text-white transition cursor-pointer"
          >
            Bekijk Status
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Event listeners voor Tab 3
   */
  function setupMorningMeetingListeners() {
    const activeToggle = document.getElementById('morningOnlyActiveToggle');
    if (activeToggle) {
      activeToggle.addEventListener('change', e => {
        AppState.morningOnlyActive = e.target.checked;
        AppState.saveUiPreferences();
        renderMorningMeetingView();
      });
    }

    // Filterknoppen in de tabel
    document.getElementById('morningFilterActive')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Lopend';
      AppState.saveUiPreferences();
      renderMorningMeetingView();
    });

    document.getElementById('morningFilterCompleted')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Afgerond';
      AppState.saveUiPreferences();
      renderMorningMeetingView();
    });

    document.getElementById('morningFilterAll')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Alles';
      AppState.saveUiPreferences();
      renderMorningMeetingView();
    });

    const viewMorn = document.getElementById('viewMorningMeeting');
    if (viewMorn) {
      viewMorn.addEventListener('click', e => {
        const removeBtn = e.target.closest('[data-remove-morning-note]');
        if (removeBtn) {
          const noteId = removeBtn.getAttribute('data-remove-morning-note');
          if (noteId) {
            AppState.removeMorningNote(noteId);
            renderMorningMeetingView();
            showToast('Melding afgehandeld en bijgewerkt.');
          }
          return;
        }
        const btn = e.target.closest('[data-open-project]');
        if (btn) {
          const pnum = btn.getAttribute('data-open-project');
          if (pnum) {
            openProjectStatusScreen(pnum);
          }
        }
      });
    }

    // Snel-invoer Paneel (persistent opgeslagen via AppState / localStorage)
    const quickForm = document.getElementById('quickEntryForm');
    if (quickForm) {
      const saveBtn = quickForm.querySelector('button');
      const handleQuickSubmit = e => {
        if (e) e.preventDefault();
        const project = document.getElementById('qeProject')?.value.trim() || '';
        const status = document.getElementById('qeStatus')?.value || '';
        const omvang = document.getElementById('qeOmvang')?.value.trim() || '';
        const toelichting = document.getElementById('qeToelichting')?.value.trim() || '';

        if (!project || !status) {
          showToast('Vul in ieder geval een project en een status in!');
          return;
        }

        AppState.addMorningNote({
          id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          project,
          status,
          omvang,
          toelichting,
          createdAt: new Date().toISOString()
        });

        quickForm.reset();
        renderMorningMeetingView();
        showToast('Knelpunt opgeslagen voor het ochtendoverleg!');
      };

      quickForm.addEventListener('submit', handleQuickSubmit);
      if (saveBtn) {
        saveBtn.addEventListener('click', handleQuickSubmit);
      }
    }
  }

  // Registreer module globaal
  window.OchtendoverlegModule = {
    render: renderMorningMeetingView,
    setupListeners: setupMorningMeetingListeners
  };

})(window);
