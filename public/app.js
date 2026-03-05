const API_BASE = '/api/applications';
const DEFAULT_STAGES = ['投递', 'HR 面试', '技术面试', '终面', 'Offer'];

const elements = {
  mainContent: document.getElementById('mainContent'),
  list: document.getElementById('applicationList'),
  emptyState: document.getElementById('emptyState'),
  activeCount: document.getElementById('activeCount'),
  latestUpdate: document.getElementById('latestUpdate'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailCompany: document.getElementById('detailCompany'),
  detailPosition: document.getElementById('detailTitle'),
  detailStatus: document.getElementById('detailStatus'),
  detailApplied: document.getElementById('detailApplied'),
  detailJobType: document.getElementById('detailJobType'),
  detailLocation: document.getElementById('detailLocation'),
  detailContact: document.getElementById('detailContact'),
  detailSalary: document.getElementById('detailSalary'),
  detailUpdated: document.getElementById('detailUpdated'),
  detailCreated: document.getElementById('detailCreated'),
  detailNotes: document.getElementById('detailNotes'),
  stageFlow: document.getElementById('stageFlow'),
  stageStepTemplate: document.getElementById('stageStepTemplate'),
  formModal: document.getElementById('formModal'),
  form: document.getElementById('applicationForm'),
  formTitle: document.getElementById('formTitle'),
  formSubtitle: document.getElementById('formSubtitle'),
  inputs: {
    company: document.getElementById('companyInput'),
    position: document.getElementById('positionInput'),
    location: document.getElementById('locationInput'),
    jobType: document.getElementById('jobTypeInput'),
    appliedDate: document.getElementById('appliedDateInput'),
    status: document.getElementById('statusInput'),
    contact: document.getElementById('contactInput'),
    salary: document.getElementById('salaryInput'),
    stages: document.getElementById('stagesInput'),
    currentStage: document.getElementById('currentStageSelect'),
    notes: document.getElementById('notesInput')
  },
  createButton: document.getElementById('createButton'),
  refreshButton: document.getElementById('refreshButton'),
  closeDetail: document.getElementById('closeDetail'),
  editButton: document.getElementById('editButton'),
  deleteButton: document.getElementById('deleteButton'),
  closeForm: document.getElementById('closeForm'),
  cancelForm: document.getElementById('cancelForm')
};

const state = {
  applications: [],
  currentDetailId: null,
  formMode: 'create',
  editingId: null
};

const markdownRenderer = createMarkdownRenderer();

initialize();

function initialize() {
  bindEventListeners();
  hydrateStageSelect(DEFAULT_STAGES, 0);
  fetchApplications();
}

function createMarkdownRenderer() {
  const globalMarked = typeof window !== 'undefined' ? window.marked : undefined;

  if (globalMarked && typeof globalMarked.setOptions === 'function') {
    globalMarked.setOptions({
      breaks: true,
      gfm: true
    });
    return {
      parse(value = '') {
        return globalMarked.parse(value ?? '');
      }
    };
  }

  console.warn('Markdown 渲染库加载失败，已回退为纯文本模式。');
  return {
    parse(value = '') {
      const safe = escapeHtml(String(value ?? ''));
      return safe.replace(/\r?\n/g, '<br>');
    }
  };
}

function bindEventListeners() {
  elements.createButton.addEventListener('click', () => openForm('create'));
  elements.refreshButton.addEventListener('click', async () => {
    toggleButtonLoading(elements.refreshButton, true);
    await fetchApplications();
    toggleButtonLoading(elements.refreshButton, false);
  });

  elements.closeDetail.addEventListener('click', () => closeDetail());
  elements.detailOverlay.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'true') {
      closeDetail();
    }
  });

  elements.editButton.addEventListener('click', () => {
    const target = state.applications.find((item) => item.id === state.currentDetailId);
    if (!target) return;
    closeDetail(true);
    openForm('edit', target);
  });

  elements.deleteButton.addEventListener('click', async () => {
    const target = state.applications.find((item) => item.id === state.currentDetailId);
    if (!target) return;
    const shouldDelete = window.confirm(`确认删除「${target.company} · ${target.position}」的记录吗？`);
    if (!shouldDelete) return;
    try {
      await request(`${API_BASE}/${target.id}`, { method: 'DELETE' });
      state.applications = state.applications.filter((item) => item.id !== target.id);
      closeDetail();
      renderList();
      updateDashboard();
    } catch (error) {
      showError(error.message);
    }
  });

  elements.closeForm.addEventListener('click', () => closeForm());
  elements.cancelForm.addEventListener('click', () => closeForm());
  elements.formModal.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'true') {
      closeForm();
    }
  });

  elements.inputs.stages.addEventListener('input', () => {
    const stages = parseStagesInput(elements.inputs.stages.value);
    const selected = Math.min(Number(elements.inputs.currentStage.value) || 0, stages.length - 1);
    hydrateStageSelect(stages, selected);
  });

  elements.form.addEventListener('submit', handleFormSubmit);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (elements.formModal.classList.contains('active')) {
        closeForm();
      } else if (elements.detailOverlay.classList.contains('active')) {
        closeDetail();
      }
    }
  });
}

