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

  // ===== CONFIGURAÇÃO DO FIREBASE (SINCRONIZAÇÃO ENTRE DISPOSITIVOS) =====
  const firebaseConfig = {
    apiKey: "AIzaSyCIvo6lPGMl-mbA3xfHJnMwuhEuy9xOLk0",
    authDomain: "jarvito-b4529.firebaseapp.com",
    projectId: "jarvito-b4529",
    storageBucket: "jarvito-b4529.firebasestorage.app",
    messagingSenderId: "282091474872",
    appId: "1:282091474872:web:fd17012475547f543ec94d"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  let syncCode = localStorage.getItem('jarvito_sync_code') || null;
  let unsubscribeSnapshot = null;
  let isApplyingRemoteData = false;
  let notesSaveTimeout = null;

  let projectsData = [];
  let notesData = '';
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
      notes: '',
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
      alert('Não foi possível salvar suas alterações. Verifique sua conexão e o código de sincronização.');
    }
  }

  function iniciarSincronizacao() {
    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = getDocRef().onSnapshot((doc) => {
      isApplyingRemoteData = true;

      if (doc.exists) {
        const data = doc.data();
        projectsData = data.projects || [];
        notesData = data.notes || '';
        hotIdeasData = data.hotIdeas || [];
        calendarEventsData = data.calendarEvents || {};
      } else {
        const padrao = dadosPadrao();
        projectsData = padrao.projects;
        notesData = padrao.notes;
        hotIdeasData = padrao.hotIdeas;
        calendarEventsData = padrao.calendarEvents;
        getDocRef().set(padrao);
      }

      renderizarTudoAposSync();
      isApplyingRemoteData = false;
    }, (err) => {
      console.error('Erro na sincronização com o Firestore:', err);
      alert('Não foi possível conectar à sincronização. Verifique sua conexão com a internet.');
    });
  }

  function renderizarTudoAposSync() {
    if (mainNotesTextarea) mainNotesTextarea.value = notesData;
    renderizarProjetos();
    renderizarCalendario();
    renderizarHotIdeas();
  }

  const mainNotesTextarea = document.querySelector('.notes-textarea');
  if (mainNotesTextarea) {
    mainNotesTextarea.addEventListener('input', () => {
      notesData = mainNotesTextarea.value;
      clearTimeout(notesSaveTimeout);
      notesSaveTimeout = setTimeout(salvarTudo, 500);
    });
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

  const hotIdeasHistoryList = document.getElementById('hotIdeasHistoryList');

  function renderizarHotIdeas() {
    if (!hotIdeasHistoryList) return;
    hotIdeasHistoryList.innerHTML = '';

    if (hotIdeasData.length === 0) {
      hotIdeasHistoryList.innerHTML = '<span style="color: #a78bfa; font-size: 13px;">Nenhuma ideia registrada ainda.</span>';
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
        <div class="hot-idea-body">${item.text}</div>
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

  const projectsList = document.querySelector('.projects-list');
  const completedProjectsList = document.querySelector('.completed-projects-list');

  function criarCardProjetoHTML(project, pIndex) {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.completed).length;
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const openTasks = totalTasks - completedTasks;

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
      tasksHTML += `
        <div class="task-item" data-task-index="${tIndex}">
          <div class="task-delete-selector" style="display: none;">
            <input type="checkbox" class="task-delete-checkbox">
          </div>
          <span class="task-title" title="Clique para editar">${task.text}</span>
          <span class="task-priority priority-${task.priority}" data-priority="${task.priority}">(Nível ${task.priority} de Prioridade!)</span>
          <button class="btn-edit-task" title="Editar Tarefa"><i class="fa-solid fa-pen"></i></button>
          <input type="checkbox" class="custom-checkbox" ${task.completed ? 'checked' : ''}>
        </div>
      `;
    });

    return `
      <div class="project-card" data-project-index="${pIndex}">
        <div class="project-delete-selector" style="display: none;">
          <input type="checkbox" class="card-delete-checkbox">
          <span>Selecionar para excluir projeto</span>
        </div>
        <div class="project-header">
          <h2 class="project-title-editable" title="Clique para editar o nome">${project.title}</h2>
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
        <div class="project-details" style="display: none;">
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
      completedProjectsList.innerHTML = '<span style="color: #a78bfa; font-size: 14px;">Nenhum projeto concluído no momento.</span>';
    }
  }

  function alternarExpansaoProjeto(cardAtivo) {
    const detailsActive = cardAtivo.querySelector('.project-details');
    const estaAberto = detailsActive && detailsActive.style.display === 'block';

    const allCards = document.querySelectorAll('.project-card');
    allCards.forEach(card => {
      card.classList.remove('expanded');
      const details = card.querySelector('.project-details');
      if (details) details.style.display = 'none';
    });

    if (!estaAberto) {
      cardAtivo.classList.add('expanded');
      if (detailsActive) detailsActive.style.display = 'block';
    }
  }

  const btnAddProject = document.querySelector('.btn-add');
  const modalNewProject = document.getElementById('modalNewProject');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveModalProject = document.getElementById('btnSaveModalProject');
  const btnAddModalTask = document.getElementById('btnAddModalTask');

  const modalProjectName = document.getElementById('modalProjectName');
  const modalTaskName = document.getElementById('modalTaskName');
  const modalTaskPriority = document.getElementById('modalTaskPriority');
  const modalTaskList = document.getElementById('modalTaskList');

  let tempModalTasks = [];

  function abrirModalProjeto() {
    tempModalTasks = [];
    if (modalProjectName) modalProjectName.value = '';
    if (modalTaskName) modalTaskName.value = '';
    if (modalTaskList) modalTaskList.innerHTML = '';
    if (modalNewProject) modalNewProject.style.display = 'flex';
  }

  function fecharModalProjeto() {
    if (modalNewProject) modalNewProject.style.display = 'none';
  }

  if (btnAddProject) btnAddProject.addEventListener('click', abrirModalProjeto);
  if (btnCloseModal) btnCloseModal.addEventListener('click', fecharModalProjeto);
  if (btnCancelModal) btnCancelModal.addEventListener('click', fecharModalProjeto);

  if (btnAddModalTask) {
    btnAddModalTask.addEventListener('click', () => {
      const taskText = modalTaskName.value.trim();
      const priority = modalTaskPriority.value;

      if (!taskText) {
        alert('Digite o nome da tarefa!');
        return;
      }

      tempModalTasks.push({ text: taskText, priority: parseInt(priority), completed: false });

      const itemDiv = document.createElement('div');
      itemDiv.classList.add('modal-task-item');
      itemDiv.innerHTML = `
        <span>${taskText}</span>
        <span style="color: #a78bfa;">Prioridade ${priority}</span>
      `;
      modalTaskList.appendChild(itemDiv);
      modalTaskName.value = '';
    });
  }

  if (btnSaveModalProject) {
    btnSaveModalProject.addEventListener('click', () => {
      const projectName = modalProjectName.value.trim();
      if (!projectName) {
        alert('Digite o nome do projeto!');
        return;
      }

      const newProj = {
        id: Date.now(),
        title: projectName.toUpperCase(),
        tasks: tempModalTasks
      };

      projectsData.push(newProj);
      salvarTudo();
      renderizarProjetos();
      fecharModalProjeto();
    });
  }

  const btnDeleteProject = document.querySelector('.btn-delete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  const btnCancelDelete = document.getElementById('btnCancelDelete');

  function alternarModoDelecaoProjetos(ativo) {
    const selectors = document.querySelectorAll('.project-delete-selector');
    selectors.forEach(s => {
      s.style.display = ativo ? 'flex' : 'none';
      const checkbox = s.querySelector('.card-delete-checkbox');
      if (checkbox) checkbox.checked = false;
    });

    if (btnConfirmDelete) btnConfirmDelete.style.display = ativo ? 'inline-flex' : 'none';
    if (btnCancelDelete) btnCancelDelete.style.display = ativo ? 'inline-flex' : 'none';
  }

  if (btnDeleteProject) btnDeleteProject.addEventListener('click', () => alternarModoDelecaoProjetos(true));
  if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => alternarModoDelecaoProjetos(false));

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      const selectedCheckboxes = document.querySelectorAll('.card-delete-checkbox:checked');
      if (selectedCheckboxes.length === 0) {
        alert('Selecione pelo menos um projeto para excluir!');
        return;
      }

      if (confirm(`Excluir ${selectedCheckboxes.length} projeto(s) selecionado(s)?`)) {
        const indexesToRemove = [];
        selectedCheckboxes.forEach(chk => {
          const card = chk.closest('.project-card');
          if (card) {
            const index = parseInt(card.getAttribute('data-project-index'));
            indexesToRemove.push(index);
          }
        });

        projectsData = projectsData.filter((_, idx) => !indexesToRemove.includes(idx));
        salvarTudo();
        renderizarProjetos();
        alternarModoDelecaoProjetos(false);
      }
    });
  }

  const modalEditTask = document.getElementById('modalEditTask');
  const editModalTaskName = document.getElementById('editModalTaskName');
  const editModalTaskPriority = document.getElementById('editModalTaskPriority');
  const btnCloseEditTaskModal = document.getElementById('btnCloseEditTaskModal');
  const btnCancelEditTaskModal = document.getElementById('btnCancelEditTaskModal');
  const btnSaveEditTaskModal = document.getElementById('btnSaveEditTaskModal');

  let activeProjectIndex = null;
  let activeTaskIndex = null;

  function abrirModalEditarTask(pIdx, tIdx) {
    activeProjectIndex = pIdx;
    activeTaskIndex = tIdx;

    const taskObj = projectsData[pIdx].tasks[tIdx];
    if (editModalTaskName) editModalTaskName.value = taskObj.text;
    if (editModalTaskPriority) editModalTaskPriority.value = taskObj.priority;

    if (modalEditTask) modalEditTask.style.display = 'flex';
  }

  function fecharModalEditarTask() {
    if (modalEditTask) modalEditTask.style.display = 'none';
    activeProjectIndex = null;
    activeTaskIndex = null;
  }

  if (btnCloseEditTaskModal) btnCloseEditTaskModal.addEventListener('click', fecharModalEditarTask);
  if (btnCancelEditTaskModal) btnCancelEditTaskModal.addEventListener('click', fecharModalEditarTask);

  if (btnSaveEditTaskModal) {
    btnSaveEditTaskModal.addEventListener('click', () => {
      if (activeProjectIndex === null || activeTaskIndex === null) return;

      const newName = editModalTaskName.value.trim();
      const newPriority = editModalTaskPriority.value;

      if (!newName) {
        alert('O nome da tarefa não pode estar vazio!');
        return;
      }

      projectsData[activeProjectIndex].tasks[activeTaskIndex].text = newName;
      projectsData[activeProjectIndex].tasks[activeTaskIndex].priority = parseInt(newPriority);

      salvarTudo();
      renderizarProjetos();
      fecharModalEditarTask();
    });
  }

  function tratarAcoesDoCard(e) {
    const card = e.target.closest('.project-card');
    if (!card) return;

    const pIndex = parseInt(card.getAttribute('data-project-index'));

    if (e.target.classList.contains('project-title-editable')) {
      const titleElement = e.target;
      const currentTitle = projectsData[pIndex].title;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.classList.add('title-input-inline');

      titleElement.replaceWith(input);
      input.focus();

      function salvarNovoTitulo() {
        const novoTexto = input.value.trim().toUpperCase() || currentTitle;
        projectsData[pIndex].title = novoTexto;
        salvarTudo();
        renderizarProjetos();
      }

      input.addEventListener('blur', salvarNovoTitulo);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') salvarNovoTitulo();
      });
      return;
    }

    const btnEditTask = e.target.closest('.btn-edit-task');
    if (btnEditTask || e.target.classList.contains('task-title')) {
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        const tIndex = parseInt(taskItem.getAttribute('data-task-index'));
        abrirModalEditarTask(pIndex, tIndex);
        return;
      }
    }

    if (e.target.closest('.project-header') || e.target.classList.contains('progress-bar-container')) {
      alternarExpansaoProjeto(card);
      return;
    }

    const btnTarget = e.target.closest('button');
    if (!btnTarget) return;

    const inlineForm = card.querySelector('.inline-task-form');
    const btnConfirmTaskDel = card.querySelector('.btn-confirm-task-delete');
    const btnCancelTaskDel = card.querySelector('.btn-cancel-task-delete');

    if (btnTarget.classList.contains('btn-add-task')) {
      if (inlineForm) {
        inlineForm.style.display = 'flex';
        const inputName = inlineForm.querySelector('.input-task-name');
        if (inputName) inputName.focus();
      }
    }

    if (btnTarget.classList.contains('btn-save-task')) {
      const inputName = inlineForm.querySelector('.input-task-name');
      const selectPriority = inlineForm.querySelector('.select-task-priority');

      const taskText = inputName.value.trim();
      const priority = selectPriority.value;

      if (!taskText) {
        alert('Digite o nome da tarefa!');
        return;
      }

      projectsData[pIndex].tasks.push({
        text: taskText,
        priority: parseInt(priority),
        completed: false
      });

      salvarTudo();
      renderizarProjetos();
    }

    if (btnTarget.classList.contains('btn-cancel-task')) {
      if (inlineForm) inlineForm.style.display = 'none';
    }

    if (btnTarget.classList.contains('btn-remove-task')) {
      if (projectsData[pIndex].tasks.length === 0) {
        alert('Nenhuma tarefa para remover neste projeto.');
        return;
      }

      card.querySelectorAll('.task-delete-selector').forEach(sel => sel.style.display = 'flex');
      if (btnConfirmTaskDel) btnConfirmTaskDel.style.display = 'inline-flex';
      if (btnCancelTaskDel) btnCancelTaskDel.style.display = 'inline-flex';
    }

    if (btnTarget.classList.contains('btn-confirm-task-delete')) {
      const checkedCheckboxes = card.querySelectorAll('.task-delete-checkbox:checked');
      if (checkedCheckboxes.length === 0) {
        alert('Selecione ao menos uma tarefa para remover!');
        return;
      }

      const taskIndexesToRemove = [];
      checkedCheckboxes.forEach(chk => {
        const item = chk.closest('.task-item');
        if (item) {
          const idx = parseInt(item.getAttribute('data-task-index'));
          taskIndexesToRemove.push(idx);
        }
      });

      projectsData[pIndex].tasks = projectsData[pIndex].tasks.filter((_, idx) => !taskIndexesToRemove.includes(idx));
      salvarTudo();
      renderizarProjetos();
    }

    if (btnTarget.classList.contains('btn-cancel-task-delete')) {
      card.querySelectorAll('.task-delete-selector').forEach(sel => {
        sel.style.display = 'none';
        const chk = sel.querySelector('.task-delete-checkbox');
        if (chk) chk.checked = false;
      });

      if (btnConfirmTaskDel) btnConfirmTaskDel.style.display = 'none';
      if (btnCancelTaskDel) btnCancelTaskDel.style.display = 'none';
    }
  }

  function tratarMudancaCheckbox(e) {
    if (e.target.classList.contains('custom-checkbox')) {
      const card = e.target.closest('.project-card');
      const taskItem = e.target.closest('.task-item');
      if (card && taskItem) {
        const pIndex = parseInt(card.getAttribute('data-project-index'));
        const tIndex = parseInt(taskItem.getAttribute('data-task-index'));

        projectsData[pIndex].tasks[tIndex].completed = e.target.checked;
        salvarTudo();
        renderizarProjetos();
      }
    }
  }

  if (projectsList) {
    projectsList.addEventListener('click', tratarAcoesDoCard);
    projectsList.addEventListener('change', tratarMudancaCheckbox);
  }

  if (completedProjectsList) {
    completedProjectsList.addEventListener('click', tratarAcoesDoCard);
    completedProjectsList.addEventListener('change', tratarMudancaCheckbox);
  }

  let currentCalendarDate = new Date();
  let selectedDateKey = null;

  const calendarMonthYear = document.getElementById('calendarMonthYear');
  const calendarDaysGrid = document.getElementById('calendarDaysGrid');
  const btnPrevMonth = document.getElementById('btnPrevMonth');
  const btnNextMonth = document.getElementById('btnNextMonth');

  const modalCalendarEvent = document.getElementById('modalCalendarEvent');
  const calendarModalTitle = document.getElementById('calendarModalTitle');
  const calendarEventInput = document.getElementById('calendarEventInput');
  const btnAddCalendarEvent = document.getElementById('btnAddCalendarEvent');
  const calendarEventsList = document.getElementById('calendarEventsList');
  const btnCloseCalendarModal = document.getElementById('btnCloseCalendarModal');
  const btnCloseCalendarModalFooter = document.getElementById('btnCloseCalendarModalFooter');

  function fecharModalCalendario() {
    if (modalCalendarEvent) modalCalendarEvent.style.display = 'none';
    selectedDateKey = null;
  }

  if (btnCloseCalendarModal) btnCloseCalendarModal.addEventListener('click', fecharModalCalendario);
  if (btnCloseCalendarModalFooter) btnCloseCalendarModalFooter.addEventListener('click', fecharModalCalendario);

  function abrirModalDiaCalendario(dateKey, dia, mesNome, ano) {
    selectedDateKey = dateKey;
    if (calendarModalTitle) calendarModalTitle.textContent = `Eventos de ${dia} de ${mesNome}`;
    if (calendarEventInput) calendarEventInput.value = '';

    renderizarListaEventosModal();
    if (modalCalendarEvent) modalCalendarEvent.style.display = 'flex';
  }

  function renderizarListaEventosModal() {
    if (!calendarEventsList || !selectedDateKey) return;
    calendarEventsList.innerHTML = '';

    const eventos = calendarEventsData[selectedDateKey] || [];
    if (eventos.length === 0) {
      calendarEventsList.innerHTML = '<span style="color: #a78bfa; font-size: 13px;">Nenhum evento neste dia.</span>';
      return;
    }

    eventos.forEach((ev, idx) => {
      const div = document.createElement('div');
      div.classList.add('modal-task-item');
      div.innerHTML = `
        <span>${ev}</span>
        <button class="btn-delete-event" data-index="${idx}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      `;
      calendarEventsList.appendChild(div);
    });

    calendarEventsList.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'));
        calendarEventsData[selectedDateKey].splice(index, 1);
        if (calendarEventsData[selectedDateKey].length === 0) {
          delete calendarEventsData[selectedDateKey];
        }
        salvarTudo();
        renderizarListaEventosModal();
        renderizarCalendario();
      });
    });
  }

  if (btnAddCalendarEvent) {
    btnAddCalendarEvent.addEventListener('click', () => {
      const texto = calendarEventInput.value.trim();
      if (!texto) {
        alert('Digite uma descrição para o evento/prazo!');
        return;
      }

      if (!calendarEventsData[selectedDateKey]) {
        calendarEventsData[selectedDateKey] = [];
      }

      calendarEventsData[selectedDateKey].push(texto);
      calendarEventInput.value = '';

      salvarTudo();
      renderizarListaEventosModal();
      renderizarCalendario();
    });
  }

  function renderizarCalendario() {
    if (!calendarDaysGrid || !calendarMonthYear) return;

    const ano = currentCalendarDate.getFullYear();
    const mes = currentCalendarDate.getMonth();

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    const nomeMes = currentCalendarDate.toLocaleString('pt-BR', { month: 'long' });
    calendarMonthYear.textContent = `${nomeMes} de ${ano}`;

    calendarDaysGrid.innerHTML = '';

    for (let i = 0; i < primeiroDiaSemana; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('calendar-day-cell', 'empty');
      calendarDaysGrid.appendChild(emptyCell);
    }

    const hoje = new Date();
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const dayCell = document.createElement('div');
      dayCell.classList.add('calendar-day-cell');

      const mesFormatado = String(mes + 1).padStart(2, '0');
      const diaFormatado = String(dia).padStart(2, '0');
      const dateKey = `${ano}-${mesFormatado}-${diaFormatado}`;

      if (
        dia === hoje.getDate() &&
        mes === hoje.getMonth() &&
        ano === hoje.getFullYear()
      ) {
        dayCell.classList.add('today');
      }

      let badgesHTML = '';
      const eventosDoDia = calendarEventsData[dateKey] || [];
      if (eventosDoDia.length > 0) {
        badgesHTML += '<div class="calendar-events-container">';
        eventosDoDia.forEach(ev => {
          badgesHTML += `<div class="calendar-event-badge" title="${ev}">${ev}</div>`;
        });
        badgesHTML += '</div>';
      }

      dayCell.innerHTML = `
        <span class="calendar-day-number">${dia}</span>
        ${badgesHTML}
      `;

      dayCell.addEventListener('click', () => {
        abrirModalDiaCalendario(dateKey, dia, nomeMes, ano);
      });

      calendarDaysGrid.appendChild(dayCell);
    }
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

  if (syncCode) {
    iniciarSincronizacao();
  } else {
    abrirModalSyncCode(false);
  }

});