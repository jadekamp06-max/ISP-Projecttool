/* ==========================================================================
   ISP BARENDRECHT — TAB 3 CONTROLLER (ochtendoverleg.js)
   Beheert: Overleg & Knelpunten, Risicoprojecten & Projectoverzicht (Lopend / Afgerond)
   ========================================================================== */

(function (window) {
  'use strict';

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

    const redCount = scopedForCounts.filter(x => x.metrics.statusLevel === 'ROOD').length;
    const orangeCount = scopedForCounts.filter(x => x.metrics.statusLevel === 'ORANJE').length;
    const supplierCount = scopedForCounts.filter(x => x.metrics.heeftVertraging).length;

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

      if (bottleneckItems.length === 0) {
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
          <td colspan="8" class="py-8 px-4 text-center text-slate-500 text-sm">
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
        <td class="py-3.5 px-4 text-right font-mono-num font-bold internal-cost-field whitespace-nowrap ${metrics.verschilBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
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
        renderMorningMeetingView();
      });
    }

    // Filterknoppen in de tabel
    document.getElementById('morningFilterActive')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Lopend';
      renderMorningMeetingView();
    });

    document.getElementById('morningFilterCompleted')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Afgerond';
      renderMorningMeetingView();
    });

    document.getElementById('morningFilterAll')?.addEventListener('click', () => {
      AppState.morningTableFilter = 'Alles';
      renderMorningMeetingView();
    });

    const viewMorn = document.getElementById('viewMorningMeeting');
    if (viewMorn) {
      viewMorn.addEventListener('click', e => {
        const btn = e.target.closest('[data-open-project]');
        if (btn) {
          const pnum = btn.getAttribute('data-open-project');
          if (pnum) {
            openProjectStatusScreen(pnum);
          }
        }
      });
    }
  }

  // Registreer module globaal
  window.OchtendoverlegModule = {
    render: renderMorningMeetingView,
    setupListeners: setupMorningMeetingListeners
  };

})(window);
// Zorg dat de code pas runt als de pagina geladen is
document.addEventListener('DOMContentLoaded', function() {
    
    // Zoek het formulier en de knop op
    const form = document.getElementById('quickEntryForm');
    if (!form) return; // Als het formulier niet bestaat, stop dan
    
    const saveBtn = form.querySelector('button');
    const container = document.getElementById('morningCardsContainer');

    // Wat er moet gebeuren als je op de knop klikt
    saveBtn.addEventListener('click', function() {
        
        // Haal de ingevulde waardes op
        const project = document.getElementById('qeProject').value;
        const status = document.getElementById('qeStatus').value;
        const omvang = document.getElementById('qeOmvang').value;
        const toelichting = document.getElementById('qeToelichting').value;

        // Check of project en status op zijn minst zijn ingevuld
        if (!project || !status) {
            alert('Vul in ieder geval een project en een status in!');
            return;
        }

        // Bepaal de kleuren en pas de juiste teller aan bovenaan de pagina
        let statusKleur = '';
        let statusTekst = '';

        if (status === 'rood') {
            statusKleur = 'bg-rose-100 text-rose-700';
            statusTekst = 'Kritiek (Rood)';
            let counter = document.getElementById('morningCountRed');
            counter.innerText = parseInt(counter.innerText) + 1;
        } else if (status === 'oranje') {
            statusKleur = 'bg-amber-100 text-amber-700';
            statusTekst = 'Risico (Oranje)';
            let counter = document.getElementById('morningCountOrange');
            counter.innerText = parseInt(counter.innerText) + 1;
        } else if (status === 'leverancier') {
            statusKleur = 'bg-[#eef3f9] text-[#0a2246]';
            statusTekst = 'Toeleverancier';
            let counter = document.getElementById('morningCountSupplier');
            counter.innerText = parseInt(counter.innerText) + 1;
        }

        // Maak een nieuw kaartje aan voor in de lijst
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3';
        card.innerHTML = `
          <div class="flex items-center gap-3 mb-2">
              <span class="px-2 py-1 rounded-md text-xs font-bold ${statusKleur}">${statusTekst}</span>
              <h4 class="font-bold text-[#0a2246] text-sm">${project}</h4>
          </div>
          <p class="text-sm text-slate-600 mb-1"><strong>Omvang:</strong> ${omvang || 'Niet opgegeven'}</p>
          <p class="text-sm text-slate-600"><strong>Toelichting:</strong> ${toelichting || 'Geen toelichting'}</p>
        `;

        // Zet het nieuwe kaartje bovenaan in de lijst
        container.prepend(card);

        // Maak het formulier weer leeg voor de volgende melding
        form.reset();
    });
});