async function fetchApplications() {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error('无法加载投递记录');
    }
    const data = await response.json();
    state.applications = Array.isArray(data) ? data : [];
    renderList();
    updateDashboard();
  } catch (error) {
    showError(error.message);
  }
}

function renderList() {
  elements.list.innerHTML = '';

  if (!state.applications.length) {
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');

  const fragment = document.createDocumentFragment();

  state.applications
    .slice()
    .sort(sortByUpdatedAt)
    .forEach((application, index) => {
      const card = createApplicationCard(application, index);
      fragment.appendChild(card);
    });

  elements.list.appendChild(fragment);
}

function sortByUpdatedAt(a, b) {
  const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return timeB - timeA;
}

function createApplicationCard(application, index) {
  const card = document.createElement('article');
  card.className = 'application-card';
  card.style.animationDelay = `${index * 70}ms`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = getInitials(application.company);

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = `${application.company} · ${application.position}`;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  meta.textContent = buildCardMeta(application);

  const chip = document.createElement('span');
  chip.className = 'stage-chip';
  chip.textContent = getCurrentStageName(application);

  info.appendChild(title);
  info.appendChild(meta);

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(chip);

  card.addEventListener('click', () => openDetail(application.id));

  return card;
}

function buildCardMeta(application) {
  const pieces = [];
  if (application.location) {
    pieces.push(application.location);
  }
  if (application.status) {
    pieces.push(application.status);
  }
  const dateText = formatDate(application.appliedDate);
  if (dateText) {
    pieces.push(`投递于 ${dateText}`);
  }
  return pieces.join(' · ');
}

function getInitials(text) {
  if (!text) return '??';
  const normalized = text.trim();
  if (normalized.length <= 2) return normalized;
  return normalized.slice(0, 2).toUpperCase();
}

function getCurrentStageName(application) {
  if (!Array.isArray(application.stages) || !application.stages.length) {
    return '未开始';
  }
  const index = Math.min(
    Math.max(Number(application.currentStage) || 0, 0),
    application.stages.length - 1
  );
  return application.stages[index];
}

function openDetail(id) {
  const application = state.applications.find((item) => item.id === id);
  if (!application) return;
  state.currentDetailId = id;
  renderDetail(application);
  elements.detailOverlay.classList.add('active');
  elements.detailOverlay.setAttribute('aria-hidden', 'false');
  elements.mainContent.classList.add('blurred');
}

function renderDetail(application) {
  elements.detailCompany.textContent = application.company || '—';
  elements.detailPosition.textContent = application.position || '—';
  elements.detailStatus.textContent = application.status || '—';
  elements.detailApplied.textContent = formatDate(application.appliedDate) || '—';
  elements.detailJobType.textContent = application.jobType || '—';
  elements.detailLocation.textContent = application.location || '—';
  elements.detailContact.textContent = application.contact || '—';
  elements.detailSalary.textContent = application.salaryRange || '—';
  elements.detailUpdated.textContent = formatDateTime(application.updatedAt) || '—';
  elements.detailCreated.textContent = formatDateTime(application.createdAt) || '—';

  const renderedNotes = application.notes && application.notes.trim().length
    ? markdownRenderer.parse(application.notes)
    : '<p>暂无备注内容，可以在「编辑」中添加你的面试纪要与准备要点。</p>';
  elements.detailNotes.innerHTML = renderedNotes;

  renderStageFlow(application);
}

function closeDetail(keepBlur = false) {
  elements.detailOverlay.classList.remove('active');
  elements.detailOverlay.setAttribute('aria-hidden', 'true');
  state.currentDetailId = null;
  if (!keepBlur && !elements.formModal.classList.contains('active')) {
    elements.mainContent.classList.remove('blurred');
  }
}

function renderStageFlow(application) {
  elements.stageFlow.innerHTML = '';
  const stages = Array.isArray(application.stages) && application.stages.length
    ? application.stages
    : DEFAULT_STAGES;
  const currentIndex = Math.min(
    Math.max(Number(application.currentStage) || 0, 0),
    stages.length - 1
  );

  stages.forEach((stage, index) => {
    const template = elements.stageStepTemplate.content.firstElementChild.cloneNode(true);
    template.querySelector('.stage-name').textContent = stage;
    template.dataset.index = String(index);
    template.setAttribute('role', 'button');
    template.setAttribute('tabindex', '0');
    template.setAttribute('aria-label', `${stage} 阶段`);
    template.classList.toggle('completed', index < currentIndex);
    template.classList.toggle('current', index === currentIndex);

    template.addEventListener('click', () => changeStage(application, index));
    template.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        changeStage(application, index);
      }
    });

    elements.stageFlow.appendChild(template);
  });
}

