/* ==========================================================================
   ISP BARENDRECHT — TAB 1 CONTROLLER (project-zoeken.js)
   Beheert: Hero Zoeker, 490-Projectenregister, Filtering, Sortering & Paginering
   ========================================================================== */

(function (window) {
  'use strict';

  /**
   * Render de volledige Tab 1 weergave (Project Zoeken & Register)
   */
  function renderHomeLauncherView() {
    if (!window.AppState) return;

    const totalProjects = AppState.projects.length;
    const lopendCount = AppState.projects.filter(p => p.status === 'Lopend').length;
    const afgerondCount = AppState.projects.filter(p => p.status === 'Afgerond').length;
    const knelpuntCount = AppState.projects.filter(
      p => p.status === 'Lopend' && calculateProjectMetrics(p).needsMorningAttention
    ).length;

    const maxNum = String(parseInt(getNextIspProjectNumber(AppState.projects), 10) - 1);
    const regCountEl = document.getElementById('homeRegisterCountBadge');
    if (regCountEl) regCountEl.textContent = String(totalProjects);

    const maxNumEl = document.getElementById('homeMaxProjectNumLabel');
    if (maxNumEl) maxNumEl.textContent = maxNum;

    const filterLopendEl = document.getElementById('filterCountLopend');
    if (filterLopendEl) filterLopendEl.textContent = String(lopendCount);

    const filterKnelpuntEl = document.getElementById('filterCountKnelpunt');
    if (filterKnelpuntEl) filterKnelpuntEl.textContent = String(knelpuntCount);

    const filterAfgerondEl = document.getElementById('filterCountAfgerond');
    if (filterAfgerondEl) filterAfgerondEl.textContent = String(afgerondCount);

    const filterAllEl = document.getElementById('filterCountAll');
    if (filterAllEl) filterAllEl.textContent = String(totalProjects);

    // Update styling van filterknoppen in de blauwe registerbalk
    const activeFilter = AppState.homeFilter || 'Lopend';
    document.querySelectorAll('.home-filter-btn').forEach(b => {
      const bFilter = b.getAttribute('data-home-filter');
      const isActive = bFilter === activeFilter;
      if (isActive) {
        if (bFilter === 'KNELPUNT') {
          b.className = 'home-filter-btn px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-xs border border-rose-500 transition cursor-pointer';
        } else {
          b.className = 'home-filter-btn px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white text-[#0a2246] shadow-xs border border-white transition cursor-pointer';
        }
      } else {
        if (bFilter === 'KNELPUNT') {
          b.className = 'home-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#12356b] text-rose-300 hover:text-white hover:bg-rose-900/40 border border-rose-400/40 transition cursor-pointer';
        } else {
          b.className = 'home-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#12356b] text-blue-100 hover:text-white hover:bg-[#1a4485] border border-[#2b5fb3] transition cursor-pointer';
        }
      }
    });

    // Filter projecten
    const tableQuery = (AppState.homeTableQuery || '').trim().toLowerCase();
    const filtered = AppState.projects.filter(p => {
      if (AppState.homeFilter === 'Lopend' && p.status !== 'Lopend') return false;
      if (AppState.homeFilter === 'Afgerond' && p.status !== 'Afgerond') return false;
      if (AppState.homeFilter === 'KNELPUNT') {
        const m = calculateProjectMetrics(p);
        if (p.status !== 'Lopend' || !m.needsMorningAttention) return false;
      }
      if (tableQuery) {
        const full = formatIspProjectTitle(p).toLowerCase();
        if (!full.includes(tableQuery) && !p.bestelstatus.toLowerCase().includes(tableQuery)) {
          return false;
        }
      }
      return true;
    });

    // Sorteer projecten
    filtered.sort((a, b) => {
      const numA = extractProjectNumberInt(a.projectnummer);
      const numB = extractProjectNumberInt(b.projectnummer);
      if (AppState.homeSortBy === 'OLDEST') {
        return numA - numB;
      }
      if (AppState.homeSortBy === 'RISK') {
        const mA = calculateProjectMetrics(a);
        const mB = calculateProjectMetrics(b);
        const rank = lvl => (lvl === 'ROOD' ? 3 : lvl === 'ORANJE' ? 2 : 1);
        const diffRank = rank(mB.statusLevel) - rank(mA.statusLevel);
        if (diffRank !== 0) return diffRank;
        return mB.afwijkingBudgetPct - mA.afwijkingBudgetPct;
      }
      return numB - numA; // NEWEST first (200490 -> 200001)
    });

    // Paginering berekenen
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / AppState.homePageSize));
    if (AppState.homePage > totalPages) AppState.homePage = totalPages;
    if (AppState.homePage < 1) AppState.homePage = 1;

    const startIdx = (AppState.homePage - 1) * AppState.homePageSize;
    const pageItems = filtered.slice(startIdx, startIdx + AppState.homePageSize);

    const pagInfo = document.getElementById('homePaginationInfo');
    if (pagInfo) {
      pagInfo.textContent = totalFiltered === 0
        ? 'Geen projecten gevonden voor dit filter'
        : `Toont ${startIdx + 1}–${Math.min(startIdx + AppState.homePageSize, totalFiltered)} van ${totalFiltered} projecten`;
    }

    const pageIndicator = document.getElementById('homePageIndicator');
    if (pageIndicator) {
      pageIndicator.textContent = `Pagina ${AppState.homePage} / ${totalPages}`;
    }

    const prevBtn = document.getElementById('homePrevPageBtn');
    if (prevBtn) prevBtn.disabled = AppState.homePage <= 1;

    const nextBtn = document.getElementById('homeNextPageBtn');
    if (nextBtn) nextBtn.disabled = AppState.homePage >= totalPages;

    const tbody = document.getElementById('homeProjectCardsGrid');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 px-4 text-center text-slate-500 text-sm">
            Geen ISP-projecten gevonden voor deze zoekopdracht of filterkeuze.
          </td>
        </tr>
      `;
      return;
    }

    pageItems.forEach(p => {
      const m = calculateProjectMetrics(p);
      const fullTitle = formatIspProjectTitle(p, AppState.clientViewActive);

      let statusBadgeHtml = '';
      if (m.statusLevel === 'GROEN') {
        statusBadgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300"><span class="isp-dot isp-dot-green"></span> Binnen Budget</span>`;
      } else if (m.statusLevel === 'ORANJE') {
        statusBadgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300"><span class="isp-dot isp-dot-amber"></span> Risico / Uitloop</span>`;
      } else {
        statusBadgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300"><span class="isp-dot isp-dot-red"></span> Kritieke Overschrijding</span>`;
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#eef3f9]/80 transition cursor-pointer group';
      tr.setAttribute('data-select-open-project', p.projectnummer);

      tr.innerHTML = `
        <td class="py-3.5 px-4">
          <span class="font-mono-num text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-lg bg-[#0a2246] text-white group-hover:bg-[#12356b] transition">
            ${p.projectnummer}
          </span>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-extrabold text-[#0a2246] group-hover:text-blue-700 transition">${fullTitle}</div>
          <div class="text-xs text-slate-500">Klant: <strong>${AppState.clientViewActive ? 'Vertrouwelijk' : p.klant}</strong> • Omschrijving: ${p.projectnaam}</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold ${p.status === 'Lopend' ? 'bg-blue-100 text-[#0a2246]' : 'bg-slate-200 text-slate-700'}">
            ${p.status}
          </span>
        </td>
        <td class="py-3.5 px-4">
          ${statusBadgeHtml}
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-bold ${m.afwijkingUrenPct > 0 ? 'text-rose-600' : 'text-[#0a2246]'}">
          ${formatNumber(m.werkelijkeUren)} / ${formatNumber(m.begroteUren)} u
          <div class="text-[11px] font-normal text-slate-500">${formatSignedPct(m.afwijkingUrenPct)}</div>
        </td>
        <td class="py-3.5 px-4 text-right font-mono-num font-extrabold ${AppState.clientViewActive ? 'hidden' : ''} ${m.verschilBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
          ${formatSignedEuro(m.verschilBudget)}
          <div class="text-[11px] font-normal text-slate-500">${formatSignedPct(m.afwijkingBudgetPct)}</div>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-600 max-w-[230px] truncate" title="${p.bestelstatus}">
          ${m.heeftVertraging ? '<span class="text-amber-700 font-bold">[Vertraging] </span>' : ''}${p.bestelstatus}
        </td>
        <td class="py-3.5 px-4 text-right">
          <button
            type="button"
            data-select-open-project="${p.projectnummer}"
            class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-[#0a2246] hover:bg-[#12356b] text-white shadow-2xs transition cursor-pointer"
          >
            Bekijk Status →
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Event listeners voor Tab 1
   */
  function setupProjectZoekenListeners() {
    const heroInput = document.getElementById('heroProjectLookupInput');
    const heroForm = document.getElementById('heroProjectLookupForm');
    const heroResults = document.getElementById('heroLookupResults');

    if (heroInput && heroResults) {
      heroInput.addEventListener('input', e => {
        const val = e.target.value.trim();
        if (!val) {
          heroResults.classList.add('hidden');
          heroResults.innerHTML = '';
          return;
        }

        const matches = findProjectsBySmartQuery(val).slice(0, 8);
        if (matches.length === 0) {
          heroResults.innerHTML = `
            <div class="p-4 text-xs text-slate-500 text-center">
              Geen ISP-project gevonden voor "<strong>${val}</strong>". Probeer een nummer tussen 200001 en 200490.
            </div>
          `;
          heroResults.classList.remove('hidden');
          return;
        }

        heroResults.innerHTML = matches.map(p => {
          const m = calculateProjectMetrics(p);
          const dotClass = m.statusLevel === 'ROOD' ? 'isp-dot-red' : (m.statusLevel === 'ORANJE' ? 'isp-dot-amber' : 'isp-dot-green');
          return `
            <div
              class="p-3.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between gap-3 transition"
              data-select-open-project="${p.projectnummer}"
            >
              <div class="flex items-center gap-3">
                <span class="isp-dot ${dotClass}"></span>
                <div>
                  <div class="text-sm font-extrabold text-[#0a2246]">${formatIspProjectTitle(p, AppState.clientViewActive)}</div>
                  <div class="text-xs text-slate-500">Status: <strong>${p.status}</strong> • Levering: ${p.bestelstatus}</div>
                </div>
              </div>
              <span class="text-xs font-extrabold text-[#0a2246] bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">Open →</span>
            </div>
          `;
        }).join('');
        heroResults.classList.remove('hidden');
      });

      if (heroForm) {
        heroForm.addEventListener('submit', e => {
          e.preventDefault();
          const val = heroInput.value.trim();
          if (!val) return;
          const matches = findProjectsBySmartQuery(val);
          if (matches.length > 0) {
            heroResults.classList.add('hidden');
            heroInput.value = '';
            openProjectStatusScreen(matches[0].projectnummer);
          } else {
            showToast(`Geen project gevonden voor "${val}". Toets bijv. 200490 of een klantnaam in.`);
          }
        });
      }

      document.addEventListener('click', e => {
        if (!e.target.closest('#heroProjectLookupForm') && !e.target.closest('#heroLookupResults')) {
          heroResults.classList.add('hidden');
        }
      });
    }

    // Delegate clicks op [data-select-open-project] in Tab 1
    const viewHome = document.getElementById('viewHomeLauncher');
    if (viewHome) {
      viewHome.addEventListener('click', e => {
        const trigger = e.target.closest('[data-select-open-project]');
        if (trigger) {
          const pnum = trigger.getAttribute('data-select-open-project');
          if (pnum) {
            openProjectStatusScreen(pnum);
          }
        }
      });
    }

    // Filterknoppen in het register
    document.querySelectorAll('.home-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.homeFilter = btn.getAttribute('data-home-filter');
        AppState.homePage = 1;
        renderHomeLauncherView();
      });
    });

    // Tabel filter zoekbalk (enkele centrale zoekbalk)
    const tableFilterInput = document.getElementById('homeTableFilterInput');
    if (tableFilterInput) {
      tableFilterInput.addEventListener('input', e => {
        AppState.homeTableQuery = e.target.value;
        AppState.homePage = 1;
        renderHomeLauncherView();
      });

      // Direct openen op Enter
      tableFilterInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = tableFilterInput.value.trim();
          if (!val) return;
          const matches = findProjectsBySmartQuery(val);
          if (matches.length > 0) {
            openProjectStatusScreen(matches[0].projectnummer);
          } else {
            showToast(`Geen ISP-project gevonden voor "${val}". Toets bijv. 200490 of een klantnaam.`);
          }
        }
      });
    }

    // Sorteerselect
    const sortSelect = document.getElementById('homeSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        AppState.homeSortBy = e.target.value;
        renderHomeLauncherView();
      });
    }

    // Paginering
    const prevBtn = document.getElementById('homePrevPageBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (AppState.homePage > 1) {
          AppState.homePage--;
          renderHomeLauncherView();
          document.getElementById('homeProjectListSection')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    const nextBtn = document.getElementById('homeNextPageBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        AppState.homePage++;
        renderHomeLauncherView();
        document.getElementById('homeProjectListSection')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Hero snelknoppen
    const scrollProjectsBtn = document.getElementById('launcherScrollToProjectsBtn');
    if (scrollProjectsBtn) {
      scrollProjectsBtn.addEventListener('click', () => {
        document.getElementById('homeProjectListSection')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const openMorningBtn = document.getElementById('launcherOpenMorningBtn');
    if (openMorningBtn) {
      openMorningBtn.addEventListener('click', () => {
        switchTab('morning');
      });
    }

    const openImportBtn = document.getElementById('launcherOpenImportBtn');
    if (openImportBtn) {
      openImportBtn.addEventListener('click', () => {
        document.getElementById('importFeedbackBox')?.classList.add('hidden');
        document.getElementById('importModal')?.classList.remove('hidden');
      });
    }
  }

  // Registreer module globaal
  window.ProjectZoekenModule = {
    render: renderHomeLauncherView,
    setupListeners: setupProjectZoekenListeners
  };

})(window);
