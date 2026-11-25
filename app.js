/* ==========================================================================
   ISP BARENDRECHT — CENTRAAL APPLICATIE SCRIPT (app.js)
   Project Insights & Realtime Nacalculatie Dashboard
   Beheert: Centrale Data, Berekeningen, LocalStorage, Navigatie & Modals
   ========================================================================== */

(function (window) {
  'use strict';

  /* ===================================================================
   * 1. CONFIGURATIE, CONSTANTEN & ISP PROJECTSTRUCTUUR (200001 t/m 200490+)
   * =================================================================== */
  const STORAGE_KEYS = {
    PROJECTS: 'isp_barendrecht_projects_v3_200490',
    SELECTED_ID: 'isp_barendrecht_selected_project_v3_200490',
    GLOBAL_RATE: 'isp_barendrecht_global_rate_v1',
    GEMINI_API_KEY: 'isp_barendrecht_gemini_api_key_v1',
    ANONYMIZE_AI: 'isp_barendrecht_anonymize_ai_v1',
    CLIENT_VIEW: 'isp_barendrecht_client_view_v1',
    RECENT_IDS: 'isp_barendrecht_recent_ids_v1',
    MORNING_NOTES: 'isp_barendrecht_morning_notes_v1',
    MORNING_ONLY_ACTIVE: 'isp_barendrecht_morning_only_active_v1',
    MORNING_FILTER: 'isp_barendrecht_morning_filter_v1'
  };

  const DEFAULT_GLOBAL_RATE = 65.0;
  const DEFAULT_SALES_MARKUP_FACTOR = 1.496; // 1.02 (garantie) * 1.10 (projectbeheer) / (1 - 0.25 gewenste marge)
  const ISP_START_PROJECT_NUMBER = 200001;
  const ISP_CURRENT_MAX_DEMO_NUMBER = 200490;

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Kan niet lezen uit localStorage:', e);
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('Fout bij opslaan in localStorage:', e);
      if (typeof showToast === 'function') {
        showToast('Opslaan in browseropslag mislukt (opslaglimiet of geblokkeerd).');
      }
      return false;
    }
  }

  function parseNumericInput(val, fallback = 0) {
    if (val === undefined || val === null || val === '') return fallback;
    const cleaned = String(val).replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  }

  /**
   * Formateer de vaste ISP-projectbenaming:
   * "[Projectnummer vanaf 200001] [Klant] [Omschrijving project]"
   * Bijv.: "200490 Rotterdam Food Processing RVS Doseerunit & Transportband Lijn 4"
   */
  function formatIspProjectTitle(project, anonymizeClient = false) {
    if (!project) return '';
    const num = project.projectnummer || '200001';
    const client = anonymizeClient ? 'Opdrachtgever (Geanonimiseerd)' : (project.klant || 'Klant');
    const desc = project.projectnaam || 'Omschrijving project';
    return `${num} ${client} ${desc}`;
  }

  function extractProjectNumberInt(projectnummer) {
    const num = parseInt(String(projectnummer || '').replace(/\D/g, ''), 10);
    return isNaN(num) ? ISP_START_PROJECT_NUMBER : num;
  }

  function getNextIspProjectNumber(projects) {
    if (!Array.isArray(projects) || projects.length === 0) {
      return String(ISP_CURRENT_MAX_DEMO_NUMBER + 1);
    }
    let max = ISP_CURRENT_MAX_DEMO_NUMBER;
    for (const p of projects) {
      const parsed = extractProjectNumberInt(p.projectnummer);
      if (parsed > max) {
        max = parsed;
      }
    }
    return String(max + 1);
  }

  /* ===================================================================
   * 2. DEMO PROJECTEN GENERATOR (200001 t/m 200490: 490 PROJECTEN)
   * =================================================================== */
  function getDefaultDemoProjects(hourlyRate = DEFAULT_GLOBAL_RATE) {
    const specialProjectsByNum = {
      200490: {
        klant: 'Rotterdam Food Processing',
        projectnaam: 'RVS Doseerunit & Transportband Lijn 4',
        status: 'Lopend',
        begroteUren: 160,
        werkelijkeUren: 142,
        begrootMateriaal: 18500,
        werkelijkMateriaal: 17200,
        bestelstatus: 'Op schema - Alle RVS lascomponenten en sensoren aanwezig in magazijn Barendrecht',
        heeftVertraging: false
      },
      200489: {
        klant: 'Delta Maritime Systems',
        projectnaam: 'Hydraulische Persunit & Besturingskast',
        status: 'Lopend',
        begroteUren: 200,
        werkelijkeUren: 214,
        begrootMateriaal: 24000,
        werkelijkMateriaal: 24350,
        bestelstatus: 'Kritieke vertraging onderdeel: SEW Eurodrive Servomotor (+8 werkdagen levertijd)',
        heeftVertraging: true
      },
      200488: {
        klant: 'Europoort Petrochemie',
        projectnaam: 'Modulaire Skids & Hogedruk Piping Assemblage',
        status: 'Afgerond',
        begroteUren: 120,
        werkelijkeUren: 136,
        begrootMateriaal: 15000,
        werkelijkMateriaal: 21800,
        bestelstatus: 'Geleverd (Spoedorder ATEX-afsluiters & 316L flenzen ingekocht tegen meerprijs)',
        heeftVertraging: false
      },
      200487: {
        klant: 'Damen Shipyards',
        projectnaam: 'RVS Pompunit & Koelwater Manifold',
        status: 'Lopend',
        begroteUren: 110,
        werkelijkeUren: 92,
        begrootMateriaal: 14200,
        werkelijkMateriaal: 13800,
        bestelstatus: 'Op schema - Alle flenzen en pomponderdelen binnen',
        heeftVertraging: false
      },
      200486: {
        klant: 'Vopak Terminal Europort',
        projectnaam: 'Revisie Kleppenstation & Pneumatische Actuators',
        status: 'Lopend',
        begroteUren: 90,
        werkelijkeUren: 94,
        begrootMateriaal: 11500,
        werkelijkMateriaal: 11400,
        bestelstatus: 'Wacht op levering RVS 316L lasflenzen (Backorder leverancier)',
        heeftVertraging: true
      },
      200485: {
        klant: 'Boskalis Nederland',
        projectnaam: 'Assemblage Hydraulisch Dekframe & Lierfundatie',
        status: 'Lopend',
        begroteUren: 180,
        werkelijkeUren: 206,
        begrootMateriaal: 22000,
        werkelijkMateriaal: 24900,
        bestelstatus: 'Kritieke vertraging onderdeel: Rexroth Proportioneel Ventielblok (+5 dagen)',
        heeftVertraging: true
      },
      200001: {
        klant: 'Damen Shipyards',
        projectnaam: 'Revisie Boegschroef Asafdichting & Flenswerk',
        status: 'Afgerond',
        begroteUren: 80,
        werkelijkeUren: 74,
        begrootMateriaal: 6400,
        werkelijkMateriaal: 6150,
        bestelstatus: 'Geleverd - Afgerond binnen begroting',
        heeftVertraging: false
      }
    };

    const ispClients = [
      'Damen Shipyards',
      'Vopak Terminal Europort',
      'Boskalis Nederland',
      'Rotterdam Food Processing',
      'Delta Maritime Systems',
      'Europoort Petrochemie',
      'Maasvlakte Terminals',
      'Heerema Fabrication Group',
      'Van Oord Offshore',
      'Stolt Tankers Rotterdam',
      'APM Terminals Maasvlakte',
      'Huntsman Holland',
      'Shell Pernis Refinery',
      'LyondellBasell Botlek',
      'Unilever Process Tech'
    ];

    const ispProjectDescriptions = [
      'RVS 316L Pompunit & Manifold',
      'Revisie Koelwaterpomp & Asafdichting',
      'Constructie RVS Bordes & Trappenhal',
      'Hydraulisch Aggregaat & Leidingwerk',
      'ATEX Besturingskast & RVS Frame',
      'Modulaire Doseerskid & Flowmeters',
      'Revisie Tandwielkast & Koppeling',
      'Lierfundatie & Dekframe Constructie',
      'Warmtewisselaar Flensrevisie & Persen',
      'RVS Transportband & Bekleding',
      'Afsluiterskid & Pneumatische Actuators',
      'Machinale Nabewerking Pomphuis'
    ];

    const allProjects = [];

    // Genereer van 200490 aflopend naar 200001 zodat de nieuwste bovenaan staan
    for (let num = ISP_CURRENT_MAX_DEMO_NUMBER; num >= ISP_START_PROJECT_NUMBER; num--) {
      if (specialProjectsByNum[num]) {
        const sp = specialProjectsByNum[num];
        const spBudget = (sp.begroteUren * hourlyRate) + sp.begrootMateriaal;
        allProjects.push({
          projectnummer: String(num),
          klant: sp.klant,
          projectnaam: sp.projectnaam,
          status: sp.status,
          begroteUren: sp.begroteUren,
          werkelijkeUren: sp.werkelijkeUren,
          begrootMateriaal: sp.begrootMateriaal,
          werkelijkMateriaal: sp.werkelijkMateriaal,
          tarief: hourlyRate,
          verkoopprijs: Math.round(spBudget * DEFAULT_SALES_MARKUP_FACTOR),
          bestelstatus: sp.bestelstatus,
          heeftVertraging: sp.heeftVertraging,
          aiVerified: false
        });
        continue;
      }

      const seed = num - ISP_START_PROJECT_NUMBER;
      const klant = ispClients[seed % ispClients.length];
      const projectnaam = ispProjectDescriptions[(seed * 3) % ispProjectDescriptions.length];
      const isRecentLopend = num >= 200476; // 200476 t/m 200490 zijn actuele lopende projecten
      const status = isRecentLopend ? 'Lopend' : 'Afgerond';

      const begroteUren = 40 + ((seed * 17) % 180);
      const begrootMateriaal = 3500 + ((seed * 1300) % 24000);

      let werkelijkeUren = begroteUren;
      let werkelijkMateriaal = begrootMateriaal;
      let bestelstatus = isRecentLopend
        ? 'Op schema - Alle materialen aanwezig in werkplaats Barendrecht'
        : 'Geleverd - Project afgerond en gefactureerd';
      let heeftVertraging = false;

      if (num === 200482) {
        werkelijkeUren = Math.round(begroteUren * 1.06);
        werkelijkMateriaal = Math.round(begrootMateriaal * 1.03);
        bestelstatus = 'Wacht op levering SKF Pendelrollenlagers (+4 werkdagen)';
        heeftVertraging = true;
      } else if (num === 200479) {
        werkelijkeUren = Math.round(begroteUren * 1.15);
        werkelijkMateriaal = Math.round(begrootMateriaal * 1.12);
        bestelstatus = 'Op schema - Extra paswerkzaamheden aan flensverbinding';
        heeftVertraging = false;
      } else if (isRecentLopend) {
        werkelijkeUren = Math.round(begroteUren * (0.65 + ((seed % 25) / 100)));
        werkelijkMateriaal = Math.round(begrootMateriaal * (0.80 + ((seed % 16) / 100)));
      } else {
        const mod = seed % 12;
        if (mod === 11) {
          werkelijkeUren = Math.round(begroteUren * 1.16);
          werkelijkMateriaal = Math.round(begrootMateriaal * 1.14);
          bestelstatus = 'Geleverd (Meerwerk en extra materiaalinkoop tijdens montage)';
        } else if (mod === 7 || mod === 8) {
          werkelijkeUren = Math.round(begroteUren * 1.06);
          werkelijkMateriaal = Math.round(begrootMateriaal * 1.04);
          bestelstatus = 'Geleverd (Lichte urenuitloop bij eindtest)';
        } else {
          werkelijkeUren = Math.round(begroteUren * (0.88 + ((seed % 11) / 100)));
          werkelijkMateriaal = Math.round(begrootMateriaal * (0.90 + ((seed % 9) / 100)));
        }
      }

      const baseBudget = (begroteUren * hourlyRate) + begrootMateriaal;
      allProjects.push({
        projectnummer: String(num),
        klant,
        projectnaam,
        status,
        begroteUren,
        werkelijkeUren,
        begrootMateriaal,
        werkelijkMateriaal,
        tarief: hourlyRate,
        verkoopprijs: Math.round(baseBudget * DEFAULT_SALES_MARKUP_FACTOR),
        bestelstatus,
        heeftVertraging,
        aiVerified: false
      });
    }

    return allProjects;
  }

  function normalizeProjectObject(raw, fallbackRate = DEFAULT_GLOBAL_RATE, fallbackOffset = 0) {
    const bestelstatus = String(raw.bestelstatus || 'Op schema').trim();
    const autoDelayDetected = detectSupplierDelayFromText(bestelstatus);
    const defaultNum = String(ISP_START_PROJECT_NUMBER + fallbackOffset);
    const begroteUren = Math.max(0, parseNumericInput(raw.begroteUren, 0));
    const werkelijkeUren = Math.max(0, parseNumericInput(raw.werkelijkeUren, 0));
    const begrootMateriaal = Math.max(0, parseNumericInput(raw.begrootMateriaal, 0));
    const werkelijkMateriaal = Math.max(0, parseNumericInput(raw.werkelijkMateriaal, 0));
    const tarief = Math.max(0, parseNumericInput(raw.tarief, fallbackRate));
    const defaultSalesPrice = Math.round(((begroteUren * tarief) + begrootMateriaal) * DEFAULT_SALES_MARKUP_FACTOR);
    const hasExplicitSales = raw.verkoopprijs !== undefined && raw.verkoopprijs !== null && raw.verkoopprijs !== '';
    const verkoopprijs = hasExplicitSales
      ? Math.max(0, parseNumericInput(raw.verkoopprijs, defaultSalesPrice))
      : defaultSalesPrice;

    const normalized = {
      projectnummer: String(raw.projectnummer || defaultNum).trim(),
      klant: String(raw.klant || 'Onbekende Klant').trim(),
      projectnaam: String(raw.projectnaam || 'Omschrijving project').trim(),
      status: String(raw.status || 'Lopend').toLowerCase().includes('afgerond') ? 'Afgerond' : 'Lopend',
      begroteUren,
      werkelijkeUren,
      begrootMateriaal,
      werkelijkMateriaal,
      tarief,
      verkoopprijs,
      bestelstatus,
      heeftVertraging: typeof raw.heeftVertraging === 'boolean' ? raw.heeftVertraging : autoDelayDetected,
      aiVerified: Boolean(raw.aiVerified)
    };

    if (raw.werkelijkeWerkplaatsUren !== undefined) normalized.werkelijkeWerkplaatsUren = Math.max(0, parseNumericInput(raw.werkelijkeWerkplaatsUren, 0));
    if (raw.werkelijkeKantoorUren !== undefined) normalized.werkelijkeKantoorUren = Math.max(0, parseNumericInput(raw.werkelijkeKantoorUren, 0));
    if (raw.werkelijkeOveruren !== undefined) normalized.werkelijkeOveruren = Math.max(0, parseNumericInput(raw.werkelijkeOveruren, 0));
    if (raw.begroteWerkplaatsUren !== undefined) normalized.begroteWerkplaatsUren = Math.max(0, parseNumericInput(raw.begroteWerkplaatsUren, 0));
    if (raw.begroteKantoorUren !== undefined) normalized.begroteKantoorUren = Math.max(0, parseNumericInput(raw.begroteKantoorUren, 0));
    if (raw.urenLaatstGeimporteerd) normalized.urenLaatstGeimporteerd = String(raw.urenLaatstGeimporteerd);
    if (raw.calculatieLaatstGeimporteerd) normalized.calculatieLaatstGeimporteerd = String(raw.calculatieLaatstGeimporteerd);

    return normalized;
  }

  function detectSupplierDelayFromText(statusText) {
    if (!statusText) return false;
    const lower = statusText.toLowerCase();
    if (lower.startsWith('op schema') || lower.startsWith('geleverd')) {
      return false;
    }
    const delayKeywords = ['vertraging', 'backorder', 'te laat', 'wacht op', 'kritiek', 'niet geleverd', 'uitgesteld'];
    return delayKeywords.some(k => lower.includes(k));
  }

  /* ===================================================================
   * 3. APPLICATION STATE & PERSISTENTIE (LOCALSTORAGE)
   * =================================================================== */
  const AppState = {
    projects: [],
    selectedProjectId: '200490',
    recentProjectIds: ['200490', '200489', '200488', '200485', '200001'],
    globalHourlyRate: DEFAULT_GLOBAL_RATE,
    geminiApiKey: '',
    anonymizeBeforeAi: true,
    clientViewActive: false,
    activeTab: 'home', // 'home' | 'dashboard' | 'morning'
    homeFilter: 'Lopend',
    homeTableQuery: '',
    homeSortBy: 'NEWEST',
    homePage: 1,
    homePageSize: 20,
    morningOnlyActive: true,
    morningTableFilter: 'Lopend',
    morningNotes: [],
    lastSavedAt: null,

    init() {
      const savedRate = parseFloat(safeStorageGet(STORAGE_KEYS.GLOBAL_RATE));
      this.globalHourlyRate = !isNaN(savedRate) && savedRate > 0 ? savedRate : DEFAULT_GLOBAL_RATE;

      this.geminiApiKey = safeStorageGet(STORAGE_KEYS.GEMINI_API_KEY) || '';

      const savedAnon = safeStorageGet(STORAGE_KEYS.ANONYMIZE_AI);
      this.anonymizeBeforeAi = savedAnon === null ? true : savedAnon === 'true';

      const savedClientView = safeStorageGet(STORAGE_KEYS.CLIENT_VIEW);
      this.clientViewActive = savedClientView === 'true';

      const savedMorningActive = safeStorageGet(STORAGE_KEYS.MORNING_ONLY_ACTIVE);
      this.morningOnlyActive = savedMorningActive === null ? true : savedMorningActive === 'true';

      const savedMorningFilter = safeStorageGet(STORAGE_KEYS.MORNING_FILTER);
      if (savedMorningFilter === 'Lopend' || savedMorningFilter === 'Afgerond' || savedMorningFilter === 'Alles') {
        this.morningTableFilter = savedMorningFilter;
      }

      const rawRecent = safeStorageGet(STORAGE_KEYS.RECENT_IDS);
      if (rawRecent) {
        try {
          const parsedRecent = JSON.parse(rawRecent);
          if (Array.isArray(parsedRecent) && parsedRecent.length > 0) {
            this.recentProjectIds = parsedRecent.map(String);
          }
        } catch (e) {
          console.warn('Fout bij lezen recente projecten:', e);
        }
      }

      const rawNotes = safeStorageGet(STORAGE_KEYS.MORNING_NOTES);
      if (rawNotes) {
        try {
          const parsedNotes = JSON.parse(rawNotes);
          if (Array.isArray(parsedNotes)) {
            this.morningNotes = parsedNotes;
          }
        } catch (e) {
          console.warn('Fout bij lezen ochtendoverleg notities:', e);
        }
      }

      this.projects = [];
      const rawProjects = safeStorageGet(STORAGE_KEYS.PROJECTS);
      if (rawProjects) {
        try {
          const parsed = JSON.parse(rawProjects);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.projects = parsed.map((p, idx) => normalizeProjectObject(p, this.globalHourlyRate, idx));
          }
        } catch (e) {
          console.warn('Fout bij lezen localStorage projecten, herstel demodata:', e);
        }
      }

      if (this.projects.length === 0) {
        this.projects = getDefaultDemoProjects(this.globalHourlyRate);
        this.saveProjects();
      }

      const savedSelectedId = safeStorageGet(STORAGE_KEYS.SELECTED_ID);
      if (savedSelectedId && this.projects.some(p => p.projectnummer === savedSelectedId)) {
        this.selectedProjectId = savedSelectedId;
      } else {
        this.selectedProjectId = this.projects[0].projectnummer;
      }
    },

    saveProjects() {
      const okProjects = safeStorageSet(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
      const okSelected = safeStorageSet(STORAGE_KEYS.SELECTED_ID, this.selectedProjectId);
      safeStorageSet(STORAGE_KEYS.RECENT_IDS, JSON.stringify(this.recentProjectIds));
      if (okProjects && okSelected) {
        this.lastSavedAt = new Date();
        updateSaveStatusIndicator();
      }
      return okProjects && okSelected;
    },

    saveSettings() {
      const okRate = safeStorageSet(STORAGE_KEYS.GLOBAL_RATE, String(this.globalHourlyRate));
      const okKey = safeStorageSet(STORAGE_KEYS.GEMINI_API_KEY, this.geminiApiKey);
      const okAnon = safeStorageSet(STORAGE_KEYS.ANONYMIZE_AI, String(this.anonymizeBeforeAi));
      return okRate && okKey && okAnon;
    },

    saveUiPreferences() {
      safeStorageSet(STORAGE_KEYS.CLIENT_VIEW, String(this.clientViewActive));
      safeStorageSet(STORAGE_KEYS.MORNING_ONLY_ACTIVE, String(this.morningOnlyActive));
      safeStorageSet(STORAGE_KEYS.MORNING_FILTER, String(this.morningTableFilter || 'Lopend'));
    },

    saveMorningNotes() {
      return safeStorageSet(STORAGE_KEYS.MORNING_NOTES, JSON.stringify(this.morningNotes || []));
    },

    addMorningNote(note) {
      if (!Array.isArray(this.morningNotes)) this.morningNotes = [];
      this.morningNotes.unshift(note);
      this.saveMorningNotes();
    },

    removeMorningNote(noteId) {
      this.morningNotes = (this.morningNotes || []).filter(n => n.id !== noteId);
      this.saveMorningNotes();
    },

    getCurrentProject() {
      return this.projects.find(p => p.projectnummer === this.selectedProjectId) || this.projects[0];
    },

    trackRecentProject(projectnummer) {
      const clean = String(projectnummer);
      this.recentProjectIds = [clean, ...this.recentProjectIds.filter(id => id !== clean)].slice(0, 6);
      safeStorageSet(STORAGE_KEYS.RECENT_IDS, JSON.stringify(this.recentProjectIds));
    },

    resetToDemoData() {
      this.globalHourlyRate = DEFAULT_GLOBAL_RATE;
      this.projects = getDefaultDemoProjects(this.globalHourlyRate);
      this.selectedProjectId = '200490';
      this.recentProjectIds = ['200490', '200489', '200488', '200485', '200001'];
      this.homePage = 1;
      this.saveProjects();
      this.saveSettings();
    }
  };

  function updateSaveStatusIndicator() {
    const el = document.getElementById('saveStatusIndicator');
    if (el && AppState.lastSavedAt) {
      const timeStr = AppState.lastSavedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      el.textContent = `Opgeslagen in browser (${timeStr})`;
      el.classList.remove('text-slate-500');
      el.classList.add('text-emerald-700', 'font-semibold');
    }
  }

  /* ===================================================================
   * 4. BEREKENINGSENGINE (VOORCALCULATIE VS. NACALCULATIE)
   * =================================================================== */
  function calculateProjectMetrics(project) {
    const begroteUren = Number(project.begroteUren) || 0;
    const werkelijkeUren = Number(project.werkelijkeUren) || 0;
    const uurtarief = project.tarief !== undefined && project.tarief !== null && project.tarief !== ''
      ? Math.max(0, Number(project.tarief) || 0)
      : DEFAULT_GLOBAL_RATE;
    const begrootMateriaal = Number(project.begrootMateriaal) || 0;
    const werkelijkMateriaal = Number(project.werkelijkMateriaal) || 0;

    const arbeidBegroot = begroteUren * uurtarief;
    const arbeidWerkelijk = werkelijkeUren * uurtarief;

    const totaalBegrootBudget = arbeidBegroot + begrootMateriaal;
    const totaleWerkelijkeKosten = arbeidWerkelijk + werkelijkMateriaal;

    const hasExplicitSales = project.verkoopprijs !== undefined && project.verkoopprijs !== null && project.verkoopprijs !== '' && !isNaN(Number(project.verkoopprijs));
    const verkoopprijs = hasExplicitSales
      ? Math.max(0, Number(project.verkoopprijs))
      : Math.round(totaalBegrootBudget * DEFAULT_SALES_MARKUP_FACTOR);

    const begroteMargeEuro = verkoopprijs - totaalBegrootBudget;
    const begroteMargePct = verkoopprijs > 0 ? (begroteMargeEuro / verkoopprijs) * 100 : 0;
    const gerealiseerdeMargeEuro = verkoopprijs - totaleWerkelijkeKosten;
    const gerealiseerdeMargePct = verkoopprijs > 0 ? (gerealiseerdeMargeEuro / verkoopprijs) * 100 : 0;

    const verschilBudget = totaalBegrootBudget - totaleWerkelijkeKosten;
    const verschilUren = begroteUren - werkelijkeUren;
    const verschilMateriaal = begrootMateriaal - werkelijkMateriaal;
    const verschilArbeid = arbeidBegroot - arbeidWerkelijk;

    const afwijkingBudgetPct = totaalBegrootBudget > 0
      ? ((totaleWerkelijkeKosten - totaalBegrootBudget) / totaalBegrootBudget) * 100
      : (totaleWerkelijkeKosten > 0 ? 100 : 0);

    const afwijkingUrenPct = begroteUren > 0
      ? ((werkelijkeUren - begroteUren) / begroteUren) * 100
      : (werkelijkeUren > 0 ? 100 : 0);

    const afwijkingMateriaalPct = begrootMateriaal > 0
      ? ((werkelijkMateriaal - begrootMateriaal) / begrootMateriaal) * 100
      : (werkelijkMateriaal > 0 ? 100 : 0);

    const heeftVertraging = typeof project.heeftVertraging === 'boolean'
      ? project.heeftVertraging
      : detectSupplierDelayFromText(project.bestelstatus);

    let statusLevel = 'GROEN';
    let statusLabel = 'Binnen Budget';
    const reasons = [];

    const isCriticalCost = afwijkingBudgetPct >= 10;
    const isCriticalHours = afwijkingUrenPct >= 10;
    const isMinorCost = afwijkingBudgetPct > 0 && afwijkingBudgetPct < 10;
    const isMinorHours = afwijkingUrenPct > 0 && afwijkingUrenPct < 10;

    if (isCriticalCost || isCriticalHours) {
      statusLevel = 'ROOD';
      statusLabel = 'Kritieke Overschrijding';
      if (isCriticalCost) reasons.push(`Totale kosten +${afwijkingBudgetPct.toFixed(1)}% (≥10%)`);
      if (isCriticalHours) reasons.push(`Werkplaatsuren +${afwijkingUrenPct.toFixed(1)}% (≥10%)`);
      if (heeftVertraging) reasons.push('Toeleveranciersvertraging');
    } else if (isMinorCost || isMinorHours || heeftVertraging) {
      statusLevel = 'ORANJE';
      statusLabel = 'Risico';
      if (isMinorHours) reasons.push(`Urenuitloop +${afwijkingUrenPct.toFixed(1)}% (<10%)`);
      if (isMinorCost) reasons.push(`Kostenoverschrijding +${afwijkingBudgetPct.toFixed(1)}% (<10%)`);
      if (heeftVertraging) reasons.push('Vertraging toeleverancier gemeld');
    } else {
      statusLevel = 'GROEN';
      statusLabel = 'Binnen Budget';
      reasons.push('Kosten & uren binnen begroting, leveringen op schema');
    }

    return {
      begroteUren,
      werkelijkeUren,
      uurtarief,
      begrootMateriaal,
      werkelijkMateriaal,
      arbeidBegroot,
      arbeidWerkelijk,
      totaalBegrootBudget,
      totaleWerkelijkeKosten,
      verkoopprijs,
      begroteMargeEuro,
      begroteMargePct,
      gerealiseerdeMargeEuro,
      gerealiseerdeMargePct,
      verschilBudget,
      verschilUren,
      verschilMateriaal,
      verschilArbeid,
      afwijkingBudgetPct,
      afwijkingUrenPct,
      afwijkingMateriaalPct,
      heeftVertraging,
      statusLevel,
      statusLabel,
      statusReason: reasons.join(' • '),
      needsMorningAttention: statusLevel === 'ROOD' || statusLevel === 'ORANJE' || heeftVertraging
    };
  }

  /* ===================================================================
   * 5. FORMATTERING & TOAST NOTIFICATIES
   * =================================================================== */
  const euroFormatter = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatEuro(val) {
    return euroFormatter.format(Number(val) || 0);
  }

  function formatSignedEuro(val) {
    const num = Number(val) || 0;
    const sign = num > 0 ? '+ ' : num < 0 ? '- ' : '';
    return sign + euroFormatter.format(Math.abs(num));
  }

  function formatSignedPct(val) {
    const num = Number(val) || 0;
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1).replace('.', ',')}%`;
  }

  function formatNumber(val) {
    const num = Number(val) || 0;
    if (Number.isInteger(num)) return String(num);
    return Number(num.toFixed(2)).toString().replace('.', ',');
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const textEl = document.getElementById('toastMessageText');
    if (!toast || !textEl) return;
    textEl.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('flex');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('flex');
    }, 2800);
  }

  /* ===================================================================
   * 6. SLIMME ZOEKER & NAVIGATIE ACTIES
   * =================================================================== */
  function findProjectsBySmartQuery(rawQuery) {
    const q = String(rawQuery || '').trim().toLowerCase();
    if (!q) return [];

    const exactMatches = [];
    const startsWithMatches = [];
    const textMatches = [];

    let expandedNumStr = null;
    if (/^\d{1,4}$/.test(q)) {
      const n = parseInt(q, 10);
      expandedNumStr = String(200000 + n);
    }

    AppState.projects.forEach(p => {
      const pNumLower = p.projectnummer.toLowerCase();
      const fullTitleLower = formatIspProjectTitle(p).toLowerCase();

      if (pNumLower === q || (expandedNumStr && pNumLower === expandedNumStr)) {
        exactMatches.push(p);
      } else if (pNumLower.endsWith(q) || pNumLower.includes(q)) {
        startsWithMatches.push(p);
      } else if (fullTitleLower.includes(q)) {
        textMatches.push(p);
      }
    });

    return [...exactMatches, ...startsWithMatches, ...textMatches];
  }

  function openProjectStatusScreen(projectnummer) {
    const target = AppState.projects.find(p => p.projectnummer === String(projectnummer));
    if (!target) {
      showToast(`Projectnummer ${projectnummer} niet gevonden.`);
      return;
    }
    AppState.selectedProjectId = target.projectnummer;
    AppState.trackRecentProject(target.projectnummer);
    AppState.saveProjects();
    if (!document.getElementById('viewProjectDashboard')) {
      window.location.href = 'dashboard.html';
      return;
    }
    renderAll(true);
    switchTab('dashboard');
    showToast(`Status geopend: ${formatIspProjectTitle(target, AppState.clientViewActive)}`);
  }

  /* ===================================================================
   * 7. CSV / EXCEL IMPORT & EXPORT (VOORCALCULATIE, UREN & PROJECTLIJST)
   * =================================================================== */
  function stripUtf8Bom(str) {
    return String(str || '').replace(/^\uFEFF/, '');
  }

  function detectCsvDelimiter(lines) {
    const sample = lines.slice(0, 20).join('\n');
    const semiCount = (sample.match(/;/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;

    if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) return ';';
    if (tabCount > commaCount && tabCount > semiCount) return '\t';
    return ',';
  }

  function splitCsvRow(rowStr, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const ch = rowStr[i];
      if (ch === '"') {
        if (inQuotes && rowStr[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseCleanNumber(val, delimiter = ';') {
    if (val === undefined || val === null) return 0;
    const raw = String(val).trim();
    if (!raw || raw === '-' || raw === '--' || raw.startsWith('#')) return 0;

    const hasCurrency = /€/.test(raw);
    let s = raw.replace(/[€%\s\u00A0]/g, '').trim();
    if (!s || s === '-' || s === '--' || s.startsWith('#')) return 0;

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (lastComma !== -1) {
      if (/^-?\d{1,3}(,\d{3})+$/.test(s) && delimiter === ',' && !hasCurrency) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(/,/g, '.');
      }
    } else if (lastDot !== -1) {
      if ((hasCurrency || delimiter === ';') && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
      }
    }

    const n = parseFloat(s);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  }

  function normalizeHeaderToken(h) {
    return stripUtf8Bom(h).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function findColumnIndexExactFirst(normalizedHeaders, exactAliases, partialAliases, fallbackIdx = -1) {
    for (const alias of exactAliases) {
      const idx = normalizedHeaders.findIndex(h => h === alias);
      if (idx !== -1) return idx;
    }
    for (const alias of partialAliases) {
      const idx = normalizedHeaders.findIndex(h => h.includes(alias));
      if (idx !== -1) return idx;
    }
    return fallbackIdx;
  }

  function extractProjectNumberFromTextOrName(text) {
    const clean = String(text || '').trim();
    const match200 = clean.match(/\b(200\d{3,}|2\d{5})\b/);
    return match200 ? match200[1] : null;
  }

  function isValidHoursProjectCode(code, existingSet) {
    const clean = String(code || '').trim();
    if (!clean || clean.startsWith('#')) return false;
    if (existingSet && existingSet.has(clean.toLowerCase())) return true;
    return /^(200\d{3,}|2\d{5}|P\d{4,})$/i.test(clean);
  }

  function parseHoursRegistrationCsv(rows, delimiter, headerIdx, existingProjects = []) {
    const headerRow = rows[headerIdx].map(normalizeHeaderToken);
    const projectIdx = findColumnIndexExactFirst(headerRow, ['projectnummer', 'projectnr', 'projectid'], ['projectnummer', 'projectnr', 'projectid', 'project'], 0);
    const urenIdx = findColumnIndexExactFirst(headerRow, ['uren', 'hours', 'aantaluren'], ['gewerkteuren', 'aantaluren'], 2);
    const overurenIdx = findColumnIndexExactFirst(headerRow, ['overuren', 'overtime', 'meeruren'], ['overuren', 'overtime', 'meeruren'], -1);
    let afdelingIdx = findColumnIndexExactFirst(headerRow, ['afdeling', 'categorie', 'type', 'werksoort'], ['afdeling', 'categorie', 'werksoort'], -1);

    // In ISP Urenregistratie 2026-1.csv heeft kolom 5 geen header-tekst, maar waarden als Kantoor / Werkplaats
    if (afdelingIdx === -1) {
      const counts = {};
      const scanLimit = Math.min(rows.length, headerIdx + 120);
      for (let r = headerIdx + 1; r < scanLimit; r++) {
        const cols = rows[r];
        for (let c = 0; c < cols.length; c++) {
          if (c === projectIdx || c === urenIdx || c === overurenIdx) continue;
          const v = String(cols[c] || '').trim().toLowerCase();
          if (v === 'werkplaats' || v === 'kantoor' || v === 'verkoop' || v === 'montage') {
            counts[c] = (counts[c] || 0) + 1;
          }
        }
      }
      let bestCol = -1;
      let bestCount = 0;
      for (const [colStr, count] of Object.entries(counts)) {
        if (count > bestCount) {
          bestCount = count;
          bestCol = Number(colStr);
        }
      }
      afdelingIdx = bestCol;
    }

    const existingSet = new Set((existingProjects || []).map(p => String(p.projectnummer).toLowerCase()));
    const byProject = new Map();
    let rowsProcessed = 0;
    let skippedInternalRows = 0;
    let skippedErrorRows = 0;
    let totalHours = 0;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const cols = rows[r];
      const rawProj = stripUtf8Bom(cols[projectIdx] || '').trim();
      const normProjToken = normalizeHeaderToken(rawProj);

      if (!rawProj || rawProj.startsWith('#') || normProjToken === 'projectnummer') {
        if (rawProj.startsWith('#')) skippedErrorRows++;
        continue;
      }

      if (/^\d{1,3}$/.test(rawProj) && !existingSet.has(rawProj.toLowerCase())) {
        skippedInternalRows++;
        continue;
      }

      if (!isValidHoursProjectCode(rawProj, existingSet)) {
        skippedErrorRows++;
        continue;
      }

      const regularHours = urenIdx >= 0 ? Math.max(0, parseCleanNumber(cols[urenIdx], delimiter)) : 0;
      const overtimeHours = overurenIdx >= 0 ? Math.max(0, parseCleanNumber(cols[overurenIdx], delimiter)) : 0;
      const rowHours = regularHours + overtimeHours;
      const dept = afdelingIdx >= 0 ? String(cols[afdelingIdx] || '').trim().toLowerCase() : '';

      const key = rawProj.toLowerCase();
      if (!byProject.has(key)) {
        byProject.set(key, {
          projectnummer: rawProj,
          totalUren: 0,
          werkplaatsUren: 0,
          kantoorUren: 0,
          overuren: 0,
          rowCount: 0
        });
      }

      const agg = byProject.get(key);
      agg.totalUren += rowHours;
      agg.overuren += overtimeHours;
      agg.rowCount += 1;
      if (dept.includes('werkplaats') || dept.includes('montage')) {
        agg.werkplaatsUren += rowHours;
      } else if (dept.includes('kantoor')) {
        agg.kantoorUren += rowHours;
      }

      rowsProcessed++;
      totalHours += rowHours;
    }

    const entries = Array.from(byProject.values()).map(entry => ({
      ...entry,
      totalUren: Math.round(entry.totalUren * 100) / 100,
      werkplaatsUren: Math.round(entry.werkplaatsUren * 100) / 100,
      kantoorUren: Math.round(entry.kantoorUren * 100) / 100,
      overuren: Math.round(entry.overuren * 100) / 100
    }));

    if (entries.length === 0) {
      throw new Error('Geen geldige projecturen gevonden in dit urenregistratie-bestand.');
    }

    return {
      format: 'urenregistratie',
      headerLineIndex: headerIdx,
      entries,
      rowsProcessed,
      skippedInternalRows,
      skippedErrorRows,
      totalHours: Math.round(totalHours * 100) / 100
    };
  }

  function parseBasicCalculationCsv(rows, delimiter, detailHeaderIdx, defaultRate, fileName = '') {
    let detectedProjectNumber = null;
    let detectedClient = null;
    let detectedName = null;

    const searchMaxRow = detailHeaderIdx !== -1 ? detailHeaderIdx : Math.min(rows.length, 15);

    // 1. Zoek naar expliciet label Projectnummer / Klant / Projectnaam in metadata-rijen
    for (let r = 0; r < rows.length; r++) {
      const cols = rows[r];
      for (let c = 0; c < cols.length; c++) {
        const cell = stripUtf8Bom(cols[c] || '').trim();
        if (!cell) continue;
        const lower = cell.toLowerCase();

        if (!detectedProjectNumber && /project\s*(nummer|nr|code|id)/i.test(lower)) {
          const inlineMatch = cell.match(/(?:project\s*(?:nummer|nr|code|id)\s*[:=\-]?\s*)([A-Za-z0-9\-]+)/i);
          if (inlineMatch && inlineMatch[1] && /\d{3,}/.test(inlineMatch[1])) {
            detectedProjectNumber = inlineMatch[1].trim();
          } else {
            for (let nc = c + 1; nc < cols.length; nc++) {
              const nextVal = String(cols[nc] || '').trim();
              if (nextVal && /\d{3,}/.test(nextVal)) {
                detectedProjectNumber = nextVal;
                break;
              }
            }
            if (!detectedProjectNumber && rows[r + 1]) {
              const belowVal = String(rows[r + 1][c] || '').trim();
              if (belowVal && /\d{3,}/.test(belowVal)) {
                detectedProjectNumber = belowVal;
              }
            }
          }
        }

        if (r < searchMaxRow) {
          if (!detectedClient && /^(klant|opdrachtgever)\s*[:=\-]?$/i.test(lower)) {
            for (let nc = c + 1; nc < cols.length; nc++) {
              const nextVal = String(cols[nc] || '').trim();
              if (nextVal) {
                detectedClient = nextVal;
                break;
              }
            }
          }
          if (!detectedName && /^(projectnaam|omschrijving|projectomschrijving)\s*[:=\-]?$/i.test(lower)) {
            for (let nc = c + 1; nc < cols.length; nc++) {
              const nextVal = String(cols[nc] || '').trim();
              if (nextVal) {
                detectedName = nextVal;
                break;
              }
            }
          }
        }
      }
    }

    // Fallback: zoek 6-cijferig ISP-projectnummer (200xxx / 24xxxx) in metadata boven de calculatietabel of in bestandsnaam
    if (!detectedProjectNumber) {
      for (let r = 0; r < searchMaxRow && !detectedProjectNumber; r++) {
        for (let c = 0; c < Math.min(rows[r].length, 6); c++) {
          const val = stripUtf8Bom(rows[r][c] || '').trim();
          if (/^(200\d{3,}|2\d{5}|P\d{5,})$/i.test(val)) {
            detectedProjectNumber = val;
            break;
          }
        }
      }
    }
    if (!detectedProjectNumber && fileName) {
      detectedProjectNumber = extractProjectNumberFromTextOrName(fileName);
    }

    // 2. Lees samenvattingsblok (Werkplaatsuren / Kantooruren / Materialen) bovenaan
    let summaryWerkplaatsUren = 0;
    let summaryKantoorUren = 0;
    let summaryTotalVerkoop = 0;
    for (let r = 0; r < searchMaxRow; r++) {
      const cols = rows[r];
      const typeCode = String(cols[5] || '').trim();
      const label = String(cols[6] || '').trim().toLowerCase();
      const salesCell = parseCleanNumber(cols[7], delimiter);
      const hoursCell = parseCleanNumber(cols[8], delimiter);

      if (typeCode === '1' || label.includes('werkplaatsuren')) {
        if (hoursCell > 0) summaryWerkplaatsUren = hoursCell;
        if (salesCell > 0) summaryTotalVerkoop += salesCell;
      } else if (typeCode === '2' || label.includes('kantooruren')) {
        if (hoursCell > 0) summaryKantoorUren = hoursCell;
        if (salesCell > 0) summaryTotalVerkoop += salesCell;
      } else if (typeCode === '3' || typeCode === '4' || typeCode === '5' || label.includes('materialen')) {
        if (salesCell > 0) summaryTotalVerkoop += salesCell;
      }
    }

    // 3. Lees detailregels onder 'Positie;Type;Aantal;Unit / Type;Prijs p/st;Subtotaal...'
    let begroteWerkplaatsUren = 0;
    let begroteKantoorUren = 0;
    let arbeidBegrootKostprijs = 0;
    let arbeidVerkoop = 0;
    let begrootMateriaal = 0;
    let materiaalVerkoop = 0;
    let bottomTotalVerkoop = 0;
    let lineCount = 0;

    if (detailHeaderIdx !== -1) {
      const headerNorm = rows[detailHeaderIdx].map(normalizeHeaderToken);
      const typeIdx = findColumnIndexExactFirst(headerNorm, ['type'], ['type'], 2);
      const aantalIdx = findColumnIndexExactFirst(headerNorm, ['aantal'], ['aantal'], 3);
      const unitIdx = findColumnIndexExactFirst(headerNorm, ['unittype', 'omschrijving', 'unit'], ['unit', 'omschrijving'], 4);
      const prijsStukIdx = findColumnIndexExactFirst(headerNorm, ['prijspst', 'verkoopprijs'], ['prijspst'], 5);
      const subtotaalIdx = findColumnIndexExactFirst(headerNorm, ['subtotaal'], ['subtotaal'], 6);
      const kostprijsLijnIdx = findColumnIndexExactFirst(headerNorm, ['kostprijslijn'], ['kostprijslijn'], 16);
      const kostprijsIdx = findColumnIndexExactFirst(headerNorm, ['kostprijs'], [], 14);

      for (let r = detailHeaderIdx + 1; r < rows.length; r++) {
        const cols = rows[r];
        const rawType = String(cols[typeIdx] || '').trim();
        const rawAantal = String(cols[aantalIdx] || '').trim();
        const rawUnit = String(cols[unitIdx] || '').trim();
        const rowSubtotaal = subtotaalIdx >= 0 ? parseCleanNumber(cols[subtotaalIdx], delimiter) : 0;

        // Totaalregel onderaan (bijv. regel 61: ;;;;;;€ 5.827;;...)
        if (!rawType && !rawAantal && !rawUnit && rowSubtotaal > 0) {
          bottomTotalVerkoop = rowSubtotaal;
          continue;
        }

        const typeNum = parseInt(rawType, 10);
        if (isNaN(typeNum) || typeNum < 1 || typeNum > 5) continue;

        const aantal = parseCleanNumber(rawAantal, delimiter);
        const prijsStuk = prijsStukIdx >= 0 ? parseCleanNumber(cols[prijsStukIdx], delimiter) : 0;
        const unitKost = kostprijsIdx >= 0 ? parseCleanNumber(cols[kostprijsIdx], delimiter) : 0;
        const rawKostLijn = kostprijsLijnIdx >= 0 ? String(cols[kostprijsLijnIdx] || '').trim() : '';
        const kostLijn = rawKostLijn && !rawKostLijn.startsWith('#')
          ? parseCleanNumber(rawKostLijn, delimiter)
          : (aantal || 1) * unitKost;
        const lineVerkoop = rowSubtotaal > 0 ? rowSubtotaal : (aantal || 1) * prijsStuk;

        if (aantal === 0 && kostLijn === 0 && lineVerkoop === 0 && !rawUnit) continue;

        lineCount++;
        if (typeNum === 1) {
          begroteWerkplaatsUren += aantal;
          arbeidBegrootKostprijs += kostLijn;
          arbeidVerkoop += lineVerkoop;
        } else if (typeNum === 2) {
          begroteKantoorUren += aantal;
          arbeidBegrootKostprijs += kostLijn;
          arbeidVerkoop += lineVerkoop;
        } else {
          begrootMateriaal += kostLijn;
          materiaalVerkoop += lineVerkoop;
        }
      }
    }

    if (begroteWerkplaatsUren === 0 && summaryWerkplaatsUren > 0) {
      begroteWerkplaatsUren = summaryWerkplaatsUren;
    }
    if (begroteKantoorUren === 0 && summaryKantoorUren > 0) {
      begroteKantoorUren = summaryKantoorUren;
    }

    const begroteUren = Math.round((begroteWerkplaatsUren + begroteKantoorUren) * 100) / 100;
    const finalMateriaal = Math.round(begrootMateriaal * 100) / 100;
    const computedRate = (begroteUren > 0 && arbeidBegrootKostprijs > 0)
      ? Math.round((arbeidBegrootKostprijs / begroteUren) * 100) / 100
      : defaultRate;

    let verkoopprijs = bottomTotalVerkoop;
    if (verkoopprijs <= 0 && summaryTotalVerkoop > 0) verkoopprijs = summaryTotalVerkoop;
    if (verkoopprijs <= 0) verkoopprijs = Math.round((arbeidVerkoop + materiaalVerkoop) * 100) / 100;

    return {
      format: 'basic_calculation',
      detectedProjectNumber,
      detectedClient,
      detectedName,
      begroteUren,
      begroteWerkplaatsUren: Math.round(begroteWerkplaatsUren * 100) / 100,
      begroteKantoorUren: Math.round(begroteKantoorUren * 100) / 100,
      begrootMateriaal: finalMateriaal,
      arbeidBegrootKostprijs: Math.round(arbeidBegrootKostprijs * 100) / 100,
      tarief: computedRate,
      verkoopprijs: Math.round(verkoopprijs * 100) / 100,
      lineCount
    };
  }

  function analyzeCsvImport(text, defaultRate = DEFAULT_GLOBAL_RATE, options = {}) {
    const cleanedText = stripUtf8Bom(text);
    const lines = String(cleanedText || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      throw new Error('Het bestand of tekstveld bevat geen geldige header én datarijen.');
    }

    const delimiter = detectCsvDelimiter(lines);
    const rows = lines.map(line => splitCsvRow(line, delimiter));

    // Check 1: ISP Urenregistratie CSV (bijv. regel 8: Projectnummer;Datum;uren;overuren;weeknummer)
    const maxHeaderScan = Math.min(rows.length, 30);
    for (let r = 0; r < maxHeaderScan; r++) {
      const norm = rows[r].map(normalizeHeaderToken);
      const hasProjNum = norm.some(h => h === 'projectnummer' || h === 'projectnr' || h === 'projectid');
      const hasHours = norm.some(h => h === 'uren' || h === 'hours' || h === 'aantaluren');
      const hasProjectMeta = norm.some(h => h === 'klant' || h === 'projectnaam' || h === 'begroteuren');
      if (hasProjNum && hasHours && !hasProjectMeta) {
        return parseHoursRegistrationCsv(rows, delimiter, r, options.existingProjects || AppState.projects);
      }
    }

    // Check 2: Basic calculation ISP CSV (Positie;Type;Aantal;Unit / Type;Prijs p/st;Subtotaal / Werkplaatsuren / Margeberekening)
    let detailHeaderIdx = -1;
    let hasCalcMarkers = false;
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const norm = rows[r].map(normalizeHeaderToken);
      if (norm.includes('type') && norm.includes('aantal') && (norm.includes('subtotaal') || norm.includes('prijspst') || norm.includes('kostprijs'))) {
        detailHeaderIdx = r;
        break;
      }
      if (norm.includes('werkplaatsuren') || norm.includes('margeberekening') || norm.includes('gewenstemarge')) {
        hasCalcMarkers = true;
      }
    }
    if (detailHeaderIdx !== -1 || hasCalcMarkers) {
      return parseBasicCalculationCsv(rows, delimiter, detailHeaderIdx, defaultRate, options.fileName || '');
    }

    // Check 3: Standaard ISP projecttabel CSV (Projectnummer;Klant;Projectnaam;...)
    let tableHeaderIdx = 0;
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const norm = rows[r].map(normalizeHeaderToken);
      if (norm.some(h => h === 'projectnummer' || h === 'projectid' || h === 'klant' || h === 'begroteuren')) {
        tableHeaderIdx = r;
        break;
      }
    }

    const rawHeaders = rows[tableHeaderIdx].map(normalizeHeaderToken);
    const colMap = {
      projectnummer: findColumnIndexExactFirst(rawHeaders, ['projectnummer', 'projectid'], ['projectnummer', 'projectid', 'nummer', 'code'], 0),
      klant: findColumnIndexExactFirst(rawHeaders, ['klant', 'klantnaam', 'opdrachtgever'], ['klant', 'opdrachtgever', 'client'], 1),
      projectnaam: findColumnIndexExactFirst(rawHeaders, ['projectnaam', 'omschrijving', 'omschrijvingproject'], ['projectnaam', 'omschrijving', 'naam'], 2),
      status: findColumnIndexExactFirst(rawHeaders, ['status', 'projectfase', 'fase'], ['status', 'fase'], 3),
      begroteUren: findColumnIndexExactFirst(rawHeaders, ['begroteuren', 'voorcalculatieuren'], ['begroteuren', 'voorcalculatieuren', 'geplandeuren'], 4),
      werkelijkeUren: findColumnIndexExactFirst(rawHeaders, ['werkelijkeuren', 'gemaakteuren'], ['werkelijkeuren', 'gemaakteuren', 'urenwerkelijk'], 5),
      begrootMateriaal: findColumnIndexExactFirst(rawHeaders, ['begrootmateriaal', 'materiaalbegroot'], ['begrootmateriaal', 'materiaalbegroot', 'inkoopbegroot'], 6),
      werkelijkMateriaal: findColumnIndexExactFirst(rawHeaders, ['werkelijkmateriaal', 'materiaalwerkelijk'], ['werkelijkmateriaal', 'materiaalwerkelijk', 'inkoopwerkelijk'], 7),
      tarief: findColumnIndexExactFirst(rawHeaders, ['tarief', 'uurtarief'], ['tarief', 'uurtarief', 'rate'], 8),
      bestelstatus: findColumnIndexExactFirst(rawHeaders, ['bestelstatus', 'leverancier'], ['bestelstatus', 'leverancier', 'levertijd'], 9),
      verkoopprijs: findColumnIndexExactFirst(rawHeaders, ['verkoopprijs', 'offerteprijs'], ['verkoopprijs', 'offerteprijs', 'verkoop'], -1)
    };

    const importedProjects = [];
    for (let i = tableHeaderIdx + 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length < 2) continue;

      const pNum = stripUtf8Bom(cols[colMap.projectnummer] || '').trim() || String(ISP_START_PROJECT_NUMBER + (AppState.projects?.length || 0) + i);
      const pClient = cols[colMap.klant] || 'Onbekende Klant';
      const pName = cols[colMap.projectnaam] || `Omschrijving project ${i}`;
      const pStatusRaw = cols[colMap.status] || 'Lopend';
      const pBegroteUren = parseCleanNumber(cols[colMap.begroteUren], delimiter);
      const pWerkelijkeUren = parseCleanNumber(cols[colMap.werkelijkeUren], delimiter);
      const pBegrootMat = parseCleanNumber(cols[colMap.begrootMateriaal], delimiter);
      const pWerkelijkMat = parseCleanNumber(cols[colMap.werkelijkMateriaal], delimiter);
      const pTarief = parseCleanNumber(cols[colMap.tarief], delimiter) || defaultRate;
      const pBestel = cols[colMap.bestelstatus] || 'Op schema';
      const pVerkoop = colMap.verkoopprijs >= 0 ? parseCleanNumber(cols[colMap.verkoopprijs], delimiter) : undefined;

      importedProjects.push(
        normalizeProjectObject({
          projectnummer: pNum,
          klant: pClient,
          projectnaam: pName,
          status: pStatusRaw,
          begroteUren: pBegroteUren,
          werkelijkeUren: pWerkelijkeUren,
          begrootMateriaal: pBegrootMat,
          werkelijkMateriaal: pWerkelijkMat,
          tarief: pTarief,
          verkoopprijs: pVerkoop,
          bestelstatus: pBestel
        }, defaultRate, i)
      );
    }

    if (importedProjects.length === 0) {
      throw new Error('Geen geldige projectrijen gevonden om te importeren.');
    }

    return {
      format: 'project_table',
      projects: importedProjects
    };
  }

  function parseFlexibleCsv(text, defaultRate) {
    const analysis = analyzeCsvImport(text, defaultRate);
    if (analysis.format === 'project_table') {
      return analysis.projects;
    }
    if (analysis.format === 'basic_calculation') {
      return [
        normalizeProjectObject({
          projectnummer: analysis.detectedProjectNumber || getNextIspProjectNumber(AppState.projects),
          klant: analysis.detectedClient || 'Nieuwe Klant',
          projectnaam: analysis.detectedName || 'Voorcalculatie import',
          begroteUren: analysis.begroteUren,
          begrootMateriaal: analysis.begrootMateriaal,
          tarief: analysis.tarief,
          verkoopprijs: analysis.verkoopprijs
        }, defaultRate)
      ];
    }
    return analysis.entries.map(entry =>
      normalizeProjectObject({
        projectnummer: entry.projectnummer,
        klant: 'ISP Klant',
        projectnaam: 'Project uit urenregistratie',
        werkelijkeUren: entry.totalUren,
        werkelijkeWerkplaatsUren: entry.werkplaatsUren,
        werkelijkeKantoorUren: entry.kantoorUren,
        werkelijkeOveruren: entry.overuren
      }, defaultRate)
    );
  }

  function applyCsvImport(analysis, options = {}) {
    const targetProjectNumber = String(options.targetProjectNumber || '').trim();
    const replaceAll = Boolean(options.replaceAll);
    const defaultRate = AppState.globalHourlyRate;

    if (analysis.format === 'basic_calculation') {
      const targetNum = analysis.detectedProjectNumber || targetProjectNumber;
      if (!targetNum) {
        throw new Error('Geen vast projectnummer in het bestand gevonden. Vul een projectnummer in (bijv. 200360) of zet "Projectnummer;200360" in het CSV-bestand.');
      }

      const existingIdx = AppState.projects.findIndex(
        p => p.projectnummer.toLowerCase() === targetNum.toLowerCase()
      );

      let savedProject;
      let modeLabel;
      if (existingIdx !== -1) {
        const existing = AppState.projects[existingIdx];
        savedProject = normalizeProjectObject({
          ...existing,
          klant: analysis.detectedClient || existing.klant,
          projectnaam: analysis.detectedName || existing.projectnaam,
          begroteUren: analysis.begroteUren,
          begroteWerkplaatsUren: analysis.begroteWerkplaatsUren,
          begroteKantoorUren: analysis.begroteKantoorUren,
          begrootMateriaal: analysis.begrootMateriaal,
          tarief: analysis.tarief,
          verkoopprijs: analysis.verkoopprijs,
          calculatieLaatstGeimporteerd: new Date().toISOString()
        }, defaultRate);
        AppState.projects[existingIdx] = savedProject;
        modeLabel = 'bijgewerkt';
      } else {
        savedProject = normalizeProjectObject({
          projectnummer: targetNum,
          klant: analysis.detectedClient || 'Nieuwe Klant',
          projectnaam: analysis.detectedName || 'Project uit voorcalculatie',
          status: 'Lopend',
          begroteUren: analysis.begroteUren,
          begroteWerkplaatsUren: analysis.begroteWerkplaatsUren,
          begroteKantoorUren: analysis.begroteKantoorUren,
          werkelijkeUren: 0,
          begrootMateriaal: analysis.begrootMateriaal,
          werkelijkMateriaal: 0,
          tarief: analysis.tarief,
          verkoopprijs: analysis.verkoopprijs,
          bestelstatus: 'Op schema - Geïmporteerd uit calculatie',
          calculatieLaatstGeimporteerd: new Date().toISOString()
        }, defaultRate);
        AppState.projects.unshift(savedProject);
        modeLabel = 'aangemaakt';
      }

      AppState.selectedProjectId = savedProject.projectnummer;
      AppState.trackRecentProject(savedProject.projectnummer);
      AppState.saveProjects();

      return {
        format: 'basic_calculation',
        selectedProjectId: savedProject.projectnummer,
        updatedCount: existingIdx !== -1 ? 1 : 0,
        createdCount: existingIdx === -1 ? 1 : 0,
        message: `Voorcalculatie gekoppeld aan project ${savedProject.projectnummer} (${modeLabel}): ${formatNumber(savedProject.begroteUren)} begrote uren, ${formatEuro(savedProject.begrootMateriaal)} begroot materiaal, verkoopprijs ${formatEuro(savedProject.verkoopprijs)}.`
      };
    }

    if (analysis.format === 'urenregistratie') {
      const existingByKey = new Map();
      AppState.projects.forEach(p => {
        existingByKey.set(String(p.projectnummer).toLowerCase(), p);
      });

      let updatedCount = 0;
      let createdCount = 0;
      const mergedProjects = [];
      const seenKeys = new Set();

      analysis.entries.forEach((entry, idx) => {
        const key = entry.projectnummer.toLowerCase();
        seenKeys.add(key);
        const existing = existingByKey.get(key);

        if (existing) {
          updatedCount++;
          mergedProjects.push(
            normalizeProjectObject({
              ...existing,
              werkelijkeUren: entry.totalUren,
              werkelijkeWerkplaatsUren: entry.werkplaatsUren,
              werkelijkeKantoorUren: entry.kantoorUren,
              werkelijkeOveruren: entry.overuren,
              urenLaatstGeimporteerd: new Date().toISOString()
            }, defaultRate, idx)
          );
        } else {
          createdCount++;
          mergedProjects.push(
            normalizeProjectObject({
              projectnummer: entry.projectnummer,
              klant: 'ISP Klant',
              projectnaam: 'Project uit urenregistratie',
              status: 'Lopend',
              begroteUren: 0,
              werkelijkeUren: entry.totalUren,
              werkelijkeWerkplaatsUren: entry.werkplaatsUren,
              werkelijkeKantoorUren: entry.kantoorUren,
              werkelijkeOveruren: entry.overuren,
              begrootMateriaal: 0,
              werkelijkMateriaal: 0,
              tarief: defaultRate,
              verkoopprijs: 0,
              bestelstatus: 'Op schema - Uren geïmporteerd',
              urenLaatstGeimporteerd: new Date().toISOString()
            }, defaultRate, idx)
          );
        }
      });

      if (replaceAll) {
        AppState.projects = mergedProjects.sort(
          (a, b) => extractProjectNumberInt(b.projectnummer) - extractProjectNumberInt(a.projectnummer)
        );
      } else {
        const updatedMap = new Map(mergedProjects.map(p => [p.projectnummer.toLowerCase(), p]));
        const nextList = AppState.projects.map(p => updatedMap.get(p.projectnummer.toLowerCase()) || p);
        mergedProjects.forEach(p => {
          if (!existingByKey.has(p.projectnummer.toLowerCase())) {
            nextList.unshift(p);
          }
        });
        AppState.projects = nextList;
      }

      // Behoud het gekozen of actieve projectnummer als dat in de import zit
      let nextSelected = AppState.projects[0]?.projectnummer;
      if (targetProjectNumber && seenKeys.has(targetProjectNumber.toLowerCase())) {
        const found = AppState.projects.find(p => p.projectnummer.toLowerCase() === targetProjectNumber.toLowerCase());
        if (found) nextSelected = found.projectnummer;
      } else if (AppState.selectedProjectId && seenKeys.has(String(AppState.selectedProjectId).toLowerCase())) {
        const found = AppState.projects.find(p => p.projectnummer.toLowerCase() === String(AppState.selectedProjectId).toLowerCase());
        if (found) nextSelected = found.projectnummer;
      }

      AppState.selectedProjectId = nextSelected;
      if (nextSelected) AppState.trackRecentProject(nextSelected);
      AppState.saveProjects();

      const skippedText = analysis.skippedInternalRows > 0
        ? ` (${analysis.skippedInternalRows} interne uurregels 100-199 overgeslagen)`
        : '';

      return {
        format: 'urenregistratie',
        selectedProjectId: nextSelected,
        updatedCount,
        createdCount,
        message: `Urenregistratie verwerkt: ${updatedCount} bestaande projecten bijgewerkt en ${createdCount} nieuwe projecten toegevoegd (${formatNumber(analysis.totalHours)} uur totaal)${skippedText}.`
      };
    }

    // Standaard project_table format
    const imported = analysis.projects;
    if (replaceAll) {
      AppState.projects = imported;
    } else {
      imported.forEach(imp => {
        const existingIdx = AppState.projects.findIndex(
          p => p.projectnummer.toLowerCase() === imp.projectnummer.toLowerCase()
        );
        if (existingIdx !== -1) {
          AppState.projects[existingIdx] = imp;
        } else {
          AppState.projects.unshift(imp);
        }
      });
    }

    const focusNum = (targetProjectNumber && AppState.projects.find(p => p.projectnummer.toLowerCase() === targetProjectNumber.toLowerCase())?.projectnummer)
      || imported[0].projectnummer;
    AppState.selectedProjectId = focusNum;
    AppState.trackRecentProject(focusNum);
    AppState.saveProjects();

    return {
      format: 'project_table',
      selectedProjectId: focusNum,
      updatedCount: imported.length,
      createdCount: 0,
      message: `Succesvol ${imported.length} project(en) geïmporteerd!`
    };
  }

  function exportCalculatedCsv() {
    const headers = [
      'ISP_Projectbenaming',
      'Projectnummer',
      'Klant',
      'Omschrijving_Project',
      'Status',
      'Statusbadge',
      'Verkoopprijs',
      'BegroteUren',
      'WerkelijkeUren',
      'VerschilUren',
      'Tarief',
      'ArbeidBegroot',
      'ArbeidWerkelijk',
      'BegrootMateriaal',
      'WerkelijkMateriaal',
      'TotaalBegrootBudget',
      'TotaleWerkelijkeKosten',
      'VerschilBudgetEuro',
      'GerealiseerdeMargeEuro',
      'AfwijkingsPercentage',
      'Bestelstatus',
      'LeveranciersVertraging'
    ];

    const escapeCsvCell = val => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = AppState.projects.map(p => {
      const m = calculateProjectMetrics(p);
      const clientName = AppState.clientViewActive ? 'Vertrouwelijk' : p.klant;
      const fullTitle = formatIspProjectTitle(p, AppState.clientViewActive);
      return [
        fullTitle,
        p.projectnummer,
        clientName,
        p.projectnaam,
        p.status,
        `${m.statusLevel} - ${m.statusLabel}`,
        m.verkoopprijs.toFixed(2),
        m.begroteUren,
        m.werkelijkeUren,
        m.verschilUren,
        m.uurtarief.toFixed(2),
        m.arbeidBegroot.toFixed(2),
        m.arbeidWerkelijk.toFixed(2),
        m.begrootMateriaal.toFixed(2),
        m.werkelijkMateriaal.toFixed(2),
        m.totaalBegrootBudget.toFixed(2),
        m.totaleWerkelijkeKosten.toFixed(2),
        m.verschilBudget.toFixed(2),
        m.gerealiseerdeMargeEuro.toFixed(2),
        m.afwijkingBudgetPct.toFixed(2) + '%',
        p.bestelstatus,
        m.heeftVertraging ? 'JA' : 'NEE'
      ].map(escapeCsvCell).join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `ISP_Barendrecht_Nacalculatie_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV-bestand (incl. verkoopprijs) gedownload voor Excel!');
  }

  function downloadSampleTemplateCsv() {
    const next1 = getNextIspProjectNumber(AppState.projects);
    const next2 = String(parseInt(next1, 10) + 1);
    const sample = [
      'Projectnummer;Klant;Projectnaam;Status;BegroteUren;WerkelijkeUren;BegrootMateriaal;WerkelijkMateriaal;Tarief;Verkoopprijs;Bestelstatus',
      `${next1};Maasvlakte Terminals;RVS Schakelkast & PLC Ombouw;Lopend;140;128;12500;11900;65;32314;Op schema - Siemens PLC geleverd`,
      `${next2};Offshore Heavy Lift;Lierenframe Revisie & NDT Inspectie;Lopend;220;238;19000;19400;65;49817;Kritieke vertraging onderdeel: SKF Hoofdlager (+5 werkdagen)`
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ISP_Barendrecht_Import_Sjabloon_${next1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ===================================================================
   * 8. CENTRALE UI RENDERING & ROUTER
   * =================================================================== */
  function renderAll(populateFormInputs = true) {
    renderHeaderControls();
    renderClientViewVisibility();

    if (window.ProjectZoekenModule) {
      window.ProjectZoekenModule.render();
    }
    if (window.ProjectDashboardModule) {
      window.ProjectDashboardModule.render(populateFormInputs);
    }
    if (window.OchtendoverlegModule) {
      window.OchtendoverlegModule.render();
    }
  }

  function renderHeaderControls() {
    const rateEl = document.getElementById('globalRateDisplay');
    if (rateEl) rateEl.textContent = formatEuro(AppState.globalHourlyRate);

    const mobRateEl = document.getElementById('mobileGlobalRateDisplay');
    if (mobRateEl) mobRateEl.textContent = formatEuro(AppState.globalHourlyRate);

    const currentProj = AppState.getCurrentProject();
    const navBadge = document.getElementById('navCurrentProjectBadge');
    if (navBadge && currentProj) {
      navBadge.textContent = currentProj.projectnummer;
    }

    const mobDrawerBadge = document.getElementById('mobDrawerProjectBadge');
    if (mobDrawerBadge && currentProj) {
      mobDrawerBadge.textContent = currentProj.projectnummer;
    }

    const mobHeaderProjNum = document.getElementById('mobileHeaderProjectNum');
    if (mobHeaderProjNum && currentProj) {
      mobHeaderProjNum.textContent = currentProj.projectnummer;
    }

    const nextNewNum = getNextIspProjectNumber(AppState.projects);
    const addBtn = document.getElementById('addNewProjectBtn');
    if (addBtn) addBtn.textContent = `+ Nieuw Project (${nextNewNum})`;

    const mobAddBtn = document.getElementById('mobileAddNewProjectBtn');
    if (mobAddBtn) {
      const mobAddSpan = mobAddBtn.querySelector('span');
      if (mobAddSpan) mobAddSpan.textContent = `Nieuw (${nextNewNum})`;
    }

    const hasKey = Boolean(AppState.geminiApiKey && AppState.geminiApiKey.trim().length > 5);
    const apiDot = document.getElementById('apiStatusDot');
    const mobApiDot = document.getElementById('mobileApiStatusDot');
    const aiModeBadge = document.getElementById('aiModeBadge');

    if (hasKey) {
      if (apiDot) {
        apiDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
        apiDot.title = 'Live Gemini API-sleutel geconfigureerd';
      }
      if (mobApiDot) {
        mobApiDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
        mobApiDot.title = 'Live Gemini API-sleutel geconfigureerd';
      }
      if (aiModeBadge) {
        aiModeBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30';
        aiModeBadge.textContent = 'Live Gemini REST API Actief (gemini-1.5-flash)';
      }
    } else {
      if (apiDot) {
        apiDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
        apiDot.title = 'Demo-modus actief (geen API-sleutel)';
      }
      if (mobApiDot) {
        mobApiDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
        mobApiDot.title = 'Demo-modus actief (geen API-sleutel)';
      }
      if (aiModeBadge) {
        aiModeBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-blue-100 border border-white/30';
        aiModeBadge.textContent = 'Demo-modus (Voeg API-sleutel toe in Instellingen voor live Gemini LLM)';
      }
    }

    // Vul zowel de desktop als de mobiele selector synchroon
    const selectors = [
      document.getElementById('projectSelector'),
      document.getElementById('mobileProjectSelector')
    ].filter(Boolean);

    if (selectors.length > 0) {
      const activeProjects = AppState.projects.filter(p => p.status === 'Lopend');
      const recentArchive = AppState.projects.filter(p => p.status === 'Afgerond').slice(0, 45);

      const createOption = p => {
        const m = calculateProjectMetrics(p);
        const opt = document.createElement('option');
        opt.value = p.projectnummer;
        opt.textContent = `[${m.statusLevel}] ${formatIspProjectTitle(p, AppState.clientViewActive)}`;
        if (p.projectnummer === AppState.selectedProjectId) {
          opt.selected = true;
        }
        return opt;
      };

      selectors.forEach(sel => {
        sel.innerHTML = '';
        const selectedInLists = activeProjects.some(p => p.projectnummer === AppState.selectedProjectId) ||
          recentArchive.some(p => p.projectnummer === AppState.selectedProjectId);

        if (!selectedInLists && currentProj) {
          const selectedGroup = document.createElement('optgroup');
          selectedGroup.label = 'Huidig Geselecteerd Project';
          selectedGroup.appendChild(createOption(currentProj));
          sel.appendChild(selectedGroup);
        }

        const activeGroup = document.createElement('optgroup');
        activeGroup.label = `Actuele Lopende Projecten (${activeProjects.length})`;
        activeProjects.forEach(p => activeGroup.appendChild(createOption(p)));
        sel.appendChild(activeGroup);

        const archiveGroup = document.createElement('optgroup');
        archiveGroup.label = 'Recent Afgeronde Projecten (Gebruik zoekbalk voor oudere nrs)';
        recentArchive.forEach(p => archiveGroup.appendChild(createOption(p)));
        sel.appendChild(archiveGroup);
      });
    }

    const activeAlertProjects = AppState.projects.filter(
      p => p.status === 'Lopend' && calculateProjectMetrics(p).needsMorningAttention
    );
    const morningBadge = document.getElementById('morningAlertCountBadge');
    const mobDrawerMorningBadge = document.getElementById('mobDrawerMorningBadge');
    const launcherMorningBadge = document.getElementById('launcherMorningBadge');
    const mobMenuAlertDot = document.getElementById('mobileMenuAlertDot');

    const alertCountStr = String(activeAlertProjects.length);
    const alertBadgeClass = activeAlertProjects.length > 0
      ? 'px-2 py-0.5 text-xs font-mono-num font-extrabold rounded-full bg-rose-600 text-white'
      : 'px-2 py-0.5 text-xs font-mono-num font-extrabold rounded-full bg-emerald-600 text-white';

    if (morningBadge) {
      morningBadge.textContent = alertCountStr;
      morningBadge.className = alertBadgeClass;
    }

    if (mobDrawerMorningBadge) {
      mobDrawerMorningBadge.textContent = alertCountStr;
      mobDrawerMorningBadge.className = alertBadgeClass;
    }

    if (mobMenuAlertDot) {
      mobMenuAlertDot.classList.toggle('hidden', activeAlertProjects.length === 0);
    }

    if (launcherMorningBadge) {
      launcherMorningBadge.textContent = `${activeAlertProjects.length} Knelpunt${activeAlertProjects.length === 1 ? '' : 'en'}`;
    }
  }

  function renderClientViewVisibility() {
    const isClient = AppState.clientViewActive;
    const clientToggle = document.getElementById('clientViewToggle');
    if (clientToggle) clientToggle.checked = isClient;

    const mobClientToggle = document.getElementById('mobileClientViewToggle');
    if (mobClientToggle) mobClientToggle.checked = isClient;

    const banner = document.getElementById('clientViewBanner');
    if (banner) banner.classList.toggle('hidden', !isClient);

    document.querySelectorAll('.internal-cost-field').forEach(el => {
      el.classList.toggle('hidden', isClient);
    });

    const kpiBudgetInternal = document.getElementById('kpiBudgetInternalContent');
    const kpiBudgetClient = document.getElementById('kpiBudgetClientContent');
    if (kpiBudgetInternal && kpiBudgetClient) {
      kpiBudgetInternal.classList.toggle('hidden', isClient);
      kpiBudgetClient.classList.toggle('hidden', !isClient);
    }

    const kpiMatInternal = document.getElementById('kpiMaterialInternalContent');
    const kpiMatClient = document.getElementById('kpiMaterialClientContent');
    if (kpiMatInternal && kpiMatClient) {
      kpiMatInternal.classList.toggle('hidden', isClient);
      kpiMatClient.classList.toggle('hidden', !isClient);
    }
  }

  function switchTab(tabName) {
    AppState.activeTab = tabName;

    const viewHome = document.getElementById('viewHomeLauncher');
    const viewDash = document.getElementById('viewProjectDashboard');
    const viewMorn = document.getElementById('viewMorningMeeting');

    const targetMap = {
      home: { el: viewHome, url: 'index.html' },
      dashboard: { el: viewDash, url: 'dashboard.html' },
      morning: { el: viewMorn, url: 'ochtendoverleg.html' }
    };

    if (targetMap[tabName] && !targetMap[tabName].el) {
      AppState.saveProjects();
      AppState.saveUiPreferences();
      window.location.href = targetMap[tabName].url;
      return;
    }

    if (viewHome) viewHome.classList.toggle('hidden', tabName !== 'home');
    if (viewDash) viewDash.classList.toggle('hidden', tabName !== 'dashboard');
    if (viewMorn) viewMorn.classList.toggle('hidden', tabName !== 'morning');

    // Desktop tabs
    const tabHome = document.getElementById('tabHomeBtn');
    const tabDash = document.getElementById('tabDashboardBtn');
    const tabMorn = document.getElementById('tabMorningBtn');

    [
      { el: tabHome, active: tabName === 'home' },
      { el: tabDash, active: tabName === 'dashboard' },
      { el: tabMorn, active: tabName === 'morning' }
    ].forEach(({ el, active }) => {
      if (!el) return;
      el.classList.toggle('active', active);
      if (active) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    // Mobiele drawer tabs
    const mobHome = document.getElementById('mobDrawerHomeBtn');
    const mobDash = document.getElementById('mobDrawerDashboardBtn');
    const mobMorn = document.getElementById('mobDrawerMorningBtn');

    [
      { el: mobHome, active: tabName === 'home' },
      { el: mobDash, active: tabName === 'dashboard' },
      { el: mobMorn, active: tabName === 'morning' }
    ].forEach(({ el, active }) => {
      if (!el) return;
      el.classList.toggle('active', active);
    });

    // Sluit de mobiele drawer automatisch na navigeren
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const mobileMenuToggleBtn = document.getElementById('mobileMenuToggleBtn');
    if (mobileNavDrawer && !mobileNavDrawer.classList.contains('hidden')) {
      mobileNavDrawer.classList.add('hidden');
      if (mobileMenuToggleBtn) {
        mobileMenuToggleBtn.setAttribute('aria-expanded', 'false');
        document.getElementById('mobileMenuIconClosed')?.classList.remove('hidden');
        document.getElementById('mobileMenuIconOpen')?.classList.add('hidden');
        const btnText = document.getElementById('mobileMenuBtnText');
        if (btnText) btnText.textContent = 'Menu';
      }
    }

    if (tabName === 'dashboard') {
      const project = AppState.getCurrentProject();
      if (project && window.ProjectDashboardModule) {
        window.ProjectDashboardModule.updateCharts(project, calculateProjectMetrics(project), AppState.clientViewActive);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncCurrentFormToProjectAndRender(populateInputs = false, allowIdChange = true) {
    const proj = AppState.getCurrentProject();
    if (!proj) return false;

    const idInput = document.getElementById('inputProjectId');
    const nameInput = document.getElementById('inputProjectName');
    const clientInput = document.getElementById('inputClientName');
    const plHoursInput = document.getElementById('inputPlannedHours');
    const actHoursInput = document.getElementById('inputActualHours');
    const rateInput = document.getElementById('inputHourlyRate');
    const plMatInput = document.getElementById('inputPlannedMaterial');
    const actMatInput = document.getElementById('inputActualMaterial');
    const salesPriceInput = document.getElementById('inputSalesPrice');
    const supInput = document.getElementById('inputSupplierStatus');
    const supDelayInput = document.getElementById('inputSupplierDelayFlag');

    const oldId = proj.projectnummer;
    let newId = oldId;
    if (allowIdChange && idInput) {
      const candidateId = idInput.value.trim();
      if (candidateId && candidateId !== oldId) {
        const duplicate = AppState.projects.some(
          p => p !== proj && p.projectnummer.toLowerCase() === candidateId.toLowerCase()
        );
        if (duplicate) {
          showToast(`Projectnummer ${candidateId} bestaat al! Kies een uniek nummer.`);
          idInput.value = oldId;
          return false;
        }
        newId = candidateId;
      }
    }

    proj.projectnummer = newId;
    if (nameInput && nameInput.value.trim()) proj.projectnaam = nameInput.value.trim();
    if (clientInput && clientInput.value.trim()) proj.klant = clientInput.value.trim();
    proj.begroteUren = Math.max(0, parseNumericInput(plHoursInput?.value, proj.begroteUren));
    proj.werkelijkeUren = Math.max(0, parseNumericInput(actHoursInput?.value, proj.werkelijkeUren));
    proj.tarief = Math.max(0, parseNumericInput(rateInput?.value, AppState.globalHourlyRate));
    proj.begrootMateriaal = Math.max(0, parseNumericInput(plMatInput?.value, proj.begrootMateriaal));
    proj.werkelijkMateriaal = Math.max(0, parseNumericInput(actMatInput?.value, proj.werkelijkMateriaal));
    if (salesPriceInput) {
      proj.verkoopprijs = Math.max(0, parseNumericInput(salesPriceInput.value, proj.verkoopprijs || 0));
    }
    proj.bestelstatus = supInput?.value.trim() || 'Op schema';
    proj.heeftVertraging = supDelayInput ? Boolean(supDelayInput.checked) : Boolean(proj.heeftVertraging);

    if (oldId !== newId) {
      AppState.recentProjectIds = AppState.recentProjectIds.map(id => (id === oldId ? newId : id));
    }

    AppState.selectedProjectId = newId;
    const saved = AppState.saveProjects();
    renderAll(populateInputs);
    return saved;
  }

  /* ===================================================================
   * 9. GLOBALE EVENT LISTENERS & INITIALISATIE
   * =================================================================== */
  function setupGlobalEventListeners() {
    // Desktop Navigatiebalk tabs
    document.getElementById('brandHomeBtn')?.addEventListener('click', () => switchTab('home'));
    document.getElementById('tabHomeBtn')?.addEventListener('click', () => switchTab('home'));
    document.getElementById('tabDashboardBtn')?.addEventListener('click', () => switchTab('dashboard'));
    document.getElementById('tabMorningBtn')?.addEventListener('click', () => switchTab('morning'));

    // Mobiele Drawer Navigatietabs
    document.getElementById('mobDrawerHomeBtn')?.addEventListener('click', () => switchTab('home'));
    document.getElementById('mobDrawerDashboardBtn')?.addEventListener('click', () => switchTab('dashboard'));
    document.getElementById('mobDrawerMorningBtn')?.addEventListener('click', () => switchTab('morning'));

    // Snelle header projectknop op mobiel/tablet
    document.getElementById('mobileCurrentProjectQuickBtn')?.addEventListener('click', () => {
      switchTab('dashboard');
    });

    // In- en uitklapbaar menu toggle knop (Hamburger)
    const mobileMenuToggleBtn = document.getElementById('mobileMenuToggleBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const mobileMenuIconClosed = document.getElementById('mobileMenuIconClosed');
    const mobileMenuIconOpen = document.getElementById('mobileMenuIconOpen');
    const mobileMenuBtnText = document.getElementById('mobileMenuBtnText');

    if (mobileMenuToggleBtn && mobileNavDrawer) {
      mobileMenuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isClosed = mobileNavDrawer.classList.contains('hidden');
        if (isClosed) {
          mobileNavDrawer.classList.remove('hidden');
          mobileMenuToggleBtn.setAttribute('aria-expanded', 'true');
          mobileMenuIconClosed?.classList.add('hidden');
          mobileMenuIconOpen?.classList.remove('hidden');
          if (mobileMenuBtnText) mobileMenuBtnText.textContent = 'Sluiten';
        } else {
          mobileNavDrawer.classList.add('hidden');
          mobileMenuToggleBtn.setAttribute('aria-expanded', 'false');
          mobileMenuIconClosed?.classList.remove('hidden');
          mobileMenuIconOpen?.classList.add('hidden');
          if (mobileMenuBtnText) mobileMenuBtnText.textContent = 'Menu';
        }
      });

      // Sluit mobiel menu bij klik buiten het menu
      document.addEventListener('click', (e) => {
        if (!mobileNavDrawer.classList.contains('hidden') &&
            !mobileNavDrawer.contains(e.target) &&
            !mobileMenuToggleBtn.contains(e.target)) {
          mobileNavDrawer.classList.add('hidden');
          mobileMenuToggleBtn.setAttribute('aria-expanded', 'false');
          mobileMenuIconClosed?.classList.remove('hidden');
          mobileMenuIconOpen?.classList.add('hidden');
          if (mobileMenuBtnText) mobileMenuBtnText.textContent = 'Menu';
        }
      });
    }

    // Dropdown Selectors in Header en Mobiel Menu
    document.getElementById('projectSelector')?.addEventListener('change', e => {
      openProjectStatusScreen(e.target.value);
    });

    document.getElementById('mobileProjectSelector')?.addEventListener('change', e => {
      openProjectStatusScreen(e.target.value);
      switchTab('dashboard');
    });

    // Mobiel Zoekveld
    const mobileSearch = document.getElementById('mobileProjectSearchInput');
    if (mobileSearch) {
      mobileSearch.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const matches = findProjectsBySmartQuery(mobileSearch.value);
          if (matches.length > 0) {
            openProjectStatusScreen(matches[0].projectnummer);
            mobileSearch.value = '';
            switchTab('dashboard');
          } else {
            showToast(`Geen project gevonden voor "${mobileSearch.value}"`);
          }
        }
      });
    }

    // Zoekbalk in de Desktop Header met live suggesties
    const searchInput = document.getElementById('projectSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const suggestionsBox = document.getElementById('searchSuggestions');

    if (searchInput && suggestionsBox) {
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const matches = findProjectsBySmartQuery(searchInput.value);
          if (matches.length > 0) {
            suggestionsBox.classList.add('hidden');
            searchInput.value = '';
            clearSearchBtn?.classList.add('hidden');
            openProjectStatusScreen(matches[0].projectnummer);
          }
        }
      });

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearSearchBtn?.classList.toggle('hidden', query.length === 0);

        if (!query) {
          suggestionsBox.classList.add('hidden');
          return;
        }

        const matches = findProjectsBySmartQuery(query).slice(0, 10);
        suggestionsBox.innerHTML = '';

        if (matches.length === 0) {
          suggestionsBox.innerHTML = '<div class="px-4 py-3 text-xs text-blue-200">Geen matchende ISP-projecten gevonden.</div>';
        } else {
          matches.forEach(p => {
            const m = calculateProjectMetrics(p);
            const badgeColor = m.statusLevel === 'ROOD' ? 'text-rose-400' : (m.statusLevel === 'ORANJE' ? 'text-amber-400' : 'text-emerald-400');
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'w-full text-left px-4 py-2.5 hover:bg-[#12356b] flex items-center justify-between gap-2 text-xs cursor-pointer';
            item.innerHTML = `
              <div>
                <span class="font-mono-num font-extrabold text-white bg-white/15 px-1.5 py-0.5 rounded">${p.projectnummer}</span>
                <span class="text-white font-bold ml-1.5">${formatIspProjectTitle(p, AppState.clientViewActive)}</span>
              </div>
              <span class="font-mono-num font-bold ${badgeColor}">${m.statusLevel}</span>
            `;
            item.addEventListener('click', () => {
              suggestionsBox.classList.add('hidden');
              searchInput.value = '';
              clearSearchBtn?.classList.add('hidden');
              openProjectStatusScreen(p.projectnummer);
            });
            suggestionsBox.appendChild(item);
          });
        }
        suggestionsBox.classList.remove('hidden');
      });

      clearSearchBtn?.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        suggestionsBox.classList.add('hidden');
      });

      document.addEventListener('click', e => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
          suggestionsBox.classList.add('hidden');
        }
      });
    }

    // Nieuw project aanmaken (+1 auto-increment vanaf 200490)
    const handleAddNewProject = () => {
      const nextNum = getNextIspProjectNumber(AppState.projects);
      const newProj = normalizeProjectObject({
        projectnummer: nextNum,
        klant: 'Nieuwe Klant',
        projectnaam: 'Omschrijving machinebouwproject',
        status: 'Lopend',
        begroteUren: 100,
        werkelijkeUren: 0,
        begrootMateriaal: 10000,
        werkelijkMateriaal: 0,
        tarief: AppState.globalHourlyRate,
        bestelstatus: 'Op schema - Voorbereidingsfase',
        heeftVertraging: false
      }, AppState.globalHourlyRate);

      AppState.projects.unshift(newProj);
      AppState.selectedProjectId = newProj.projectnummer;
      AppState.trackRecentProject(newProj.projectnummer);
      AppState.saveProjects();
      renderAll(true);
      switchTab('dashboard');
      showToast(`Nieuw ISP-project aangemaakt: ${formatIspProjectTitle(newProj)}`);
    };

    document.getElementById('addNewProjectBtn')?.addEventListener('click', handleAddNewProject);
    document.getElementById('mobileAddNewProjectBtn')?.addEventListener('click', handleAddNewProject);

    // Reset demodata
    const handleResetDemoData = () => {
      AppState.resetToDemoData();
      renderAll(true);
      showToast('Alle 490 ISP-projecten (200001 t/m 200490) zijn hersteld!');
    };

    document.getElementById('resetDemoDataBtn')?.addEventListener('click', handleResetDemoData);
    document.getElementById('mobileResetDemoDataBtn')?.addEventListener('click', handleResetDemoData);

    // Klantweergave toggle
    const handleClientToggle = e => {
      AppState.clientViewActive = e.target.checked;
      AppState.saveUiPreferences();
      renderAll(true);
      showToast(AppState.clientViewActive ? 'Klantweergave actief (interne marges verborgen)' : 'Interne weergave hersteld');
    };

    document.getElementById('clientViewToggle')?.addEventListener('change', handleClientToggle);
    document.getElementById('mobileClientViewToggle')?.addEventListener('change', handleClientToggle);

    document.getElementById('disableClientViewBtn')?.addEventListener('click', () => {
      AppState.clientViewActive = false;
      AppState.saveUiPreferences();
      renderAll(true);
      showToast('Interne weergave hersteld');
    });

    // Settings Modal
    const settingsModal = document.getElementById('settingsModal');
    const openSettings = () => {
      document.getElementById('geminiApiKeyInput').value = AppState.geminiApiKey;
      document.getElementById('modalGlobalRateInput').value = AppState.globalHourlyRate;
      document.getElementById('applyGlobalRateToAllCheckbox').checked = true;
      settingsModal?.classList.remove('hidden');
    };
    const closeSettings = () => settingsModal?.classList.add('hidden');

    document.getElementById('openSettingsModalBtn')?.addEventListener('click', openSettings);
    document.getElementById('editGlobalRateBtn')?.addEventListener('click', openSettings);
    document.getElementById('mobileOpenSettingsModalBtn')?.addEventListener('click', openSettings);
    document.getElementById('mobileEditGlobalRateBtn')?.addEventListener('click', openSettings);
    document.getElementById('closeSettingsModalBtn')?.addEventListener('click', closeSettings);
    document.getElementById('cancelSettingsBtn')?.addEventListener('click', closeSettings);

    document.getElementById('toggleApiKeyVisibilityBtn')?.addEventListener('click', e => {
      const input = document.getElementById('geminiApiKeyInput');
      if (input.type === 'password') {
        input.type = 'text';
        e.target.textContent = 'Verberg';
      } else {
        input.type = 'password';
        e.target.textContent = 'Toon';
      }
    });

    document.getElementById('clearApiKeyBtn')?.addEventListener('click', () => {
      document.getElementById('geminiApiKeyInput').value = '';
      AppState.geminiApiKey = '';
      AppState.saveSettings();
      renderAll(true);
      showToast('API-sleutel gewist — Demo-modus actief');
    });

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      AppState.geminiApiKey = document.getElementById('geminiApiKeyInput').value.trim();
      const newGlobalRate = parseFloat(document.getElementById('modalGlobalRateInput').value);
      if (!isNaN(newGlobalRate) && newGlobalRate > 0) {
        AppState.globalHourlyRate = newGlobalRate;
        if (document.getElementById('applyGlobalRateToAllCheckbox').checked) {
          AppState.projects.forEach(p => {
            p.tarief = newGlobalRate;
          });
          AppState.saveProjects();
        }
      }
      AppState.saveSettings();
      closeSettings();
      renderAll(true);
      showToast('Instellingen & uurtarief opgeslagen!');
    });

    // Import Modal
    const importModal = document.getElementById('importModal');
    const feedbackBox = document.getElementById('importFeedbackBox');
    const previewBox = document.getElementById('importPreviewBox');
    const targetProjectInput = document.getElementById('importTargetProjectInput');
    const pasteTextarea = document.getElementById('csvPasteTextarea');
    const csvFileInput = document.getElementById('csvFileInput');
    let currentImportFileName = '';

    const updateImportPreview = () => {
      if (!previewBox) return;
      const rawText = pasteTextarea?.value || '';
      if (!rawText.trim()) {
        previewBox.classList.add('hidden');
        previewBox.innerHTML = '';
        return;
      }

      try {
        const analysis = analyzeCsvImport(rawText, AppState.globalHourlyRate, {
          fileName: currentImportFileName,
          existingProjects: AppState.projects
        });

        previewBox.classList.remove('hidden');
        if (analysis.format === 'basic_calculation') {
          if (analysis.detectedProjectNumber && targetProjectInput) {
            targetProjectInput.value = analysis.detectedProjectNumber;
          }
          const linkedNum = analysis.detectedProjectNumber || targetProjectInput?.value.trim() || '';
          const matchedProj = linkedNum
            ? AppState.projects.find(p => p.projectnummer.toLowerCase() === linkedNum.toLowerCase())
            : null;
          const badgeHtml = analysis.detectedProjectNumber
            ? `<span class="font-bold text-emerald-700">Vast projectnummer gevonden in bestand: ${analysis.detectedProjectNumber}</span>`
            : `<span class="font-bold text-amber-800">Geen projectnummer in bestand gevonden — koppelt aan opgegeven projectnummer (${linkedNum || 'vul in'})</span>`;

          previewBox.className = 'text-xs p-3.5 rounded-xl bg-[#eef3f9] border border-[#b6c8e2] text-[#0a2246] space-y-1';
          previewBox.innerHTML = `
            <div class="font-extrabold">Voorcalculatie CSV herkend (Basic calculation)</div>
            <div>${badgeHtml}${matchedProj ? ` &bull; Bestaand project: <strong>${formatIspProjectTitle(matchedProj)}</strong>` : ''}</div>
            <div class="font-mono-num text-[11px] text-slate-700">
              Begrote uren: <strong>${formatNumber(analysis.begroteUren)} u</strong> &bull;
              Begroot materiaal: <strong>${formatEuro(analysis.begrootMateriaal)}</strong> &bull;
              Uurtarief: <strong>${formatEuro(analysis.tarief)}/u</strong> &bull;
              Verkoopprijs: <strong>${formatEuro(analysis.verkoopprijs)}</strong>
            </div>
          `;
        } else if (analysis.format === 'urenregistratie') {
          const targetNum = targetProjectInput?.value.trim() || AppState.selectedProjectId;
          const targetEntry = targetNum
            ? analysis.entries.find(e => e.projectnummer.toLowerCase() === targetNum.toLowerCase())
            : null;
          previewBox.className = 'text-xs p-3.5 rounded-xl bg-[#eef3f9] border border-[#b6c8e2] text-[#0a2246] space-y-1';
          previewBox.innerHTML = `
            <div class="font-extrabold">Urenregistratie CSV herkend (${analysis.entries.length} projecten, ${analysis.rowsProcessed} regels, ${formatNumber(analysis.totalHours)} u totaal)</div>
            <div>Koppelt automatisch per project op basis van de kolom <code class="font-mono-num font-bold">Projectnummer</code>.${analysis.skippedInternalRows > 0 ? ` (${analysis.skippedInternalRows} interne urencodes 100-199 overgeslagen.)` : ''}</div>
            ${targetEntry ? `<div class="font-mono-num text-[11px] text-emerald-800 font-bold">Project ${targetEntry.projectnummer} in bestand: ${formatNumber(targetEntry.totalUren)} uur (Werkplaats ${formatNumber(targetEntry.werkplaatsUren)}u / Kantoor ${formatNumber(targetEntry.kantoorUren)}u)</div>` : ''}
          `;
        } else {
          previewBox.className = 'text-xs p-3.5 rounded-xl bg-[#eef3f9] border border-[#b6c8e2] text-[#0a2246] space-y-1';
          previewBox.innerHTML = `
            <div class="font-extrabold">Projectentabel CSV herkend (${analysis.projects.length} projecten)</div>
            <div>Koppelt per rij op de kolom <code class="font-mono-num font-bold">Projectnummer</code>.</div>
          `;
        }
      } catch (err) {
        previewBox.className = 'text-xs p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900';
        previewBox.textContent = err.message;
        previewBox.classList.remove('hidden');
      }
    };

    const handleOpenImportModal = () => {
      feedbackBox?.classList.add('hidden');
      if (targetProjectInput && (!pasteTextarea || !pasteTextarea.value.trim())) {
        targetProjectInput.value = AppState.selectedProjectId || '';
      }
      updateImportPreview();
      importModal?.classList.remove('hidden');
    };
    document.getElementById('openImportModalBtn')?.addEventListener('click', handleOpenImportModal);
    document.getElementById('mobileOpenImportModalBtn')?.addEventListener('click', handleOpenImportModal);
    document.getElementById('closeImportModalBtn')?.addEventListener('click', () => importModal?.classList.add('hidden'));
    document.getElementById('cancelImportBtn')?.addEventListener('click', () => importModal?.classList.add('hidden'));
    document.getElementById('downloadSampleCsvBtn')?.addEventListener('click', downloadSampleTemplateCsv);

    pasteTextarea?.addEventListener('input', updateImportPreview);
    targetProjectInput?.addEventListener('input', updateImportPreview);

    csvFileInput?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      currentImportFileName = file.name || '';
      const fileNum = extractProjectNumberFromTextOrName(currentImportFileName);
      if (fileNum && targetProjectInput) {
        targetProjectInput.value = fileNum;
      }
      const reader = new FileReader();
      reader.onload = evt => {
        if (pasteTextarea) pasteTextarea.value = evt.target?.result || '';
        updateImportPreview();
      };
      reader.readAsText(file);
    });

    document.getElementById('processImportBtn')?.addEventListener('click', () => {
      const rawText = pasteTextarea?.value || '';
      try {
        const analysis = analyzeCsvImport(rawText, AppState.globalHourlyRate, {
          fileName: currentImportFileName,
          existingProjects: AppState.projects
        });
        const replaceAll = Boolean(document.getElementById('replaceOnImportCheckbox')?.checked);
        const targetNum = targetProjectInput?.value.trim() || AppState.selectedProjectId || '';

        const result = applyCsvImport(analysis, {
          targetProjectNumber: targetNum,
          replaceAll
        });

        if (feedbackBox) {
          feedbackBox.className = 'text-xs p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold';
          feedbackBox.textContent = result.message;
          feedbackBox.classList.remove('hidden');
        }

        renderAll(true);
        showToast(result.message);
        setTimeout(() => {
          importModal?.classList.add('hidden');
          if (document.getElementById('viewProjectDashboard')) {
            switchTab('dashboard');
          }
        }, 700);
      } catch (err) {
        if (feedbackBox) {
          feedbackBox.className = 'text-xs p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold';
          feedbackBox.textContent = `Fout bij importeren: ${err.message}`;
          feedbackBox.classList.remove('hidden');
        }
      }
    });

    // Exporteer Rapport (A4 Print) & Exporteer CSV
    const triggerPrintReport = () => {
      if (AppState.activeTab === 'home' && document.getElementById('viewProjectDashboard')) {
        switchTab('dashboard');
      }
      const printTs = document.getElementById('printTimestamp');
      if (printTs) printTs.textContent = new Date().toLocaleString('nl-NL');
      setTimeout(() => window.print(), 150);
    };

    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCalculatedCsv);
    document.getElementById('bottomExportCsvBtn')?.addEventListener('click', exportCalculatedCsv);
    document.getElementById('mobileExportCsvBtn')?.addEventListener('click', exportCalculatedCsv);
    document.getElementById('exportReportBtn')?.addEventListener('click', triggerPrintReport);
    document.getElementById('bottomExportReportBtn')?.addEventListener('click', triggerPrintReport);
    document.getElementById('mobileExportReportBtn')?.addEventListener('click', triggerPrintReport);
    // Acties & Beheer dropdown menu toggle
    const actionsMenuBtn = document.getElementById('actionsMenuBtn');
    const actionsMenuDropdown = document.getElementById('actionsMenuDropdown');
    if (actionsMenuBtn && actionsMenuDropdown) {
      actionsMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionsMenuDropdown.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!actionsMenuDropdown.contains(e.target) && !actionsMenuBtn.contains(e.target)) {
          actionsMenuDropdown.classList.add('hidden');
        }
      });
      actionsMenuDropdown.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          actionsMenuDropdown.classList.add('hidden');
        });
      });
    }

    // Initialiseer tab controllers
    if (window.ProjectZoekenModule) {
      window.ProjectZoekenModule.setupListeners();
    }
    if (window.ProjectDashboardModule) {
      window.ProjectDashboardModule.setupListeners();
    }
    if (window.OchtendoverlegModule) {
      window.OchtendoverlegModule.setupListeners();
    }
  }

  // Exporteer functies globaal
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.DEFAULT_GLOBAL_RATE = DEFAULT_GLOBAL_RATE;
  window.ISP_START_PROJECT_NUMBER = ISP_START_PROJECT_NUMBER;
  window.ISP_CURRENT_MAX_DEMO_NUMBER = ISP_CURRENT_MAX_DEMO_NUMBER;
  window.AppState = AppState;
  window.formatIspProjectTitle = formatIspProjectTitle;
  window.extractProjectNumberInt = extractProjectNumberInt;
  window.getNextIspProjectNumber = getNextIspProjectNumber;
  window.formatEuro = formatEuro;
  window.formatSignedEuro = formatSignedEuro;
  window.formatSignedPct = formatSignedPct;
  window.formatNumber = formatNumber;
  window.showToast = showToast;
  window.calculateProjectMetrics = calculateProjectMetrics;
  window.detectSupplierDelayFromText = detectSupplierDelayFromText;
  window.normalizeProjectObject = normalizeProjectObject;
  window.getDefaultDemoProjects = getDefaultDemoProjects;
  window.findProjectsBySmartQuery = findProjectsBySmartQuery;
  window.openProjectStatusScreen = openProjectStatusScreen;
  window.parseFlexibleCsv = parseFlexibleCsv;
  window.analyzeCsvImport = analyzeCsvImport;
  window.applyCsvImport = applyCsvImport;
  window.parseCleanNumber = parseCleanNumber;
  window.exportCalculatedCsv = exportCalculatedCsv;
  window.downloadSampleTemplateCsv = downloadSampleTemplateCsv;
  window.renderHeaderControls = renderHeaderControls;
  window.renderClientViewVisibility = renderClientViewVisibility;
  window.syncCurrentFormToProjectAndRender = syncCurrentFormToProjectAndRender;
  window.updateSaveStatusIndicator = updateSaveStatusIndicator;
  window.renderAll = renderAll;
  window.switchTab = switchTab;

  /* ===================================================================
   * 10. BOOTSTRAP BIJ DOMCONTENTLOADED & CROSS-TAB SYNC
   * =================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    setupGlobalEventListeners();
    renderAll(true);
  });

  window.addEventListener('pageshow', evt => {
    if (evt.persisted) {
      AppState.init();
      renderAll(true);
    }
  });

  window.addEventListener('storage', evt => {
    if (evt.key && Object.values(STORAGE_KEYS).includes(evt.key)) {
      AppState.init();
      renderAll(true);
    }
  });

})(window);
