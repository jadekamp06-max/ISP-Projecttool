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
    ANONYMIZE_AI: 'isp_barendrecht_anonymize_ai_v1'
  };

  const DEFAULT_GLOBAL_RATE = 65.0;
  const ISP_START_PROJECT_NUMBER = 200001;
  const ISP_CURRENT_MAX_DEMO_NUMBER = 200490;

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

    return {
      projectnummer: String(raw.projectnummer || defaultNum).trim(),
      klant: String(raw.klant || 'Onbekende Klant').trim(),
      projectnaam: String(raw.projectnaam || 'Omschrijving project').trim(),
      status: String(raw.status || 'Lopend').toLowerCase().includes('afgerond') ? 'Afgerond' : 'Lopend',
      begroteUren: Math.max(0, parseFloat(raw.begroteUren) || 0),
      werkelijkeUren: Math.max(0, parseFloat(raw.werkelijkeUren) || 0),
      begrootMateriaal: Math.max(0, parseFloat(raw.begrootMateriaal) || 0),
      werkelijkMateriaal: Math.max(0, parseFloat(raw.werkelijkMateriaal) || 0),
      tarief: Math.max(0, parseFloat(raw.tarief) || fallbackRate),
      bestelstatus,
      heeftVertraging: typeof raw.heeftVertraging === 'boolean' ? raw.heeftVertraging : autoDelayDetected,
      aiVerified: Boolean(raw.aiVerified)
    };
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

    init() {
      const savedRate = parseFloat(localStorage.getItem(STORAGE_KEYS.GLOBAL_RATE));
      this.globalHourlyRate = !isNaN(savedRate) && savedRate > 0 ? savedRate : DEFAULT_GLOBAL_RATE;

      this.geminiApiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';

      const savedAnon = localStorage.getItem(STORAGE_KEYS.ANONYMIZE_AI);
      this.anonymizeBeforeAi = savedAnon === null ? true : savedAnon === 'true';

      const rawProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
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

      const savedSelectedId = localStorage.getItem(STORAGE_KEYS.SELECTED_ID);
      if (savedSelectedId && this.projects.some(p => p.projectnummer === savedSelectedId)) {
        this.selectedProjectId = savedSelectedId;
      } else {
        this.selectedProjectId = this.projects[0].projectnummer;
      }
    },

    saveProjects() {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
      localStorage.setItem(STORAGE_KEYS.SELECTED_ID, this.selectedProjectId);
    },

    saveSettings() {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_RATE, String(this.globalHourlyRate));
      localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, this.geminiApiKey);
      localStorage.setItem(STORAGE_KEYS.ANONYMIZE_AI, String(this.anonymizeBeforeAi));
    },

    getCurrentProject() {
      return this.projects.find(p => p.projectnummer === this.selectedProjectId) || this.projects[0];
    },

    trackRecentProject(projectnummer) {
      const clean = String(projectnummer);
      this.recentProjectIds = [clean, ...this.recentProjectIds.filter(id => id !== clean)].slice(0, 6);
    },

    resetToDemoData() {
      this.globalHourlyRate = DEFAULT_GLOBAL_RATE;
      this.projects = getDefaultDemoProjects(this.globalHourlyRate);
      this.selectedProjectId = '200490';
      this.homePage = 1;
      this.saveProjects();
      this.saveSettings();
    }
  };

  /* ===================================================================
   * 4. BEREKENINGSENGINE (VOORCALCULATIE VS. NACALCULATIE)
   * =================================================================== */
  function calculateProjectMetrics(project) {
    const begroteUren = Number(project.begroteUren) || 0;
    const werkelijkeUren = Number(project.werkelijkeUren) || 0;
    const uurtarief = Number(project.tarief) || DEFAULT_GLOBAL_RATE;
    const begrootMateriaal = Number(project.begrootMateriaal) || 0;
    const werkelijkMateriaal = Number(project.werkelijkMateriaal) || 0;

    const arbeidBegroot = begroteUren * uurtarief;
    const arbeidWerkelijk = werkelijkeUren * uurtarief;

    const totaalBegrootBudget = arbeidBegroot + begrootMateriaal;
    const totaleWerkelijkeKosten = arbeidWerkelijk + werkelijkMateriaal;

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

    const heeftVertraging = Boolean(project.heeftVertraging) || detectSupplierDelayFromText(project.bestelstatus);

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
    return Number.isInteger(num) ? String(num) : num.toFixed(1).replace('.', ',');
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
    renderAll(true);
    switchTab('dashboard');
    showToast(`Status geopend: ${formatIspProjectTitle(target, AppState.clientViewActive)}`);
  }

  /* ===================================================================
   * 7. CSV / EXCEL IMPORT & EXPORT
   * =================================================================== */
  function parseFlexibleCsv(text, defaultRate) {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      throw new Error('Het bestand of tekstveld bevat geen geldige header én datarijen.');
    }

    const headerLine = lines[0];
    let delimiter = ',';
    const semiCount = (headerLine.match(/;/g) || []).length;
    const tabCount = (headerLine.match(/\t/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;

    if (semiCount >= commaCount && semiCount >= tabCount && semiCount > 0) {
      delimiter = ';';
    } else if (tabCount > commaCount && tabCount > semiCount) {
      delimiter = '\t';
    }

    const splitRow = rowStr => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const ch = rowStr[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const rawHeaders = splitRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const findColIndex = (aliases, fallbackIdx) => {
      for (const alias of aliases) {
        const idx = rawHeaders.findIndex(h => h.includes(alias));
        if (idx !== -1) return idx;
      }
      return fallbackIdx;
    };

    const colMap = {
      projectnummer: findColIndex(['projectnummer', 'projectid', 'id', 'nummer', 'code'], 0),
      klant: findColIndex(['klant', 'klantnaam', 'opdrachtgever', 'client'], 1),
      projectnaam: findColIndex(['projectnaam', 'omschrijving', 'naam', 'project'], 2),
      status: findColIndex(['status', 'projectfase', 'fase'], 3),
      begroteUren: findColIndex(['begroteuren', 'voorcalculatieuren', 'urenvoor', 'geplandeuren'], 4),
      werkelijkeUren: findColIndex(['werkelijkeuren', 'gemaakteuren', 'urennacalc', 'urenwerkelijk'], 5),
      begrootMateriaal: findColIndex(['begrootmateriaal', 'materiaalbegroot', 'inkoopbegroot'], 6),
      werkelijkMateriaal: findColIndex(['werkelijkmateriaal', 'materiaalwerkelijk', 'werkelijkeinkoop', 'inkoopwerkelijk'], 7),
      tarief: findColIndex(['tarief', 'uurtarief', 'rate'], 8),
      bestelstatus: findColIndex(['bestelstatus', 'leverancier', 'levertijd', 'toeleverancier'], 9)
    };

    const parseCleanNumber = val => {
      if (val === undefined || val === null) return 0;
      let s = String(val).replace(/[€\s]/g, '').trim();
      if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (s.includes(',')) {
        s = s.replace(',', '.');
      }
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    };

    const importedProjects = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      if (cols.length < 2) continue;

      const pNum = cols[colMap.projectnummer] || String(ISP_START_PROJECT_NUMBER + AppState.projects.length + i - 1);
      const pClient = cols[colMap.klant] || 'Onbekende Klant';
      const pName = cols[colMap.projectnaam] || `Omschrijving project ${i}`;
      const pStatusRaw = cols[colMap.status] || 'Lopend';
      const pBegroteUren = parseCleanNumber(cols[colMap.begroteUren]);
      const pWerkelijkeUren = parseCleanNumber(cols[colMap.werkelijkeUren]);
      const pBegrootMat = parseCleanNumber(cols[colMap.begrootMateriaal]);
      const pWerkelijkMat = parseCleanNumber(cols[colMap.werkelijkMateriaal]);
      const pTarief = parseCleanNumber(cols[colMap.tarief]) || defaultRate;
      const pBestel = cols[colMap.bestelstatus] || 'Op schema';

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
          bestelstatus: pBestel
        }, defaultRate, i)
      );
    }

    if (importedProjects.length === 0) {
      throw new Error('Geen geldige projectrijen gevonden om te importeren.');
    }

    return importedProjects;
  }

  function exportCalculatedCsv() {
    const headers = [
      'ISP_Projectbenaming',
      'Projectnummer',
      'Klant',
      'Omschrijving_Project',
      'Status',
      'Statusbadge',
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
    showToast('CSV-bestand (met 200001+ structuur) gedownload voor Excel!');
  }

  function downloadSampleTemplateCsv() {
    const next1 = getNextIspProjectNumber(AppState.projects);
    const next2 = String(parseInt(next1, 10) + 1);
    const sample = [
      'Projectnummer;Klant;Projectnaam;Status;BegroteUren;WerkelijkeUren;BegrootMateriaal;WerkelijkMateriaal;Tarief;Bestelstatus',
      `${next1};Maasvlakte Terminals;RVS Schakelkast & PLC Ombouw;Lopend;140;128;12500;11900;65;Op schema - Siemens PLC geleverd`,
      `${next2};Offshore Heavy Lift;Lierenframe Revisie & NDT Inspectie;Lopend;220;238;19000;19400;65;Kritieke vertraging onderdeel: SKF Hoofdlager (+5 werkdagen)`
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

  function syncCurrentFormToProjectAndRender(populateInputs = false) {
    const proj = AppState.getCurrentProject();
    if (!proj) return;

    const idInput = document.getElementById('inputProjectId');
    const nameInput = document.getElementById('inputProjectName');
    const clientInput = document.getElementById('inputClientName');
    const plHoursInput = document.getElementById('inputPlannedHours');
    const actHoursInput = document.getElementById('inputActualHours');
    const rateInput = document.getElementById('inputHourlyRate');
    const plMatInput = document.getElementById('inputPlannedMaterial');
    const actMatInput = document.getElementById('inputActualMaterial');
    const supInput = document.getElementById('inputSupplierStatus');
    const supDelayInput = document.getElementById('inputSupplierDelayFlag');

    const newId = idInput?.value.trim() || proj.projectnummer;
    proj.projectnummer = newId;
    proj.projectnaam = nameInput?.value.trim() || proj.projectnaam;
    proj.klant = clientInput?.value.trim() || proj.klant;
    proj.begroteUren = Math.max(0, parseFloat(plHoursInput?.value) || 0);
    proj.werkelijkeUren = Math.max(0, parseFloat(actHoursInput?.value) || 0);
    proj.tarief = Math.max(0, parseFloat(rateInput?.value) || AppState.globalHourlyRate);
    proj.begrootMateriaal = Math.max(0, parseFloat(plMatInput?.value) || 0);
    proj.werkelijkMateriaal = Math.max(0, parseFloat(actMatInput?.value) || 0);
    proj.bestelstatus = supInput?.value.trim() || 'Op schema';
    proj.heeftVertraging = supDelayInput ? supDelayInput.checked : false;

    AppState.selectedProjectId = newId;
    AppState.saveProjects();
    renderAll(populateInputs);
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
      renderAll(true);
      showToast(AppState.clientViewActive ? 'Klantweergave actief (interne marges verborgen)' : 'Interne weergave hersteld');
    };

    document.getElementById('clientViewToggle')?.addEventListener('change', handleClientToggle);
    document.getElementById('mobileClientViewToggle')?.addEventListener('change', handleClientToggle);

    document.getElementById('disableClientViewBtn')?.addEventListener('click', () => {
      AppState.clientViewActive = false;
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

    const handleOpenImportModal = () => {
      feedbackBox?.classList.add('hidden');
      importModal?.classList.remove('hidden');
    };
    document.getElementById('openImportModalBtn')?.addEventListener('click', handleOpenImportModal);
    document.getElementById('mobileOpenImportModalBtn')?.addEventListener('click', handleOpenImportModal);
    document.getElementById('closeImportModalBtn')?.addEventListener('click', () => importModal?.classList.add('hidden'));
    document.getElementById('cancelImportBtn')?.addEventListener('click', () => importModal?.classList.add('hidden'));
    document.getElementById('downloadSampleCsvBtn')?.addEventListener('click', downloadSampleTemplateCsv);

    document.getElementById('csvFileInput')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        document.getElementById('csvPasteTextarea').value = evt.target?.result || '';
      };
      reader.readAsText(file);
    });

    document.getElementById('processImportBtn')?.addEventListener('click', () => {
      const rawText = document.getElementById('csvPasteTextarea').value;
      try {
        const imported = parseFlexibleCsv(rawText, AppState.globalHourlyRate);
        const replaceAll = document.getElementById('replaceOnImportCheckbox').checked;

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

        AppState.selectedProjectId = imported[0].projectnummer;
        AppState.trackRecentProject(imported[0].projectnummer);
        AppState.saveProjects();

        if (feedbackBox) {
          feedbackBox.className = 'text-xs p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold';
          feedbackBox.textContent = `Succesvol ${imported.length} project(en) geïmporteerd!`;
          feedbackBox.classList.remove('hidden');
        }

        renderAll(true);
        switchTab('dashboard');
        showToast(`${imported.length} project(en) succesvol geïmporteerd!`);
        setTimeout(() => importModal?.classList.add('hidden'), 900);
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
      if (AppState.activeTab === 'home') {
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
  window.exportCalculatedCsv = exportCalculatedCsv;
  window.downloadSampleTemplateCsv = downloadSampleTemplateCsv;
  window.renderHeaderControls = renderHeaderControls;
  window.renderClientViewVisibility = renderClientViewVisibility;
  window.syncCurrentFormToProjectAndRender = syncCurrentFormToProjectAndRender;
  window.renderAll = renderAll;
  window.switchTab = switchTab;

  /* ===================================================================
   * 10. BOOTSTRAP BIJ DOMCONTENTLOADED
   * =================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    setupGlobalEventListeners();
    renderAll(true);
  });

})(window);
