document.addEventListener('DOMContentLoaded', () => {

  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page-content');

  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      pages.forEach(page => page.classList.remove('active-page'));
      const targetPageId = button.getAttribute('data-target');
      const targetPage = document.getElementById(targetPageId);
      if (targetPage) targetPage.classList.add('active-page');
    });
  });

  function escapeHtml(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const THEME_KEY = 'jarvito_theme';
  const ACCENT_KEY = 'jarvito_accent';
  const CUSTOM_KEY = 'jarvito_accent_custom';
  const CUSTOM_VARS_KEY = 'jarvito_accent_vars';
  const THEME_COLORS = { dark: '#0d0614', light: '#f4f2fa' };
  const ACCENTS = ['roxo', 'azul', 'verde', 'laranja', 'rosa', 'dourado', 'vermelho'];
  const COR_PADRAO = '#8b5cf6';
  const root = document.documentElement;

  const inputCor = document.getElementById('accentColorInput');
  const notaCor = document.getElementById('accentCustomNote');
  const swatchCustom = document.querySelector('.accent-swatch[data-accent="custom"]');

  // --- matemática de cores (cor personalizada) ---
  const LUM_MIN = 0.11;  // abaixo disso a cor some no fundo escuro
  const LUM_MAX = 0.30;  // acima disso o texto branco sobre a cor fica ilegível

  function hexParaRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbParaHex(rgb) {
    return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function rgbParaHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hslParaRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }

  function luminancia(rgb) {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function ajustarLegibilidade(h, s, l) {
    let rgb = hslParaRgb(h, s, l);
    let lum = luminancia(rgb);
    while (lum > LUM_MAX && l > 0.15) {
      l -= 0.01;
      rgb = hslParaRgb(h, s, l);
      lum = luminancia(rgb);
    }
    while (lum < LUM_MIN && l < 0.85) {
      l += 0.01;
      rgb = hslParaRgb(h, s, l);
      lum = luminancia(rgb);
    }
    return { rgb, l };
  }

  function calcularCor(hexEscolhido) {
    const rgbEscolhido = hexParaRgb(hexEscolhido) || hexParaRgb(COR_PADRAO);
    let [h, s, l] = rgbParaHsl(rgbEscolhido[0], rgbEscolhido[1], rgbEscolhido[2]);
    const colorida = s >= 0.12;
    if (colorida) s = Math.max(s, 0.35);

    const principal = ajustarLegibilidade(h, s, l);
    const secundaria = ajustarLegibilidade(colorida ? h + 35 : h, s, principal.l);
    const diferenca = Math.max(
      Math.abs(rgbEscolhido[0] - principal.rgb[0]),
      Math.abs(rgbEscolhido[1] - principal.rgb[1]),
      Math.abs(rgbEscolhido[2] - principal.rgb[2])
    );

    return {
      a: rgbParaHex(principal.rgb),
      b: rgbParaHex(secundaria.rgb),
      ar: principal.rgb.join(', '),
      br: secundaria.rgb.join(', '),
      ajustada: diferenca > 12
    };
  }

  function aplicarTema(tema) {
    if (!THEME_COLORS[tema]) tema = 'dark';
    root.setAttribute('data-theme', tema);
    try { localStorage.setItem(THEME_KEY, tema); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[tema]);
    document.querySelectorAll('.theme-option').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === tema);
    });
  }

  function marcarAccentAtivo(valor) {
    document.querySelectorAll('.accent-swatch').forEach((b) => {
      b.classList.toggle('active', b.dataset.accent === valor);
    });
  }

  function limparCorPersonalizada() {
    ['--accent', '--accent2', '--accent-rgb', '--accent2-rgb'].forEach((p) => root.style.removeProperty(p));
  }

  function lerCorPersonalizada() {
    let salva = null;
    try { salva = localStorage.getItem(CUSTOM_KEY); } catch (e) {}
    if (salva && hexParaRgb(salva)) return salva;
    const atual = getComputedStyle(root).getPropertyValue('--accent').trim();
    return hexParaRgb(atual) ? atual : COR_PADRAO;
  }

  function aplicarCorPersonalizada(hexEscolhido) {
    const cor = calcularCor(hexEscolhido);
    root.setAttribute('data-accent', 'custom');
    root.style.setProperty('--accent', cor.a);
    root.style.setProperty('--accent2', cor.b);
    root.style.setProperty('--accent-rgb', cor.ar);
    root.style.setProperty('--accent2-rgb', cor.br);
    try {
      localStorage.setItem(ACCENT_KEY, 'custom');
      localStorage.setItem(CUSTOM_KEY, hexEscolhido);
      localStorage.setItem(CUSTOM_VARS_KEY, JSON.stringify({ a: cor.a, b: cor.b, ar: cor.ar, br: cor.br }));
    } catch (e) {}
    marcarAccentAtivo('custom');
    if (notaCor) {
      notaCor.textContent = cor.ajustada
        ? 'Ajustamos o brilho da cor para manter a leitura: ' + cor.a + '.'
        : '';
    }
  }

  function aplicarAccent(nome) {
    if (nome === 'custom') {
      aplicarCorPersonalizada(lerCorPersonalizada());
      return;
    }
    if (!ACCENTS.includes(nome)) nome = 'roxo';
    limparCorPersonalizada();
    root.setAttribute('data-accent', nome);
    try { localStorage.setItem(ACCENT_KEY, nome); } catch (e) {}
    marcarAccentAtivo(nome);
    if (notaCor) notaCor.textContent = '';
  }

  document.querySelectorAll('.theme-option').forEach((b) => {
    b.addEventListener('click', () => aplicarTema(b.dataset.theme));
  });
  document.querySelectorAll('.accent-swatch:not([data-accent="custom"])').forEach((b) => {
    b.addEventListener('click', () => aplicarAccent(b.dataset.accent));
  });

  if (swatchCustom && inputCor) {
    swatchCustom.addEventListener('click', (e) => {
      aplicarAccent('custom');
      if (e.target !== inputCor) inputCor.click();
    });
    inputCor.addEventListener('input', () => aplicarCorPersonalizada(inputCor.value));
  }

  const btnReset = document.getElementById('btnResetTheme');
  if (btnReset) btnReset.addEventListener('click', () => { aplicarTema('dark'); aplicarAccent('roxo'); });

  const btnOpenSyncFromSettings = document.getElementById('btnOpenSyncFromSettings');
  if (btnOpenSyncFromSettings) {
    btnOpenSyncFromSettings.addEventListener('click', () => {
      const btn = document.getElementById('btnSyncSettings');
      if (btn) btn.click();
    });
  }

  let temaSalvo = 'dark';
  let accentSalvo = 'roxo';
  try {
    temaSalvo = localStorage.getItem(THEME_KEY) || 'dark';
    accentSalvo = localStorage.getItem(ACCENT_KEY) || 'roxo';
  } catch (e) {}
  if (inputCor) inputCor.value = lerCorPersonalizada();
  aplicarTema(temaSalvo);
  aplicarAccent(accentSalvo);

  // ===== CONFIGURAÇÃO DO FIREBASE (SINCRONIZAÇÃO) =====
  const firebaseConfig = {
    apiKey: "AIzaSyCIvo6lPGMl-mbA3xfHJnMwuhEuy9xOLk0",
    authDomain: "jarvito-b4529.firebaseapp.com",
    projectId: "jarvito-b4529",
    storageBucket: "jarvito-b4529.firebasestorage.app",
    messagingSenderId: "282091474872",
    appId: "1:282091474872:web:fd17012475547f543ec94d"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  let syncCode = localStorage.getItem('jarvito_sync_code') || null;
  let unsubscribeSnapshot = null;
  let isApplyingRemoteData = false;
  let principalCarregado = false;

  let projectsData = [];
  let notesData = []; 
  let hotIdeasData = [];
  let calendarEventsData = {};

  function dadosPadrao() {
    return {
      projects: [
        {
          id: 1,
          title: 'PROJETO 1',
          tasks: [
            { text: 'Ler documentos', priority: 1, completed: true },
            { text: 'Montar powerpoint', priority: 2, completed: false },
            { text: 'Atualizar materiais', priority: 3, completed: false }
          ]
        },
        {
          id: 2,
          title: 'PROJETO 2',
          tasks: []
        }
      ],
      notes: [],
      hotIdeas: [],
      calendarEvents: {}
    };
  }

  function getDocRef() {
    return db.collection('workspaces').doc(syncCode);
  }

  async function salvarTudo() {
    if (!syncCode || isApplyingRemoteData) return;
    try {
      await getDocRef().set({
        projects: projectsData,
        notes: notesData,
        hotIdeas: hotIdeasData,
        calendarEvents: calendarEventsData,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
      alert(err && err.code === 'permission-denied'
        ? 'O Firebase recusou a gravação (permission-denied). Atualize as regras do Firestore no Firebase Console.'
        : 'Não foi possível salvar suas alterações. Verifique sua conexão e o código de sincronização.');
    }
  }

  function iniciarSincronizacao() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    principalCarregado = false;

    unsubscribeSnapshot = getDocRef().onSnapshot((doc) => {
      if (doc.metadata && doc.metadata.hasPendingWrites) return;

      isApplyingRemoteData = true;
      const descricaoDigitando = capturarDescricaoEmEdicao();

      if (doc.exists) {
        const data = doc.data();
        projectsData = data.projects || [];
        notesData = data.notes || [];
        hotIdeasData = data.hotIdeas || [];
        calendarEventsData = data.calendarEvents || {};
        
        // Migração de formato antigo de string para array se necessário
        if (typeof notesData === 'string') {
          const textoAntigo = notesData.trim();
          notesData = textoAntigo ? [{ id: Date.now(), title: 'Anotações', text: textoAntigo, color: 'amarelo' }] : [];
        }
      } else {
        const padrao = dadosPadrao();
        projectsData = padrao.projects;
        notesData = padrao.notes;
        hotIdeasData = padrao.hotIdeas;
        calendarEventsData = padrao.calendarEvents;
        getDocRef().set(padrao);
      }

      reaplicarDescricaoEmEdicao(descricaoDigitando);
      renderizarTudoAposSync();
      isApplyingRemoteData = false;

      principalCarregado = true;
    }, (err) => {
      console.error('Erro na sincronização com o Firestore:', err);
      alert(err && err.code === 'permission-denied'
        ? 'O Firebase recusou a leitura (permission-denied). Atualize as regras do Firestore no Firebase Console.'
        : 'Não foi possível conectar à sincronização. Verifique sua conexão com a internet.');
    });

    if (syncCode) {
      iniciarGaleria(syncCode);
    }
  }

  function renderizarTudoAposSync() {
    if (descricaoEmEdicao() || arrastandoProjeto) {
      rerenderProjetosPendente = true;
    } else {
      renderizarProjetos();
    }

    renderizarCalendario();
    renderizarHotIdeas();
    renderizarNotas();
    atualizarDatalist();
  }

  const modalSyncCode = document.getElementById('modalSyncCode');
  const syncCodeInput = document.getElementById('syncCodeInput');
  const btnConfirmSyncCode = document.getElementById('btnConfirmSyncCode');
  const btnCloseSyncModal = document.getElementById('btnCloseSyncModal');
  const btnSyncSettings = document.getElementById('btnSyncSettings');

  function abrirModalSyncCode(permitirFechar) {
    if (syncCodeInput) syncCodeInput.value = syncCode || '';
    if (btnCloseSyncModal) btnCloseSyncModal.style.display = permitirFechar ? 'block' : 'none';
    if (modalSyncCode) modalSyncCode.style.display = 'flex';
  }

  function fecharModalSyncCode() {
    if (modalSyncCode) modalSyncCode.style.display = 'none';
  }

  if (btnCloseSyncModal) btnCloseSyncModal.addEventListener('click', fecharModalSyncCode);

  if (btnConfirmSyncCode) {
    btnConfirmSyncCode.addEventListener('click', () => {
      const novoCodigo = syncCodeInput.value.trim();
      if (!novoCodigo) {
        alert('Digite um código de sincronização!');
        return;
      }

      syncCode = novoCodigo;
      localStorage.setItem('jarvito_sync_code', syncCode);
      fecharModalSyncCode();
      iniciarSincronizacao();
    });
  }

  if (btnSyncSettings) {
    btnSyncSettings.addEventListener('click', () => abrirModalSyncCode(true));
  }


  // ===== HOT IDEAS =====
  const hotIdeasHistoryList = document.getElementById('hotIdeasHistoryList');

  function renderizarHotIdeas() {
    if (!hotIdeasHistoryList) return;
    hotIdeasHistoryList.innerHTML = '';

    if (hotIdeasData.length === 0) {
      hotIdeasHistoryList.innerHTML = '<span style="color: var(--accent-soft); font-size: 13px;">Nenhuma ideia registrada ainda.</span>';
      return;
    }

    hotIdeasData.forEach((item, index) => {
      const card = document.createElement('div');
      card.classList.add('hot-idea-card');
      card.innerHTML = `
        <div class="hot-idea-header">
          <span>${item.date}</span>
          <button class="btn-delete-idea" data-index="${index}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="hot-idea-body">${escapeHtml(item.text)}</div>
      `;
      hotIdeasHistoryList.appendChild(card);
    });

    hotIdeasHistoryList.querySelectorAll('.btn-delete-idea').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        hotIdeasData.splice(idx, 1);
        salvarTudo();
        renderizarHotIdeas();
      });
    });
  }

  const hotIdeaBtn = document.getElementById('hotIdeaBtn');
  const modalHotIdea = document.getElementById('modalHotIdea');
  const hotIdeaText = document.getElementById('hotIdeaText');
  const btnCloseHotIdeaModal = document.getElementById('btnCloseHotIdeaModal');
  const btnCancelHotIdeaModal = document.getElementById('btnCancelHotIdeaModal');
  const btnSaveHotIdeaModal = document.getElementById('btnSaveHotIdeaModal');

  function abrirModalHotIdea() {
    if (hotIdeaText) hotIdeaText.value = '';
    if (modalHotIdea) modalHotIdea.style.display = 'flex';
  }

  function fecharModalHotIdea() {
    if (modalHotIdea) modalHotIdea.style.display = 'none';
  }

  if (hotIdeaBtn) hotIdeaBtn.addEventListener('click', abrirModalHotIdea);
  if (btnCloseHotIdeaModal) btnCloseHotIdeaModal.addEventListener('click', fecharModalHotIdea);
  if (btnCancelHotIdeaModal) btnCancelHotIdeaModal.addEventListener('click', fecharModalHotIdea);

  if (btnSaveHotIdeaModal) {
    btnSaveHotIdeaModal.addEventListener('click', () => {
      const ideia = hotIdeaText ? hotIdeaText.value.trim() : '';
      if (!ideia) {
        alert('Digite uma ideia antes de concluir!');
        return;
      }

      const agora = new Date();
      const dataHoraFormatted = agora.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      hotIdeasData.unshift({
        text: ideia,
        date: dataHoraFormatted
      });

      salvarTudo();
      renderizarHotIdeas();
      fecharModalHotIdea();
    });
  }


  // ===== ANOTAÇÕES (STICKY NOTES) COM NOVO FLUXO E DESIGN =====
  const stickyNotesBoard = document.getElementById('stickyNotesBoard');
  const newNoteTitleInput = document.getElementById('newNoteTitleInput');
  const newNoteTextInput = document.getElementById('newNoteTextInput');
  const btnAddNote = document.getElementById('btnAddNote');
  const newNoteColorPicker = document.getElementById('newNoteColorPicker');

  let selectedNewNoteColor = 'amarelo';

  if (newNoteColorPicker) {
    newNoteColorPicker.querySelectorAll('.sticky-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        newNoteColorPicker.querySelectorAll('.sticky-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        selectedNewNoteColor = dot.getAttribute('data-color');
      });
    });
  }

  if (btnAddNote) {
    btnAddNote.addEventListener('click', () => {
      const titulo = newNoteTitleInput ? newNoteTitleInput.value.trim() : '';
      const texto = newNoteTextInput ? newNoteTextInput.value.trim() : '';

      if (!titulo && !texto) {
        alert('Digite um título ou conteúdo para criar a anotação!');
        return;
      }

      if (!Array.isArray(notesData)) notesData = [];

      notesData.unshift({
        id: Date.now(),
        title: titulo,
        text: texto,
        color: selectedNewNoteColor
      });

      if (newNoteTitleInput) newNoteTitleInput.value = '';
      if (newNoteTextInput) newNoteTextInput.value = '';

      salvarTudo();
      renderizarNotas();
    });
  }

  function renderizarNotas() {
    if (!stickyNotesBoard) return;
    stickyNotesBoard.innerHTML = '';

    if (!Array.isArray(notesData) || notesData.length === 0) {
      stickyNotesBoard.innerHTML = '<div class="sticky-empty">Nenhuma anotação criada ainda. Use o painel acima para adicionar.</div>';
      return;
    }

    notesData.forEach((note) => {
      const card = document.createElement('div');
      card.className = `sticky-note color-${note.color || 'amarelo'}`;
      card.setAttribute('data-id', note.id);

      const tituloLimpo = escapeHtml(note.title);
      const textoLimpo = escapeHtml(note.text);
      const temTitulo = note.title && note.title.trim() !== '';

      card.innerHTML = `
        <div class="sticky-header-banner"></div>
        <div class="sticky-view sticky-content-wrap">
          <div class="sticky-title ${temTitulo ? '' : 'is-empty'}">${temTitulo ? tituloLimpo : 'Sem título'}</div>
          <div class="sticky-preview">${textoLimpo}</div>
        </div>
        <div class="sticky-edit">
          <input type="text" class="sticky-title-input" value="${tituloLimpo}" placeholder="Título...">
          <textarea class="sticky-text-input" placeholder="Escreva sua anotação...">${note.text || ''}</textarea>
          <div class="sticky-tools">
            <div class="sticky-colors">
              <button type="button" class="sticky-color-dot dot-amarelo ${note.color === 'amarelo' ? 'active' : ''}" data-color="amarelo"></button>
              <button type="button" class="sticky-color-dot dot-rosa ${note.color === 'rosa' ? 'active' : ''}" data-color="rosa"></button>
              <button type="button" class="sticky-color-dot dot-azul ${note.color === 'azul' ? 'active' : ''}" data-color="azul"></button>
              <button type="button" class="sticky-color-dot dot-verde ${note.color === 'verde' ? 'active' : ''}" data-color="verde"></button>
              <button type="button" class="sticky-color-dot dot-laranja ${note.color === 'laranja' ? 'active' : ''}" data-color="laranja"></button>
              <button type="button" class="sticky-color-dot dot-lilas ${note.color === 'lilas' ? 'active' : ''}" data-color="lilas"></button>
            </div>
            <div class="sticky-actions">
              <button type="button" class="sticky-btn delete btn-delete-note">Excluir</button>
              <button type="button" class="sticky-btn close btn-close-note">Fechar</button>
            </div>
          </div>
        </div>
      `;

      // Eventos do cartão
      const viewWrap = card.querySelector('.sticky-view');
      viewWrap.addEventListener('click', () => {
        document.querySelectorAll('.sticky-note.open').forEach(n => {
          if (n !== card) n.classList.remove('open');
        });
        card.classList.add('open');
        const textIn = card.querySelector('.sticky-text-input');
        if (textIn) textIn.focus();
      });

      const btnClose = card.querySelector('.btn-close-note');
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.remove('open');
        salvarDadosNota(card, note.id);
      });

      const btnDelete = card.querySelector('.btn-delete-note');
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Deseja realmente excluir esta anotação?')) {
          notesData = notesData.filter(n => n.id !== note.id);
          salvarTudo();
          renderizarNotas();
        }
      });

      card.querySelectorAll('.sticky-colors .sticky-color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const novaCor = dot.getAttribute('data-color');
          note.color = novaCor;
          card.className = `sticky-note open color-${novaCor}`;
          card.querySelectorAll('.sticky-colors .sticky-color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          salvarTudo();
        });
      });

      const tInput = card.querySelector('.sticky-title-input');
      const aInput = card.querySelector('.sticky-text-input');

      tInput.addEventListener('input', () => {
        note.title = tInput.value;
        salvarTudoDebounced();
      });

      aInput.addEventListener('input', () => {
        note.text = aInput.value;
        salvarTudoDebounced();
      });

      stickyNotesBoard.appendChild(card);
    });
  }

  let noteSaveTimeout = null;
  function salvarTudoDebounced() {
    clearTimeout(noteSaveTimeout);
    noteSaveTimeout = setTimeout(() => {
      salvarTudo();
    }, 500);
  }

  function salvarDadosNota(card, id) {
    const note = notesData.find(n => n.id === id);
    if (!note) return;
    const tInput = card.querySelector('.sticky-title-input');
    const aInput = card.querySelector('.sticky-text-input');
    if (tInput) note.title = tInput.value;
    if (aInput) note.text = aInput.value;
    salvarTudo();
    renderizarNotas();
  }


  // ===== PROJETOS E TAREFAS =====
  const projectsList = document.querySelector('.projects-list');
  const completedProjectsList = document.querySelector('.completed-projects-list');

  const expandedProjects = new Set();
  const expandedTaskByProject = new Map();
  let descricaoSaveTimeout = null;
  let descricaoPendente = false;
  let rerenderProjetosPendente = false;
  let arrastandoProjeto = false;

  function chaveDoProjeto(project, pIndex) {
    return String(project.id != null ? project.id : 'i' + pIndex);
  }

  function descricaoEmEdicao() {
    const a = document.activeElement;
    return !!(a && a.classList && a.classList.contains('task-description-input'));
  }

  function capturarDescricaoEmEdicao() {
    if (!descricaoEmEdicao()) return null;
    const campo = document.activeElement;
    const card = campo.closest('.project-card');
    const item = campo.closest('.task-item');
    if (!card || !item) return null;

    const pIndex = parseInt(card.getAttribute('data-project-index'));
    const tIndex = parseInt(item.getAttribute('data-task-index'));
    const task = projectsData[pIndex] && projectsData[pIndex].tasks[tIndex];
    if (!task) return null;

    return { chave: card.getAttribute('data-project-key'), tIndex, texto: task.text, valor: campo.value };
  }

  function reaplicarDescricaoEmEdicao(edicao) {
    if (!edicao) return;
    const projeto = projectsData.find((proj, i) => chaveDoProjeto(proj, i) === edicao.chave);
    const task = projeto && projeto.tasks[edicao.tIndex];
    if (task && task.text === edicao.texto) task.description = edicao.valor;
  }

  function criarCardProjetoHTML(project, pIndex) {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.completed).length;
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const openTasks = totalTasks - completedTasks;
    const pKey = chaveDoProjeto(project, pIndex);
    const projetoAberto = expandedProjects.has(pKey);
    const taskAberta = expandedTaskByProject.has(pKey) ? expandedTaskByProject.get(pKey) : -1;

    let statusColor;
    let statusText;

    if (totalTasks === 0) {
      statusColor = '#a78bfa';
      statusText = 'Não há tasks';
    } else if (openTasks > 0) {
      statusColor = '#ff4d4d';
      statusText = `${openTasks} Tasks em aberto!`;
    } else {
      statusColor = '#22c55e';
      statusText = 'Todas as tasks concluídas!';
    }

    let tasksHTML = '';
    const tasksOrdenadas = project.tasks
      .map((task, tIndex) => ({ task, tIndex }))
      .sort((a, b) => a.task.priority - b.task.priority);

    tasksOrdenadas.forEach(({ task, tIndex }) => {
      const descricao = task.description || '';
      const temDescricao = descricao.trim() !== '';
      const aberta = tIndex === taskAberta;

      tasksHTML += `
        <div class="task-item${temDescricao ? ' has-description' : ''}${aberta ? ' is-open' : ''}" data-task-index="${tIndex}">
          <div class="task-delete-selector" style="display: none;">
            <input type="checkbox" class="task-delete-checkbox">
          </div>
          <span class="task-title" title="Clique para abrir a descrição">${escapeHtml(task.text)}</span>
          <span class="task-desc-badge" title="Esta tarefa tem descrição"><i class="fa-solid fa-align-left"></i></span>
          <span class="task-priority priority-${task.priority}" data-priority="${task.priority}">(Nível ${task.priority} de Prioridade!)</span>
          <button class="btn-edit-task" title="Editar nome e prioridade"><i class="fa-solid fa-pen"></i></button>
          <input type="checkbox" class="custom-checkbox" ${task.completed ? 'checked' : ''}>
          <div class="task-description-panel" style="display: ${aberta ? 'block' : 'none'};">
            <label>Descrição / anotações</label>
            <textarea class="task-description-input" placeholder="Escreva detalhes, passos, links ou anotações desta tarefa...">${escapeHtml(descricao)}</textarea>
          </div>
        </div>
      `;
    });

    return `
      <div class="project-card${projetoAberto ? ' expanded' : ''}" data-project-index="${pIndex}" data-project-key="${escapeHtml(pKey)}">
        <div class="project-delete-selector" style="display: none;">
          <input type="checkbox" class="card-delete-checkbox">
          <span>Selecionar para excluir projeto</span>
        </div>
        <div class="project-header">
          <div class="project-title-wrap">
            <span class="project-drag-handle" title="Segure e arraste para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>
            <h2 class="project-title-editable" title="Clique para editar o nome">${escapeHtml(project.title)}</h2>
          </div>
          <div class="project-info">
            <span class="alert-text" style="color: ${statusColor}">
              ${statusText}
            </span>
            <span class="project-status">${percentage}% de 100% Concluído</span>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${percentage === 100 ? 'complete' : 'yellow'}" style="width: ${percentage}%;"></div>
        </div>
        <div class="project-details" style="display: ${projetoAberto ? 'block' : 'none'};">
          <div class="task-actions">
            <button class="btn-pill btn-add-task">+ Add Task</button>
            <button class="btn-pill btn-remove-task">- Remove Task</button>
            <button class="btn-action btn-confirm-task-delete" style="display: none;"><i class="fa-solid fa-check"></i> Excluir Selecionadas</button>
            <button class="btn-action btn-cancel-task-delete" style="display: none;"><i class="fa-solid fa-xmark"></i> Cancelar</button>
          </div>

          <div class="inline-task-form" style="display: none;">
            <input type="text" class="input-task-name" placeholder="Nome da tarefa...">
            <select class="select-task-priority">
              <option value="1">Prioridade 1</option>
              <option value="2">Prioridade 2</option>
              <option value="3">Prioridade 3</option>
            </select>
            <button class="btn-save-task">Salvar</button>
            <button class="btn-cancel-task">Cancelar</button>
          </div>

          <div class="task-items">${tasksHTML}</div>
        </div>
      </div>
    `;
  }

  function renderizarProjetos() {
    rerenderProjetosPendente = false;
    if (projectsList) projectsList.innerHTML = '';
    if (completedProjectsList) completedProjectsList.innerHTML = '';

    projectsData.forEach((project, pIndex) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.completed).length;
      const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      const cardHTML = criarCardProjetoHTML(project, pIndex);

      if (percentage === 100 && totalTasks > 0) {
        if (completedProjectsList) completedProjectsList.insertAdjacentHTML('beforeend', cardHTML);
      } else {
        if (projectsList) projectsList.insertAdjacentHTML('beforeend', cardHTML);
      }
    });

    if (completedProjectsList && completedProjectsList.children.length === 0) {
      completedProjectsList.innerHTML = '<span style="color: var(--accent-soft); font-size: 14px;">Nenhum projeto concluído no momento.</span>';
    }
  }

  function alternarExpansaoProjeto(cardAtivo) {
    const detailsActive = cardAtivo.querySelector('.project-details');
    const estaAberto = detailsActive && detailsActive.style.display === 'block';
    const chave = cardAtivo.getAttribute('data-project-key');

    const allCards = document.querySelectorAll('.project-card');
    allCards.forEach(card => {
      card.classList.remove('expanded');
      const details = card.querySelector('.project-details');
      if (details) details.style.display = 'none';
    });

    expandedProjects.clear();

    if (!estaAberto) {
      cardAtivo.classList.add('expanded');
      if (detailsActive) detailsActive.style.display = 'block';
      if (chave) expandedProjects.add(chave);
    }
  }

  function alternarDescricaoTask(card, taskItem) {
    const chave = card.getAttribute('data-project-key');
    const tIndex = parseInt(taskItem.getAttribute('data-task-index'));
    const painel = taskItem.querySelector('.task-description-panel');
    if (!painel) return;

    const estaAberta = painel.style.display === 'block';

    card.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('is-open');
      const p = item.querySelector('.task-description-panel');
      if (p) p.style.display = 'none';
    });

    expandedTaskByProject.delete(chave);

    if (!estaAberta) {
      painel.style.display = 'block';
      taskItem.classList.add('is-open');
      expandedTaskByProject.set(chave, tIndex);
      const campo = painel.querySelector('.task-description-input');
      if (campo) campo.focus();
    }
  }

  function tratarInputDescricao(e) {
    if (!e.target.classList.contains('task-description-input')) return;

    const card = e.target.closest('.project-card');
    const taskItem = e.target.closest('.task-item');
    if (!card || !taskItem) return;

    const pIndex = parseInt(card.getAttribute('data-project-index'));
    const tIndex = parseInt(taskItem.getAttribute('data-task-index'));
    const task = projectsData[pIndex] && projectsData[pIndex].tasks[tIndex];
    if (!task) return;

    task.description = e.target.value;
    taskItem.classList.toggle('has-description', e.target.value.trim() !== '');

    descricaoPendente = true;
    clearTimeout(descricaoSaveTimeout);
    descricaoSaveTimeout = setTimeout(() => {
      descricaoPendente = false;
      salvarTudo();
    }, 600);
  }

  function tratarSaidaDescricao(e) {
    if (!e.target.classList.contains('task-description-input')) return;

    if (descricaoPendente) {
      clearTimeout(descricaoSaveTimeout);
      descricaoPendente = false;
      salvarTudo();
    }

    setTimeout(() => {
      if (rerenderProjetosPendente && !descricaoEmEdicao()) renderizarProjetos();
    }, 0);
  }

  function confirmarNovaOrdem(lista) {
    const cards = Array.from(lista.querySelectorAll(':scope > .project-card'));
    const novaOrdem = cards.map((c) => parseInt(c.getAttribute('data-project-index')));
    const posicoes = novaOrdem.slice().sort((a, b) => a - b);
    const mudou = novaOrdem.some((idx, i) => idx !== posicoes[i]);

    if (!mudou) {
      if (rerenderProjetosPendente) renderizarProjetos();
      return;
    }

    const copia = projectsData.slice();
    novaOrdem.forEach((idxProjeto, i) => { copia[posicoes[i]] = projectsData[idxProjeto]; });
    projectsData = copia;

    salvarTudo();
    renderizarProjetos();
  }

  function iniciarArrasto(e) {
    const handle = e.target.closest('.project-drag-handle');
    if (!handle) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const card = handle.closest('.project-card');
    const lista = card && card.parentElement;
    if (!card || !lista) return;

    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}

    const rect = card.getBoundingClientRect();
    const deslocY = e.clientY - rect.top;

    const placeholder = document.createElement('div');
    placeholder.className = 'project-placeholder';
    placeholder.style.height = rect.height + 'px';
    lista.insertBefore(placeholder, card);

    card.classList.add('dragging');
    card.style.width = rect.width + 'px';
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    document.body.classList.add('is-dragging');
    arrastandoProjeto = true;

    let ultimoY = e.clientY;
    let rolagem = 0;
    let rafId = null;

    function posicionar() {
      card.style.top = (ultimoY - deslocY) + 'px';

      const irmaos = Array.from(lista.children).filter(
        (c) => c !== card && c !== placeholder && c.classList.contains('project-card')
      );
      let alvo = null;
      for (const c of irmaos) {
        const r = c.getBoundingClientRect();
        if (ultimoY < r.top + r.height / 2) { alvo = c; break; }
      }

      if (alvo) {
        if (placeholder.nextElementSibling !== alvo) lista.insertBefore(placeholder, alvo);
      } else {
        const ultimo = irmaos[irmaos.length - 1];
        if (ultimo && !(ultimo.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          lista.insertBefore(placeholder, ultimo.nextSibling);
        }
      }
    }

    function loopRolagem() {
      if (rolagem !== 0) {
        window.scrollBy(0, rolagem);
        posicionar();
      }
      rafId = requestAnimationFrame(loopRolagem);
    }

    function aoMover(ev) {
      ultimoY = ev.clientY;
      const margemTopo = 70;
      const margemBase = window.matchMedia('(max-width: 640px)').matches ? 150 : 70;
      const limiteBase = window.innerHeight - margemBase;
      if (ultimoY < margemTopo) rolagem = -Math.ceil((margemTopo - ultimoY) / 4);
      else if (ultimoY > limiteBase) rolagem = Math.ceil((ultimoY - limiteBase) / 4);
      else rolagem = 0;
      posicionar();
    }

    function terminar() {
      handle.removeEventListener('pointermove', aoMover);
      handle.removeEventListener('pointerup', terminar);
      handle.removeEventListener('pointercancel', terminar);
      cancelAnimationFrame(rafId);
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}

      lista.insertBefore(card, placeholder);
      placeholder.remove();
      card.classList.remove('dragging');
      card.style.width = '';
      card.style.left = '';
      card.style.top = '';
      document.body.classList.remove('is-dragging');
      arrastandoProjeto = false;

      confirmarNovaOrdem(lista);
    }

    handle.addEventListener('pointermove', aoMover);
    handle.addEventListener('pointerup', terminar);
    handle.addEventListener('pointercancel', terminar);
    rafId = requestAnimationFrame(loopRolagem);
    posicionar();
  }

  const btnAddProject = document.querySelector('.btn-add');
  const modalNewProject = document.getElementById('modalNewProject');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveModalProject = document.getElementById('btnSaveModalProject');
  const modalProjectName = document.getElementById('modalProjectName');
  const modalTaskName = document.getElementById('modalTaskName');
  const modalTaskPriority = document.getElementById('modalTaskPriority');
  const btnAddModalTask = document.getElementById('btnAddModalTask');
  const modalTaskList = document.getElementById('modalTaskList');

  let tasksNovasTemp = [];

  function abrirModalProjeto() {
    if (modalProjectName) modalProjectName.value = '';
    if (modalTaskName) modalTaskName.value = '';
    if (modalTaskPriority) modalTaskPriority.value = '1';
    tasksNovasTemp = [];
    atualizarListaModalTasks();
    if (modalNewProject) modalNewProject.style.display = 'flex';
  }

  function fecharModalProjeto() {
    if (modalNewProject) modalNewProject.style.display = 'none';
  }

  function atualizarListaModalTasks() {
    if (!modalTaskList) return;
    modalTaskList.innerHTML = '';
    tasksNovasTemp.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'modal-task-item';
      item.innerHTML = `
        <span>${escapeHtml(t.text)} (Prioridade ${t.priority})</span>
        <button type="button" class="btn-delete-event" data-index="${i}">&times;</button>
      `;
      modalTaskList.appendChild(item);
    });

    modalTaskList.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        tasksNovasTemp.splice(idx, 1);
        atualizarListaModalTasks();
      });
    });
  }

  if (btnAddProject) btnAddProject.addEventListener('click', abrirModalProjeto);
  if (btnCloseModal) btnCloseModal.addEventListener('click', fecharModalProjeto);
  if (btnCancelModal) btnCancelModal.addEventListener('click', fecharModalProjeto);

  if (btnAddModalTask) {
    btnAddModalTask.addEventListener('click', () => {
      const nome = modalTaskName ? modalTaskName.value.trim() : '';
      if (!nome) {
        alert('Digite o nome da tarefa!');
        return;
      }
      tasksNovasTemp.push({
        text: nome,
        priority: parseInt(modalTaskPriority ? modalTaskPriority.value : '1'),
        completed: false
      });
      if (modalTaskName) modalTaskName.value = '';
      atualizarListaModalTasks();
    });
  }

  if (btnSaveModalProject) {
    btnSaveModalProject.addEventListener('click', () => {
      const nomeProj = modalProjectName ? modalProjectName.value.trim() : '';
      if (!nomeProj) {
        alert('Digite o nome do projeto!');
        return;
      }

      const novoId = projectsData.length > 0 ? Math.max(...projectsData.map(p => p.id || 0)) + 1 : 1;
      projectsData.push({
        id: novoId,
        title: nomeProj,
        tasks: tasksNovasTemp
      });

      salvarTudo();
      renderizarProjetos();
      fecharModalProjeto();
    });
  }

  const btnDeleteProjectMode = document.querySelector('.btn-delete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  let modoExclusaoProjetoAtivo = false;

  if (btnDeleteProjectMode) {
    btnDeleteProjectMode.addEventListener('click', () => {
      modoExclusaoProjetoAtivo = true;
      if (btnDeleteProjectMode) btnDeleteProjectMode.style.display = 'none';
      if (btnConfirmDelete) btnConfirmDelete.style.display = 'inline-flex';
      if (btnCancelDelete) btnCancelDelete.style.display = 'inline-flex';
      document.querySelectorAll('.project-delete-selector').forEach(el => el.style.display = 'flex');
    });
  }

  function sairModoExclusaoProjeto() {
    modoExclusaoProjetoAtivo = false;
    if (btnDeleteProjectMode) btnDeleteProjectMode.style.display = 'inline-flex';
    if (btnConfirmDelete) btnConfirmDelete.style.display = 'none';
    if (btnCancelDelete) btnCancelDelete.style.display = 'none';
    document.querySelectorAll('.project-delete-selector').forEach(el => el.style.display = 'none');
  }

  if (btnCancelDelete) btnCancelDelete.addEventListener('click', sairModoExclusaoProjeto);

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      const cards = document.querySelectorAll('.project-card');
      const indicesParaRemover = [];

      cards.forEach(card => {
        const chk = card.querySelector('.card-delete-checkbox');
        if (chk && chk.checked) {
          indicesParaRemover.push(parseInt(card.getAttribute('data-project-index')));
        }
      });

      if (indicesParaRemover.length === 0) {
        alert('Selecione pelo menos um projeto para excluir!');
        return;
      }

      if (confirm(`Deseja realmente excluir ${indicesParaRemover.length} projeto(s)?`)) {
        projectsData = projectsData.filter((_, idx) => !indicesParaRemover.includes(idx));
        salvarTudo();
        renderizarProjetos();
      }

      sairModoExclusaoProjeto();
    });
  }

  function ligarModoExclusaoTask(card) {
    card.querySelectorAll('.task-delete-selector').forEach(el => el.style.display = 'flex');
    const rmBtn = card.querySelector('.btn-remove-task');
    const confBtn = card.querySelector('.btn-confirm-task-delete');
    const cancBtn = card.querySelector('.btn-cancel-task-delete');
    if (rmBtn) rmBtn.style.display = 'none';
    if (confBtn) confBtn.style.display = 'inline-flex';
    if (cancBtn) cancBtn.style.display = 'inline-flex';
  }

  function desligarModoExclusaoTask(card) {
    card.querySelectorAll('.task-delete-selector').forEach(el => el.style.display = 'none');
    const rmBtn = card.querySelector('.btn-remove-task');
    const confBtn = card.querySelector('.btn-confirm-task-delete');
    const cancBtn = card.querySelector('.btn-cancel-task-delete');
    if (rmBtn) rmBtn.style.display = 'inline-flex';
    if (confBtn) confBtn.style.display = 'none';
    if (cancBtn) cancBtn.style.display = 'none';
  }

  const modalEditTask = document.getElementById('modalEditTask');
  const btnCloseEditTaskModal = document.getElementById('btnCloseEditTaskModal');
  const btnCancelEditTaskModal = document.getElementById('btnCancelEditTaskModal');
  const btnSaveEditTaskModal = document.getElementById('btnSaveEditTaskModal');
  const editModalTaskName = document.getElementById('editModalTaskName');
  const editModalTaskPriority = document.getElementById('editModalTaskPriority');

  let editingProjectIndex = null;
  let editingTaskIndex = null;

  function abrirModalEditarTask(pIdx, tIdx) {
    editingProjectIndex = pIdx;
    editingTaskIndex = tIdx;
    const task = projectsData[pIdx] && projectsData[pIdx].tasks[tIdx];
    if (!task) return;

    if (editModalTaskName) editModalTaskName.value = task.text;
    if (editModalTaskPriority) editModalTaskPriority.value = String(task.priority || 1);
    if (modalEditTask) modalEditTask.style.display = 'flex';
  }

  function fecharModalEditarTask() {
    if (modalEditTask) modalEditTask.style.display = 'none';
  }

  if (btnCloseEditTaskModal) btnCloseEditTaskModal.addEventListener('click', fecharModalEditarTask);
  if (btnCancelEditTaskModal) btnCancelEditTaskModal.addEventListener('click', fecharModalEditarTask);

  if (btnSaveEditTaskModal) {
    btnSaveEditTaskModal.addEventListener('click', () => {
      if (editingProjectIndex === null || editingTaskIndex === null) return;
      const novoNome = editModalTaskName ? editModalTaskName.value.trim() : '';
      if (!novoNome) {
        alert('Digite o nome da tarefa!');
        return;
      }

      const task = projectsData[editingProjectIndex].tasks[editingTaskIndex];
      task.text = novoNome;
      task.priority = parseInt(editModalTaskPriority ? editModalTaskPriority.value : '1');

      salvarTudo();
      renderizarProjetos();
      fecharModalEditarTask();
    });
  }

  document.addEventListener('click', (e) => {
    const header = e.target.closest('.project-header');
    if (header && !e.target.closest('.project-title-editable') && !e.target.closest('.project-drag-handle')) {
      if (modoExclusaoProjetoAtivo) return;
      const card = header.closest('.project-card');
      if (card) alternarExpansaoProjeto(card);
      return;
    }

    const titleEditable = e.target.closest('.project-title-editable');
    if (titleEditable) {
      const card = titleEditable.closest('.project-card');
      if (!card) return;
      const pIndex = parseInt(card.getAttribute('data-project-index'));
      const proj = projectsData[pIndex];
      if (!proj) return;

      const atual = proj.title;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = atual;
      input.className = 'title-input-inline';

      titleEditable.replaceWith(input);
      input.focus();
      input.select();

      function salvarNovoTitulo() {
        const val = input.value.trim();
        if (val) proj.title = val;
        salvarTudo();
        renderizarProjetos();
      }

      input.addEventListener('blur', salvarNovoTitulo);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          input.blur();
        } else if (ev.key === 'Escape') {
          renderizarProjetos();
        }
      });
      return;
    }

    const btnAddTask = e.target.closest('.btn-add-task');
    if (btnAddTask) {
      const card = btnAddTask.closest('.project-card');
      const form = card && card.querySelector('.inline-task-form');
      if (form) form.style.display = form.style.display === 'flex' ? 'none' : 'flex';
      return;
    }

    const btnSaveTask = e.target.closest('.btn-save-task');
    if (btnSaveTask) {
      const card = btnSaveTask.closest('.project-card');
      const pIndex = parseInt(card.getAttribute('data-project-index'));
      const nomeInput = card.querySelector('.input-task-name');
      const prioridadeSelect = card.querySelector('.select-task-priority');
      const nome = nomeInput ? nomeInput.value.trim() : '';

      if (!nome) {
        alert('Digite o nome da tarefa!');
        return;
      }

      if (projectsData[pIndex]) {
        projectsData[pIndex].tasks.push({
          text: nome,
          priority: parseInt(prioridadeSelect ? prioridadeSelect.value : '1'),
          completed: false
        });
        salvarTudo();
        renderizarProjetos();
      }
      return;
    }

    const btnCancelTask = e.target.closest('.btn-cancel-task');
    if (btnCancelTask) {
      const card = btnCancelTask.closest('.project-card');
      const form = card && card.querySelector('.inline-task-form');
      if (form) form.style.display = 'none';
      return;
    }

    const btnRemoveTask = e.target.closest('.btn-remove-task');
    if (btnRemoveTask) {
      const card = btnRemoveTask.closest('.project-card');
      if (card) ligarModoExclusaoTask(card);
      return;
    }

    const btnCancelTaskDel = e.target.closest('.btn-cancel-task-delete');
    if (btnCancelTaskDel) {
      const card = btnCancelTaskDel.closest('.project-card');
      if (card) desligarModoExclusaoTask(card);
      return;
    }

    const btnConfirmTaskDel = e.target.closest('.btn-confirm-task-delete');
    if (btnConfirmTaskDel) {
      const card = btnConfirmTaskDel.closest('.project-card');
      const pIndex = parseInt(card.getAttribute('data-project-index'));
      const taskItens = card.querySelectorAll('.task-item');
      const indicesRemover = [];

      taskItens.forEach(item => {
        const chk = item.querySelector('.task-delete-checkbox');
        if (chk && chk.checked) {
          indicesRemover.push(parseInt(item.getAttribute('data-task-index')));
        }
      });

      if (indicesRemover.length === 0) {
        alert('Selecione pelo menos uma tarefa para excluir!');
        return;
      }

      if (projectsData[pIndex]) {
        projectsData[pIndex].tasks = projectsData[pIndex].tasks.filter((_, idx) => !indicesRemover.includes(idx));
        salvarTudo();
        renderizarProjetos();
      }
      return;
    }

    const taskTitle = e.target.closest('.task-title');
    const taskDescBadge = e.target.closest('.task-desc-badge');
    if (taskTitle || taskDescBadge) {
      const item = (taskTitle || taskDescBadge).closest('.task-item');
      const card = item && item.closest('.project-card');
      if (card && item) alternarDescricaoTask(card, item);
      return;
    }

    const btnEditTask = e.target.closest('.btn-edit-task');
    if (btnEditTask) {
      const card = btnEditTask.closest('.project-card');
      const item = btnEditTask.closest('.task-item');
      if (card && item) {
        const pIdx = parseInt(card.getAttribute('data-project-index'));
        const tIdx = parseInt(item.getAttribute('data-task-index'));
        abrirModalEditarTask(pIdx, tIdx);
      }
      return;
    }
  });

  document.addEventListener('change', (e) => {
    if (!e.target.classList.contains('custom-checkbox')) return;
    const item = e.target.closest('.task-item');
    const card = e.target.closest('.project-card');
    if (!item || !card) return;

    const pIndex = parseInt(card.getAttribute('data-project-index'));
    const tIndex = parseInt(item.getAttribute('data-task-index'));

    if (projectsData[pIndex] && projectsData[pIndex].tasks[tIndex]) {
      projectsData[pIndex].tasks[tIndex].completed = e.target.checked;
      salvarTudo();
      renderizarProjetos();
    }
  });

  document.addEventListener('input', tratarInputDescricao);
  document.addEventListener('focusout', tratarSaidaDescricao, true);
  document.addEventListener('pointerdown', iniciarArrasto);


  // ===== CALENDÁRIO =====
  let currentCalendarDate = new Date();
  const calendarMonthYear = document.getElementById('calendarMonthYear');
  const calendarDaysGrid = document.getElementById('calendarDaysGrid');
  const btnPrevMonth = document.getElementById('btnPrevMonth');
  const btnNextMonth = document.getElementById('btnNextMonth');

  const modalCalendarEvent = document.getElementById('modalCalendarEvent');
  const btnCloseCalendarModal = document.getElementById('btnCloseCalendarModal');
  const btnCloseCalendarModalFooter = document.getElementById('btnCloseCalendarModalFooter');
  const calendarModalTitle = document.getElementById('calendarModalTitle');
  const calendarEventInput = document.getElementById('calendarEventInput');
  const btnAddCalendarEvent = document.getElementById('btnAddCalendarEvent');
  const calendarEventsList = document.getElementById('calendarEventsList');
  let selectedCalendarDateKey = null;

  function renderizarCalendario() {
    if (!calendarDaysGrid || !calendarMonthYear) return;

    const ano = currentCalendarDate.getFullYear();
    const mes = currentCalendarDate.getMonth();

    const nomeMes = currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    calendarMonthYear.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    calendarDaysGrid.innerHTML = '';

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaSemana; i++) {
      const celulaVazia = document.createElement('div');
      celulaVazia.className = 'calendar-day-cell empty';
      calendarDaysGrid.appendChild(celulaVazia);
    }

    const hoje = new Date();

    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      const celula = document.createElement('div');
      celula.className = 'calendar-day-cell';

      const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

      if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) {
        celula.classList.add('today');
      }

      let badgesHTML = '';
      const eventosDoDia = calendarEventsData[dataStr] || [];
      eventosDoDia.forEach(ev => {
        badgesHTML += `<div class="calendar-event-badge">${escapeHtml(ev)}</div>`;
      });

      celula.innerHTML = `
        <div class="calendar-day-number">${dia}</div>
        <div class="calendar-events-container">${badgesHTML}</div>
      `;

      celula.addEventListener('click', () => abrirModalCalendario(dataStr, dia, mes, ano));
      calendarDaysGrid.appendChild(celula);
    }
  }

  function abrirModalCalendario(dataStr, dia, mes, ano) {
    selectedCalendarDateKey = dataStr;
    const dataObj = new Date(ano, mes, dia);
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (calendarModalTitle) calendarModalTitle.textContent = `Eventos de ${dataFormatada}`;
    if (calendarEventInput) calendarEventInput.value = '';
    renderizarListaEventosModal();
    if (modalCalendarEvent) modalCalendarEvent.style.display = 'flex';
  }

  function fecharModalCalendario() {
    if (modalCalendarEvent) modalCalendarEvent.style.display = 'none';
  }

  function renderizarListaEventosModal() {
    if (!calendarEventsList) return;
    calendarEventsList.innerHTML = '';
    const eventos = calendarEventsData[selectedCalendarDateKey] || [];

    if (eventos.length === 0) {
      calendarEventsList.innerHTML = '<span style="color: var(--accent-soft); font-size: 13px;">Nenhum evento neste dia.</span>';
      return;
    }

    eventos.forEach((ev, idx) => {
      const item = document.createElement('div');
      item.className = 'modal-task-item';
      item.innerHTML = `
        <span>${escapeHtml(ev)}</span>
        <button type="button" class="btn-delete-event" data-index="${idx}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      `;
      calendarEventsList.appendChild(item);
    });

    calendarEventsList.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        calendarEventsData[selectedCalendarDateKey].splice(idx, 1);
        if (calendarEventsData[selectedCalendarDateKey].length === 0) {
          delete calendarEventsData[selectedCalendarDateKey];
        }
        salvarTudo();
        renderizarCalendario();
        renderizarListaEventosModal();
      });
    });
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderizarCalendario();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderizarCalendario();
    });
  }

  if (btnCloseCalendarModal) btnCloseCalendarModal.addEventListener('click', fecharModalCalendario);
  if (btnCloseCalendarModalFooter) btnCloseCalendarModalFooter.addEventListener('click', fecharModalCalendario);

  if (btnAddCalendarEvent) {
    btnAddCalendarEvent.addEventListener('click', () => {
      const nomeEv = calendarEventInput ? calendarEventInput.value.trim() : '';
      if (!nomeEv) {
        alert('Digite o nome do evento/prazo!');
        return;
      }
      if (!calendarEventsData[selectedCalendarDateKey]) {
        calendarEventsData[selectedCalendarDateKey] = [];
      }
      calendarEventsData[selectedCalendarDateKey].push(nomeEv);
      if (calendarEventInput) calendarEventInput.value = '';
      salvarTudo();
      renderizarCalendario();
      renderizarListaEventosModal();
    });
  }


  // ===== GALERIA & ARQUIVOS (Mantida intacta) =====
  let galleryItems = [];
  let currentGalleryTag = '';
  const UPLOAD_CHUNK_SIZE = 800000;

  const galleryGrid = document.getElementById('galleryGrid');
  const galleryCount = document.getElementById('galleryCount');
  const galleryTagFilters = document.getElementById('galleryTagFilters');
  const galleryTagSuggestions = document.getElementById('galleryTagSuggestions');
  const btnOpenGalleryUpload = document.getElementById('btnOpenGalleryUpload');
  const modalGalleryUpload = document.getElementById('modalGalleryUpload');
  const btnCloseGalleryUpload = document.getElementById('btnCloseGalleryUpload');
  const btnCancelGalleryUpload = document.getElementById('btnCancelGalleryUpload');
  const btnSaveGalleryUpload = document.getElementById('btnSaveGalleryUpload');
  const uploadDrop = document.getElementById('uploadDrop');
  const galleryFileInput = document.getElementById('galleryFileInput');
  const uploadPreview = document.getElementById('uploadPreview');
  const uploadTagInput = document.getElementById('uploadTagInput');
  const btnAddUploadTag = document.getElementById('btnAddUploadTag');
  const uploadTagList = document.getElementById('uploadTagList');
  const uploadStatus = document.getElementById('uploadStatus');

  const modalGalleryView = document.getElementById('modalGalleryView');
  const btnCloseGalleryView = document.getElementById('btnCloseGalleryView');
  const btnCloseGalleryViewFooter = document.getElementById('btnCloseGalleryViewFooter');
  const btnSaveViewerTags = document.getElementById('btnSaveViewerTags');
  const btnDeleteImage = document.getElementById('btnDeleteImage');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerImg = document.getElementById('viewerImg');
  const viewerFileBox = document.getElementById('viewerFileBox');
  const viewerFileIcon = document.getElementById('viewerFileIcon');
  const viewerFileName = document.getElementById('viewerFileName');
  const viewerFileMeta = document.getElementById('viewerFileMeta');
  const btnDownloadFile = document.getElementById('btnDownloadFile');
  const viewerFileStatus = document.getElementById('viewerFileStatus');
  const viewerTagList = document.getElementById('viewerTagList');
  const viewerTagInput = document.getElementById('viewerTagInput');
  const btnAddViewerTag = document.getElementById('btnAddViewerTag');

  let pendingFilesToUpload = [];
  let pendingUploadTags = [];
  let currentViewingItem = null;
  let viewerTagsTemp = [];

  function iniciarGaleria(code) {
    carregarGaleria(code);
  }

  function carregarGaleria(code) {
    db.collection('workspaces').doc(code).collection('gallery').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
      galleryItems = [];
      snapshot.forEach(doc => {
        galleryItems.push({ id: doc.id, ...doc.data() });
      });
      renderizarGaleria();
    }, (err) => {
      console.error('Erro ao carregar galeria:', err);
    });
  }

  function renderizarGaleria() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    const tagsSet = new Set();
    galleryItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => tagsSet.add(t));
      }
    });

    if (galleryTagFilters) {
      galleryTagFilters.innerHTML = '';
      const chipTodas = document.createElement('span');
      chipTodas.className = `tag-chip ${currentGalleryTag === '' ? 'active' : ''}`;
      chipTodas.textContent = 'Todas';
      chipTodas.addEventListener('click', () => { currentGalleryTag = ''; renderizarGaleria(); });
      galleryTagFilters.appendChild(chipTodas);

      tagsSet.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = `tag-chip ${currentGalleryTag === tag ? 'active' : ''}`;
        chip.textContent = tag;
        chip.addEventListener('click', () => { currentGalleryTag = tag; renderizarGaleria(); });
        galleryTagFilters.appendChild(chip.tag);
        galleryTagFilters.appendChild(chip);
      });
    }

    const filtrados = currentGalleryTag === '' 
      ? galleryItems 
      : galleryItems.filter(item => item.tags && item.tags.includes(currentGalleryTag));

    if (galleryCount) {
      galleryCount.textContent = `${filtrados.length} item(ns)`;
    }

    if (filtrados.length === 0) {
      galleryGrid.innerHTML = '<div class="gallery-empty">Nenhum item na galeria. Clique em "Adicionar" para enviar imagens ou arquivos.</div>';
      return;
    }

    filtrados.forEach(item => {
      const div = document.createElement('div');
      let tagsHTML = '';
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => { tagsHTML += `<span>${escapeHtml(t)}</span>`; });
      }

      if (item.type === 'file') {
        div.className = 'gallery-item gallery-file';
        const ext = (item.name.split('.').pop() || '').toLowerCase();
        let iconClass = 'fa-file';
        let extClass = '';
        if (ext === 'pdf') { iconClass = 'fa-file-pdf'; extClass = 'ext-pdf'; }
        else if (['doc', 'docx'].includes(ext)) { iconClass = 'fa-file-word'; extClass = 'ext-doc'; }
        else if (['xls', 'xlsx', 'csv'].includes(ext)) { iconClass = 'fa-file-excel'; extClass = 'ext-xls'; }
        else if (['ppt', 'pptx'].includes(ext)) { iconClass = 'fa-file-powerpoint'; extClass = 'ext-ppt'; }

        div.innerHTML = `
          <i class="fa-solid ${iconClass} gallery-file-icon ${extClass}"></i>
          <div class="gallery-file-name">${escapeHtml(item.name)}</div>
          <div class="gallery-file-meta">${formatarTamanho(item.size)}</div>
          <div class="gallery-item-tags">${tagsHTML}</div>
        `;
      } else {
        div.className = 'gallery-item';
        div.innerHTML = `
          <img src="${item.thumb || item.dataUrl || ''}" alt="Imagem">
          <div class="gallery-item-tags">${tagsHTML}</div>
        `;
      }

      div.addEventListener('click', () => abrirVisualizadorGaleria(item));
      galleryGrid.appendChild(div);
    });
  }

  function atualizarDatalist() {
    if (!galleryTagSuggestions) return;
    const tagsSet = new Set();
    galleryItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(t => tagsSet.add(t));
      }
    });
    galleryTagSuggestions.innerHTML = '';
    tagsSet.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      galleryTagSuggestions.appendChild(opt);
    });
  }

  function formatarTamanho(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // Upload modal handlers
  if (btnOpenGalleryUpload) btnOpenGalleryUpload.addEventListener('click', () => {
    pendingFilesToUpload = [];
    pendingUploadTags = [];
    if (uploadPreview) uploadPreview.innerHTML = '';
    if (uploadTagInput) uploadTagInput.value = '';
    renderizarTagsUpload();
    if (uploadStatus) uploadStatus.textContent = '';
    if (modalGalleryUpload) modalGalleryUpload.style.display = 'flex';
  });

  function fecharUploadModal() {
    if (modalGalleryUpload) modalGalleryUpload.style.display = 'none';
  }

  if (btnCloseGalleryUpload) btnCloseGalleryUpload.addEventListener('click', fecharUploadModal);
  if (btnCancelGalleryUpload) btnCancelGalleryUpload.addEventListener('click', fecharUploadModal);

  if (uploadDrop && galleryFileInput) {
    uploadDrop.addEventListener('click', () => galleryFileInput.click());
    galleryFileInput.addEventListener('change', (e) => processarArquivosSelecionados(e.target.files));
    uploadDrop.addEventListener('dragover', (e) => { e.preventDefault(); uploadDrop.classList.add('dragover'); });
    uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('dragover'));
    uploadDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadDrop.classList.remove('dragover');
      if (e.dataTransfer.files) processarArquivosSelecionados(e.dataTransfer.files);
    });
  }

  function processarArquivosSelecionados(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 5 MB.`);
        continue;
      }
      pendingFilesToUpload.push(file);
    }
    renderizarPreviaUpload();
  }

  function renderizarPreviaUpload() {
    if (!uploadPreview) return;
    uploadPreview.innerHTML = '';
    pendingFilesToUpload.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'upload-preview-item' + (file.type.startsWith('image/') ? '' : ' is-file');
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.innerHTML = `<img src="${e.target.result}" alt="Preview"><button type="button" class="upload-remove" data-index="${idx}">&times;</button>`;
        };
        reader.readAsDataURL(file);
      } else {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let icon = 'fa-file';
        if (ext === 'pdf') icon = 'fa-file-pdf';
        else if (['doc', 'docx'].includes(ext)) icon = 'fa-file-word';
        else if (['xls', 'xlsx', 'csv'].includes(ext)) icon = 'fa-file-excel';
        else if (['ppt', 'pptx'].includes(ext)) icon = 'fa-file-powerpoint';

        item.innerHTML = `
          <i class="fa-solid ${icon}"></i>
          <span>${escapeHtml(file.name)}</span>
          <button type="button" class="upload-remove" data-index="${idx}">&times;</button>
        `;
      }
      uploadPreview.appendChild(item);
    });

    uploadPreview.querySelectorAll('.upload-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        pendingFilesToUpload.splice(idx, 1);
        renderizarPreviaUpload();
      });
    });
  }

  function renderizarTagsUpload() {
    if (!uploadTagList) return;
    uploadTagList.innerHTML = '';
    pendingUploadTags.forEach((tag, idx) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escapeHtml(tag)} <button type="button" class="chip-x" data-index="${idx}">&times;</button>`;
      uploadTagList.appendChild(chip);
    });

    uploadTagList.querySelectorAll('.chip-x').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingUploadTags.splice(parseInt(btn.getAttribute('data-index')), 1);
        renderizarTagsUpload();
      });
    });
  }

  if (btnAddUploadTag && uploadTagInput) {
    btnAddUploadTag.addEventListener('click', adicionarTagUpload);
    uploadTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarTagUpload();
      }
    });
  }

  function adicionarTagUpload() {
    const val = uploadTagInput.value.trim();
    if (val && !pendingUploadTags.includes(val)) {
      pendingUploadTags.push(val);
      uploadTagInput.value = '';
      renderizarTagsUpload();
    }
  }

  if (btnSaveGalleryUpload) {
    btnSaveGalleryUpload.addEventListener('click', async () => {
      if (pendingFilesToUpload.length === 0) {
        alert('Escolha pelo menos um arquivo ou imagem!');
        return;
      }

      if (uploadStatus) uploadStatus.textContent = 'Enviando arquivos...';
      btnSaveGalleryUpload.disabled = true;

      try {
        for (const file of pendingFilesToUpload) {
          if (file.type.startsWith('image/')) {
            await comprimirESalvarImagem(file, pendingUploadTags);
          } else {
            await comprimirESalvarArquivo(file, pendingUploadTags);
          }
        }
        fecharUploadModal();
        renderizarGaleria();
      } catch (err) {
        console.error('Erro no upload:', err);
        alert('Erro ao enviar arquivo. Verifique sua conexão.');
      } finally {
        btnSaveGalleryUpload.disabled = false;
        if (uploadStatus) uploadStatus.textContent = '';
      }
    });
  }

  function comprimirESalvarImagem(file, tags) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const max = 1280;
          if (w > max || h > max) {
            if (w > h) { h = Math.round((h * max) / w); w = max; }
            else { w = Math.round((w * max) / h); h = max; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          
          // Miniatura menor
          const canvasThumb = document.createElement('canvas');
          canvasThumb.width = 250;
          canvasThumb.height = Math.round((250 * h) / w);
          const ctxThumb = canvasThumb.getContext('2d');
          ctxThumb.drawImage(canvas, 0, 0, canvasThumb.width, canvasThumb.height);
          const thumb = canvasThumb.toDataURL('image/jpeg', 0.7);

          await db.collection('workspaces').doc(syncCode).collection('gallery').add({
            type: 'image',
            dataUrl: dataUrl,
            thumb: thumb,
            tags: tags,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function comprimirESalvarArquivo(file, tags) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target.result;
        const docRef = await db.collection('workspaces').doc(syncCode).collection('gallery').add({
          type: 'file',
          name: file.name,
          size: file.size,
          mimeType: file.type,
          tags: tags,
          chunksCount: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Dividir em chunks se necessário
        const chunks = [];
        for (let i = 0; i < base64String.length; i += UPLOAD_CHUNK_SIZE) {
          chunks.push(base64String.substring(i, i + UPLOAD_CHUNK_SIZE));
        }

        const batch = db.batch();
        chunks.forEach((chunk, idx) => {
          const chunkRef = db.collection('workspaces').doc(syncCode).collection('gallery').doc(docRef.id).collection('chunks').doc(String(idx));
          batch.set(chunkRef, { data: chunk });
        });
        batch.update(docRef, { chunksCount: chunks.length });
        await batch.commit();
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function abrirVisualizadorGaleria(item) {
    currentViewingItem = item;
    viewerTagsTemp = item.tags ? [...item.tags] : [];
    if (viewerTagInput) viewerTagInput.value = '';
    renderizarTagsViewer();

    if (item.type === 'file') {
      if (viewerImg) viewerImg.style.display = 'none';
      if (viewerFileBox) viewerFileBox.style.display = 'flex';
      if (viewerFileName) viewerFileName.textContent = item.name;
      if (viewerFileMeta) viewerFileMeta.textContent = formatarTamanho(item.size);
      if (viewerFileStatus) viewerFileStatus.textContent = '';

      const ext = (item.name.split('.').pop() || '').toLowerCase();
      let iconClass = 'fa-file';
      if (ext === 'pdf') iconClass = 'fa-file-pdf';
      else if (['doc', 'docx'].includes(ext)) iconClass = 'fa-file-word';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) iconClass = 'fa-file-excel';
      else if (['ppt', 'pptx'].includes(ext)) iconClass = 'fa-file-powerpoint';
      if (viewerFileIcon) viewerFileIcon.className = `fa-solid ${iconClass} ${ext === 'pdf' ? 'ext-pdf' : ''}`;
    } else {
      if (viewerFileBox) viewerFileBox.style.display = 'none';
      if (viewerImg) {
        viewerImg.style.display = 'block';
        viewerImg.src = item.dataUrl;
      }
    }

    if (modalGalleryView) modalGalleryView.style.display = 'flex';
  }

  function fecharVisualizadorGaleria() {
    if (modalGalleryView) modalGalleryView.style.display = 'none';
    currentViewingItem = null;
  }

  if (btnCloseGalleryView) btnCloseGalleryView.addEventListener('click', fecharVisualizadorGaleria);
  if (btnCloseGalleryViewFooter) btnCloseGalleryViewFooter.addEventListener('click', fecharVisualizadorGaleria);

  function renderizarTagsViewer() {
    if (!viewerTagList) return;
    viewerTagList.innerHTML = '';
    viewerTagsTemp.forEach((tag, idx) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escapeHtml(tag)} <button type="button" class="chip-x" data-index="${idx}">&times;</button>`;
      viewerTagList.appendChild(chip);
    });

    viewerTagList.querySelectorAll('.chip-x').forEach(btn => {
      btn.addEventListener('click', () => {
        viewerTagsTemp.splice(parseInt(btn.getAttribute('data-index')), 1);
        renderizarTagsViewer();
      });
    });
  }

  if (btnAddViewerTag && viewerTagInput) {
    btnAddViewerTag.addEventListener('click', adicionarTagViewer);
    viewerTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarTagViewer();
      }
    });
  }

  function adicionarTagViewer() {
    const val = viewerTagInput.value.trim();
    if (val && !viewerTagsTemp.includes(val)) {
      viewerTagsTemp.push(val);
      viewerTagInput.value = '';
      renderizarTagsViewer();
    }
  }

  if (btnSaveViewerTags) {
    btnSaveViewerTags.addEventListener('click', async () => {
      if (!currentViewingItem) return;
      try {
        await db.collection('workspaces').doc(syncCode).collection('gallery').doc(currentViewingItem.id).update({
          tags: viewerTagsTemp
        });
        currentViewingItem.tags = [...viewerTagsTemp];
        renderizarGaleria();
        fecharVisualizadorGaleria();
      } catch (err) {
        console.error('Erro ao atualizar tags:', err);
        alert('Erro ao salvar tags.');
      }
    });
  }

  if (btnDeleteImage) {
    btnDeleteImage.addEventListener('click', async () => {
      if (!currentViewingItem) return;
      if (confirm('Deseja realmente excluir este item da galeria?')) {
        try {
          await db.collection('workspaces').doc(syncCode).collection('gallery').doc(currentViewingItem.id).delete();
          fecharVisualizadorGaleria();
          renderizarGaleria();
        } catch (err) {
          console.error('Erro ao excluir item:', err);
          alert('Erro ao excluir item.');
        }
      }
    });
  }

  if (btnDownloadFile) {
    btnDownloadFile.addEventListener('click', async () => {
      if (!currentViewingItem || currentViewingItem.type !== 'file') return;
      if (viewerFileStatus) viewerFileStatus.textContent = 'Baixando arquivo...';

      try {
        const chunksSnap = await db.collection('workspaces').doc(syncCode).collection('gallery').doc(currentViewingItem.id).collection('chunks').orderBy('__name__').get();
        let base64 = '';
        chunksSnap.forEach(doc => {
          base64 += doc.data().data;
        });

        const a = document.createElement('a');
        a.href = base64;
        a.download = currentViewingItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (viewerFileStatus) viewerFileStatus.textContent = 'Download concluído!';
      } catch (err) {
        console.error('Erro ao baixar arquivo:', err);
        if (viewerFileStatus) viewerFileStatus.textContent = 'Erro ao baixar arquivo.';
      }
    });
  }


  // Disparar sincronização inicial
  if (!syncCode) {
    syncCode = 'jarvito-geral-2024';
    localStorage.setItem('jarvito_sync_code', syncCode);
  }
  iniciarSincronizacao();

});