async function changeStage(application, index) {
  if (index === application.currentStage) return;
  try {
    const updated = await request(`${API_BASE}/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStage: index })
    });
    mergeApplication(updated);
    renderList();
    updateDashboard();
    if (state.currentDetailId === application.id) {
      renderDetail(updated);
    }
  } catch (error) {
    showError(error.message);
  }
}

function openForm(mode, application = null) {
  state.formMode = mode;
  state.editingId = application ? application.id : null;
  elements.form.reset();

  if (mode === 'create') {
    elements.formTitle.textContent = '新增投递';
    elements.formSubtitle.textContent = '填写关键信息，让记录保持结构化';
    elements.inputs.stages.value = DEFAULT_STAGES.join(', ');
    hydrateStageSelect(DEFAULT_STAGES, 0);
  } else if (application) {
    elements.formTitle.textContent = '编辑记录';
    elements.formSubtitle.textContent = `${application.company} · ${application.position}`;
    elements.inputs.company.value = application.company || '';
    elements.inputs.position.value = application.position || '';
    elements.inputs.location.value = application.location || '';
    elements.inputs.jobType.value = application.jobType || '';
    elements.inputs.appliedDate.value = formatInputDate(application.appliedDate);
    elements.inputs.status.value = application.status || '';
    elements.inputs.contact.value = application.contact || '';
    elements.inputs.salary.value = application.salaryRange || '';
    const stageList = Array.isArray(application.stages) && application.stages.length
      ? application.stages
      : DEFAULT_STAGES;
    elements.inputs.stages.value = stageList.join(', ');
    hydrateStageSelect(stageList, Number(application.currentStage) || 0);
    elements.inputs.notes.value = application.notes || '';
  }

  elements.formModal.classList.add('active');
  elements.formModal.setAttribute('aria-hidden', 'false');
  elements.mainContent.classList.add('blurred');
  elements.inputs.company.focus();
}

function closeForm() {
  elements.formModal.classList.remove('active');
  elements.formModal.setAttribute('aria-hidden', 'true');
  state.editingId = null;
  if (!elements.detailOverlay.classList.contains('active')) {
    elements.mainContent.classList.remove('blurred');
  }
}

function hydrateStageSelect(stageList, selectedIndex = 0) {
  const normalizedStages = stageList && stageList.length ? stageList : DEFAULT_STAGES;
  elements.inputs.currentStage.innerHTML = '';
  normalizedStages.forEach((stage, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1}. ${stage}`;
    if (index === selectedIndex) {
      option.selected = true;
    }
    elements.inputs.currentStage.appendChild(option);
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const stageList = parseStagesInput(elements.inputs.stages.value);
  const payload = {
    company: elements.inputs.company.value.trim(),
    position: elements.inputs.position.value.trim(),
    location: elements.inputs.location.value.trim(),
    jobType: elements.inputs.jobType.value.trim(),
    appliedDate: elements.inputs.appliedDate.value,
    status: elements.inputs.status.value.trim(),
    contact: elements.inputs.contact.value.trim(),
    salaryRange: elements.inputs.salary.value.trim(),
    stages: stageList,
    currentStage: Math.min(Number(elements.inputs.currentStage.value) || 0, stageList.length - 1),
    notes: elements.inputs.notes.value
  };

  if (!payload.company || !payload.position) {
    showError('公司与职位名称为必填项');
    return;
  }

  try {
    if (state.formMode === 'create') {
      const created = await request(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.applications.push(created);
      renderList();
      updateDashboard();
    } else if (state.formMode === 'edit' && state.editingId) {
      const updated = await request(`${API_BASE}/${state.editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      mergeApplication(updated);
      renderList();
      updateDashboard();
      if (state.currentDetailId === state.editingId) {
        renderDetail(updated);
      }
    }
    closeForm();
  } catch (error) {
    showError(error.message);
  }
}

function mergeApplication(updated) {
  const index = state.applications.findIndex((item) => item.id === updated.id);
  if (index !== -1) {
    state.applications[index] = updated;
  }
}

function escapeHtml(text) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (char) => replacements[char] || char);
}

function parseStagesInput(value) {
  if (!value || !value.trim()) {
    return [...DEFAULT_STAGES];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = '请求失败，请稍后再试';
    try {
      const data = await response.json();
      if (data && data.message) {
        message = data.message;
      }
    } catch (error) {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function toggleButtonLoading(button, isLoading) {
  if (!button) return;
  button.classList.toggle('loading', isLoading);
  button.disabled = isLoading;
}

function updateDashboard() {
  const activeCount = state.applications.filter((item) => {
    if (!Array.isArray(item.stages) || !item.stages.length) return false;
    return Number(item.currentStage) < item.stages.length - 1;
  }).length;
  elements.activeCount.textContent = activeCount;

  const latest = state.applications.reduce((acc, item) => {
    const current = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (current > acc) {
      return current;
    }
    return acc;
  }, 0);
  elements.latestUpdate.textContent = latest ? formatDateTime(new Date(latest).toISOString()) : '--';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function showError(message) {
  window.alert(message);
}
