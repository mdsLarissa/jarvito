/* ============================================================
   extras.js: Configurações (tema e cores) + Galeria com tags
   Precisa ser carregado DEPOIS do javao.js
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  /* ===================== CONFIGURAÇÕES ===================== */
  const THEME_KEY = 'jarvito_theme';
  const ACCENT_KEY = 'jarvito_accent';
  const THEME_COLORS = { dark: '#0d0614', light: '#f4f2fa' };
  const ACCENTS = ['roxo', 'azul', 'verde', 'laranja', 'rosa', 'dourado'];

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

  function aplicarAccent(nome) {
    if (!ACCENTS.includes(nome)) nome = 'roxo';
    root.setAttribute('data-accent', nome);
    try { localStorage.setItem(ACCENT_KEY, nome); } catch (e) {}
    document.querySelectorAll('.accent-swatch').forEach((b) => {
      b.classList.toggle('active', b.dataset.accent === nome);
    });
  }

  document.querySelectorAll('.theme-option').forEach((b) => {
    b.addEventListener('click', () => aplicarTema(b.dataset.theme));
  });
  document.querySelectorAll('.accent-swatch').forEach((b) => {
    b.addEventListener('click', () => aplicarAccent(b.dataset.accent));
  });

  const btnReset = $('btnResetTheme');
  if (btnReset) btnReset.addEventListener('click', () => { aplicarTema('dark'); aplicarAccent('roxo'); });

  const btnOpenSync = $('btnOpenSyncFromSettings');
  if (btnOpenSync) {
    btnOpenSync.addEventListener('click', () => {
      const btn = $('btnSyncSettings');
      if (btn) btn.click();
    });
  }

  let temaSalvo = 'dark';
  let accentSalvo = 'roxo';
  try {
    temaSalvo = localStorage.getItem(THEME_KEY) || 'dark';
    accentSalvo = localStorage.getItem(ACCENT_KEY) || 'roxo';
  } catch (e) {}
  aplicarTema(temaSalvo);
  aplicarAccent(accentSalvo);

  /* ======================== GALERIA ======================== */
  const getDb = () => firebase.firestore(); // só é chamado depois que o javao.js inicializa o Firebase

  let galleryCode = null;
  let galleryUnsub = null;
  let galleryItems = [];
  let activeFilter = null;
  let projectTitles = [];

  let pendingFiles = [];
  let pendingTags = [];
  let viewerId = null;
  let viewerTags = [];

  const gridEl = $('galleryGrid');
  const filtersEl = $('galleryTagFilters');
  const countEl = $('galleryCount');
  const datalistEl = $('galleryTagSuggestions');

  const modalUpload = $('modalGalleryUpload');
  const fileInput = $('galleryFileInput');
  const uploadDrop = $('uploadDrop');
  const uploadPreview = $('uploadPreview');
  const uploadTagInput = $('uploadTagInput');
  const uploadTagList = $('uploadTagList');
  const uploadStatus = $('uploadStatus');
  const btnSaveUpload = $('btnSaveGalleryUpload');

  const modalViewer = $('modalGalleryView');
  const viewerImg = $('viewerImg');
  const viewerTagList = $('viewerTagList');
  const viewerTagInput = $('viewerTagInput');

  const galleryCol = () => getDb().collection('workspaces').doc(galleryCode).collection('gallery');

  /* ---------- tags ---------- */
  function todasAsTags() {
    const mapa = new Map();
    galleryItems.forEach((item) => (item.tags || []).forEach((t) => {
      const k = t.toLowerCase();
      if (!mapa.has(k)) mapa.set(k, t);
    }));
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  function sugestoes() {
    const mapa = new Map();
    projectTitles.concat(todasAsTags()).forEach((t) => {
      const k = String(t).toLowerCase();
      if (k && !mapa.has(k)) mapa.set(k, t);
    });
    return [...mapa.values()];
  }

  function atualizarDatalist() {
    if (!datalistEl) return;
    datalistEl.innerHTML = '';
    sugestoes().forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      datalistEl.appendChild(o);
    });
  }

  function normalizarTag(texto) {
    const t = texto.replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const existente = sugestoes().find((s) => s.toLowerCase() === t.toLowerCase());
    return existente || t;
  }

  const temTag = (lista, tag) => lista.some((t) => t.toLowerCase() === tag.toLowerCase());

  function adicionarTagDoInput(inputEl, lista, aoMudar) {
    const t = normalizarTag(inputEl.value);
    if (t && !temTag(lista, t)) lista.push(t);
    inputEl.value = '';
    aoMudar();
  }

  function criarChip(texto, aoRemover) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.appendChild(document.createTextNode(texto));
    if (aoRemover) {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'chip-x';
      x.textContent = '×';
      x.title = 'Remover tag';
      x.addEventListener('click', aoRemover);
      chip.appendChild(x);
    }
    return chip;
  }

  function ligarCampoDeTag(inputEl, botaoEl, lista, aoMudar) {
    const adicionar = () => adicionarTagDoInput(inputEl, lista, aoMudar);
    botaoEl.addEventListener('click', adicionar);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); adicionar(); }
    });
    inputEl.addEventListener('input', () => {
      if (inputEl.value.includes(',')) {
        inputEl.value = inputEl.value.replace(/,/g, '');
        adicionar();
      }
    });
  }

  /* ---------- renderização da grade ---------- */
  function mensagem(texto) {
    const div = document.createElement('div');
    div.className = 'gallery-empty';
    div.textContent = texto;
    return div;
  }

  function renderFiltros() {
    filtersEl.innerHTML = '';
    const tags = todasAsTags();
    if (!tags.length) return;

    const todas = document.createElement('button');
    todas.type = 'button';
    todas.className = 'tag-chip' + (activeFilter ? '' : ' active');
    todas.textContent = 'Todas (' + galleryItems.length + ')';
    todas.addEventListener('click', () => { activeFilter = null; renderGaleria(); });
    filtersEl.appendChild(todas);

    tags.forEach((tag) => {
      const n = galleryItems.filter((i) => temTag(i.tags || [], tag)).length;
      const b = document.createElement('button');
      b.type = 'button';
      const ativo = activeFilter && activeFilter.toLowerCase() === tag.toLowerCase();
      b.className = 'tag-chip' + (ativo ? ' active' : '');
      b.textContent = tag + ' (' + n + ')';
      b.addEventListener('click', () => { activeFilter = tag; renderGaleria(); });
      filtersEl.appendChild(b);
    });
  }

  function renderGaleria() {
    gridEl.innerHTML = '';
    if (!galleryCode) {
      filtersEl.innerHTML = '';
      countEl.textContent = '';
      gridEl.appendChild(mensagem('Conecte o código de sincronização para usar a galeria.'));
      return;
    }

    atualizarDatalist();
    if (activeFilter && !todasAsTags().some((t) => t.toLowerCase() === activeFilter.toLowerCase())) {
      activeFilter = null;
    }
    renderFiltros();

    const itens = activeFilter ? galleryItems.filter((i) => temTag(i.tags || [], activeFilter)) : galleryItems;
    countEl.textContent = itens.length + (itens.length === 1 ? ' imagem' : ' imagens');

    if (!itens.length) {
      gridEl.appendChild(mensagem(activeFilter ? 'Nenhuma imagem com essa tag.' : 'Nenhuma imagem ainda. Clique em "Adicionar imagens".'));
      return;
    }

    itens.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'gallery-item';

      const img = document.createElement('img');
      img.src = item.thumb || item.data;
      img.alt = item.name || 'Imagem';
      img.loading = 'lazy';
      img.decoding = 'async';
      card.appendChild(img);

      if ((item.tags || []).length) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'gallery-item-tags';
        item.tags.slice(0, 3).forEach((t) => {
          const s = document.createElement('span');
          s.textContent = t;
          tagsDiv.appendChild(s);
        });
        card.appendChild(tagsDiv);
      }

      card.addEventListener('click', () => abrirViewer(item.id));
      gridEl.appendChild(card);
    });
  }

  /* ---------- sincronização com o Firestore ---------- */
  function iniciarGaleria(code) {
    if (galleryUnsub) galleryUnsub();
    galleryCode = code;
    galleryItems = [];
    activeFilter = null;
    renderGaleria();

    galleryUnsub = galleryCol().orderBy('createdAt', 'desc').onSnapshot((snap) => {
      galleryItems = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
      renderGaleria();
    }, (err) => {
      console.error('Erro ao carregar a galeria:', err);
      gridEl.innerHTML = '';
      gridEl.appendChild(mensagem(err.code === 'permission-denied'
        ? 'Sem permissão para ler a galeria. Atualize as regras do Firestore.'
        : 'Não foi possível carregar a galeria. Verifique sua conexão.'));
    });
  }

  window.addEventListener('jarvito:syncstart', (e) => iniciarGaleria(e.detail.code));
  window.addEventListener('jarvito:projects', (e) => {
    projectTitles = (e.detail && e.detail.titles) || [];
    atualizarDatalist();
  });

  /* ---------- processamento das imagens ---------- */
  function redimensionar(file, maxLado, qualidade) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível ler "' + file.name + '".'));
      };
      img.src = url;
    });
  }

  async function prepararImagem(file) {
    const tentativas = [[1280, 0.72], [1024, 0.6], [800, 0.5]];
    let data = '';
    for (const [lado, qualidade] of tentativas) {
      data = await redimensionar(file, lado, qualidade);
      if (data.length < 850000) break;
    }
    if (data.length >= 850000) {
      throw new Error('A imagem "' + file.name + '" ficou grande demais mesmo comprimida.');
    }
    const thumb = await redimensionar(file, 360, 0.6);
    return { data, thumb };
  }

  /* ---------- modal de upload ---------- */
  function renderPreview() {
    uploadPreview.innerHTML = '';
    pendingFiles.forEach((f) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(url);
      img.src = url;
      uploadPreview.appendChild(img);
    });
  }

  function renderUploadTags() {
    uploadTagList.innerHTML = '';
    pendingTags.forEach((t, i) => {
      uploadTagList.appendChild(criarChip(t, () => { pendingTags.splice(i, 1); renderUploadTags(); }));
    });
  }

  function adicionarArquivos(lista) {
    Array.from(lista).filter((f) => f.type.startsWith('image/')).forEach((f) => pendingFiles.push(f));
    renderPreview();
  }

  function abrirUpload() {
    if (!galleryCode) {
      alert('Conecte o código de sincronização antes de usar a galeria.');
      return;
    }
    pendingFiles = [];
    pendingTags = [];
    uploadTagInput.value = '';
    uploadStatus.textContent = '';
    fileInput.value = '';
    renderPreview();
    renderUploadTags();
    modalUpload.style.display = 'flex';
  }

  function fecharUpload() { modalUpload.style.display = 'none'; }

  async function salvarUpload() {
    adicionarTagDoInput(uploadTagInput, pendingTags, renderUploadTags);
    if (!pendingFiles.length) {
      alert('Escolha pelo menos uma imagem.');
      return;
    }

    btnSaveUpload.disabled = true;
    const total = pendingFiles.length;
    let enviadas = 0;
    try {
      for (let i = 0; i < total; i++) {
        uploadStatus.textContent = 'Enviando ' + (i + 1) + ' de ' + total + '...';
        const f = pendingFiles[i];
        const prep = await prepararImagem(f);
        await galleryCol().add({
          data: prep.data,
          thumb: prep.thumb,
          tags: pendingTags.slice(),
          name: f.name,
          createdAt: Date.now() + i
        });
        enviadas++;
      }
      fecharUpload();
    } catch (err) {
      console.error('Erro no upload:', err);
      pendingFiles.splice(0, enviadas);
      renderPreview();
      uploadStatus.textContent = err.code === 'permission-denied'
        ? 'Sem permissão no Firestore. Atualize as regras de segurança.'
        : 'Erro ao enviar: ' + err.message;
    } finally {
      btnSaveUpload.disabled = false;
    }
  }

  $('btnOpenGalleryUpload').addEventListener('click', abrirUpload);
  $('btnCloseGalleryUpload').addEventListener('click', fecharUpload);
  $('btnCancelGalleryUpload').addEventListener('click', fecharUpload);
  btnSaveUpload.addEventListener('click', salvarUpload);

  uploadDrop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { adicionarArquivos(fileInput.files); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => uploadDrop.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadDrop.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((ev) => uploadDrop.addEventListener(ev, (e) => {
    e.preventDefault();
    uploadDrop.classList.remove('dragover');
  }));
  uploadDrop.addEventListener('drop', (e) => adicionarArquivos(e.dataTransfer.files));

  ligarCampoDeTag(uploadTagInput, $('btnAddUploadTag'), pendingTags, renderUploadTags);

  /* ---------- visualizador ---------- */
  function renderViewerTags() {
    viewerTagList.innerHTML = '';
    viewerTags.forEach((t, i) => {
      viewerTagList.appendChild(criarChip(t, () => { viewerTags.splice(i, 1); renderViewerTags(); }));
    });
  }

  function abrirViewer(id) {
    const item = galleryItems.find((i) => i.id === id);
    if (!item) return;
    viewerId = id;
    viewerTags = (item.tags || []).slice();
    viewerImg.src = item.data;
    viewerTagInput.value = '';
    renderViewerTags();
    modalViewer.style.display = 'flex';
  }

  function fecharViewer() {
    modalViewer.style.display = 'none';
    viewerImg.removeAttribute('src');
    viewerId = null;
  }

  async function salvarTagsDoViewer() {
    if (!viewerId) return;
    adicionarTagDoInput(viewerTagInput, viewerTags, renderViewerTags);
    try {
      await galleryCol().doc(viewerId).update({ tags: viewerTags });
      fecharViewer();
    } catch (err) {
      console.error('Erro ao salvar tags:', err);
      alert('Não foi possível salvar as tags.');
    }
  }

  async function excluirImagem() {
    if (!viewerId) return;
    if (!confirm('Excluir esta imagem? Essa ação não pode ser desfeita.')) return;
    try {
      await galleryCol().doc(viewerId).delete();
      fecharViewer();
    } catch (err) {
      console.error('Erro ao excluir imagem:', err);
      alert('Não foi possível excluir a imagem.');
    }
  }

  $('btnCloseGalleryView').addEventListener('click', fecharViewer);
  $('btnCloseGalleryViewFooter').addEventListener('click', fecharViewer);
  $('btnSaveViewerTags').addEventListener('click', salvarTagsDoViewer);
  $('btnDeleteImage').addEventListener('click', excluirImagem);
  ligarCampoDeTag(viewerTagInput, $('btnAddViewerTag'), viewerTags, renderViewerTags);

  renderGaleria();
})();