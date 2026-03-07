const API_BASE = '/api/applications';
const DEFAULT_STAGES = ['投递', '初筛', '一面', '二面', '三面', 'HR面', 'Offer'];

const elements = {
  mainContent: document.getElementById('mainContent'),
  list: document.getElementById('applicationList'),
  emptyState: document.getElementById('emptyState'),
  activeCount: document.getElementById('activeCount'),
  successCount: document.getElementById('successCount'),
  failedCount: document.getElementById('failedCount'),
  latestUpdate: document.getElementById('latestUpdate'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailCompany: document.getElementById('detailCompany'),
  detailPosition: document.getElementById('detailTitle'),
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
    salary: document.getElementById('salaryInput'),
    sourceUrl: document.getElementById('sourceUrlInput'),
    currentStage: document.getElementById('currentStageSelect'),
    notes: document.getElementById('notesInput')
  },
  createButton: document.getElementById('createButton'),
  refreshButton: document.getElementById('refreshButton'),
  closeDetail: document.getElementById('closeDetail'),
  editButton: document.getElementById('editButton'),
  terminateButton: document.getElementById('terminateButton'),
  deleteButton: document.getElementById('deleteButton'),
  closeForm: document.getElementById('closeForm'),
  cancelForm: document.getElementById('cancelForm')
};

const state = {
  applications: [],
  currentDetailId: null,
  formMode: 'create',
  editingId: null,

  // 新增：招聘信息相关状态
  currentView: 'applications',
  jobs: [],
  currentJobDetailId: null,
  jobFormMode: 'create',
  editingJobId: null,

  // 流程阶段相关
  customStages: [...DEFAULT_STAGES]
};

const markdownRenderer = createMarkdownRenderer();

initialize();

function initialize() {
  bindEventListeners();
  bindNavigationListeners();
  bindJobsEventListeners();
  hydrateStageSelect(DEFAULT_STAGES, 0);
  // 初始化时加载两边的数据以更新徽章和统计
  fetchApplications();
  fetchJobs();
  handleRoute();
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

  elements.terminateButton.addEventListener('click', async () => {
    const target = state.applications.find((item) => item.id === state.currentDetailId);
    if (!target) return;
    const shouldTerminate = window.confirm(`确认结束「${target.company} · ${target.position}」的投递吗？\n\n这将标记此投递已结束（未成功）。`);
    if (!shouldTerminate) return;
    try {
      const updated = await request(`${API_BASE}/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTerminated: true, terminatedAt: new Date().toISOString() })
      });
      mergeApplication(updated);
      closeDetail();
      renderList();
      updateDashboard();
    } catch (error) {
      showError(error.message);
    }
  });

  elements.deleteButton.addEventListener('click', async () => {
    const target = state.applications.find((item) => item.id === state.currentDetailId);
    if (!target) return;
    const shouldDelete = window.confirm(`确认删除「${target.company} · ${target.position}」的记录吗？`);
    if (!shouldDelete) return;
    try {
      await request(`${API_BASE}/${target.id}`, { method: 'DELETE' });
      state.applications = state.applications.filter((item) => item.id !== target.id);
      // 更新投递记录徽章
      const countElement = document.getElementById('applicationsCount');
      if (countElement) {
        countElement.textContent = state.applications.length;
      }
      closeDetail();
      renderList();
      updateDashboard();
    } catch (error) {
      showError(error.message);
    }
  });

  elements.closeForm.addEventListener('click', () => closeForm());
  elements.cancelForm.addEventListener('click', () => closeForm());

  // Bind top form action buttons
  const cancelFormTop = document.getElementById('cancelFormTop');
  const saveFormTop = document.getElementById('saveFormTop');
  if (cancelFormTop) {
    cancelFormTop.addEventListener('click', () => closeForm());
  }
  if (saveFormTop) {
    saveFormTop.addEventListener('click', () => {
      elements.form.requestSubmit();
    });
  }

  elements.formModal.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'true') {
      closeForm();
    }
  });

  // 添加阶段按钮
  const addStageBtn = document.getElementById('addStageBtn');
  const newStageInput = document.getElementById('newStageInput');
  if (addStageBtn && newStageInput) {
    addStageBtn.addEventListener('click', () => {
      const stageName = newStageInput.value.trim();
      if (stageName) {
        state.customStages.push(stageName);
        newStageInput.value = '';
        renderCustomStages();
        updateCurrentStageSelect(state.customStages);
      }
    });

    newStageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addStageBtn.click();
      }
    });
  }

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

    // 更新投递记录徽章
    const countElement = document.getElementById('applicationsCount');
    if (countElement) {
      countElement.textContent = state.applications.length;
    }

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

  // 检查是否到达最后阶段（Offer）
  const stages = Array.isArray(application.stages) && application.stages.length
    ? application.stages
    : DEFAULT_STAGES;
  const isOfferAchieved = application.currentStage === stages.length - 1;

  if (application.isTerminated) {
    card.classList.add('terminated');
  } else if (isOfferAchieved) {
    card.classList.add('offer-achieved');
  }
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

  info.appendChild(title);
  info.appendChild(meta);

  // 阶段标签
  const chip = document.createElement('span');
  chip.className = 'stage-chip';
  chip.textContent = getCurrentStageName(application);

  // 网申进度按钮
  const progressBtn = document.createElement('button');
  progressBtn.className = 'progress-button';
  progressBtn.textContent = '网申进度';
  progressBtn.disabled = !application.sourceUrl || !application.sourceUrl.trim();

  if (application.sourceUrl && application.sourceUrl.trim()) {
    progressBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(application.sourceUrl, '_blank', 'noopener,noreferrer');
    });
  }

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(chip);
  card.appendChild(progressBtn);

  card.addEventListener('click', () => openDetail(application.id));

  return card;
}

function buildCardMeta(application) {
  const pieces = [];
  if (application.location) {
    pieces.push(application.location);
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
  elements.detailApplied.textContent = formatDate(application.appliedDate) || '—';

  // 更新结束投递按钮状态
  if (application.isTerminated) {
    elements.terminateButton.textContent = '已结束';
    elements.terminateButton.disabled = true;
    elements.terminateButton.style.opacity = '0.5';
  } else {
    elements.terminateButton.textContent = '结束投递';
    elements.terminateButton.disabled = false;
    elements.terminateButton.style.opacity = '1';
  }
  elements.detailJobType.textContent = application.jobType || '—';
  elements.detailLocation.textContent = application.location || '—';
  elements.detailSalary.textContent = application.salaryRange || '—';
  elements.detailUpdated.textContent = formatDateTime(application.updatedAt) || '—';
  elements.detailCreated.textContent = formatDateTime(application.createdAt) || '—';

  // Make source URL clickable
  const urlElement = document.getElementById('detailSourceUrl');
  if (urlElement) {
    if (application.sourceUrl && application.sourceUrl.trim()) {
      urlElement.innerHTML = `<a href="${application.sourceUrl}" target="_blank" rel="noopener noreferrer">${application.sourceUrl}</a>`;
    } else {
      urlElement.textContent = '—';
    }
  }

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

  if (mode === 'create') {
    elements.form.reset();
    elements.formTitle.textContent = '新增投递';
    elements.formSubtitle.textContent = '填写关键信息，让记录保持结构化';
    state.customStages = [...DEFAULT_STAGES];
    renderCustomStages();
    hydrateStageSelect(DEFAULT_STAGES, 0);
  } else if (application) {
    elements.formTitle.textContent = '编辑记录';
    elements.formSubtitle.textContent = `${application.company} · ${application.position}`;
    // Set form values directly without reset to preserve select values
    elements.inputs.company.value = application.company || '';
    elements.inputs.position.value = application.position || '';
    elements.inputs.location.value = application.location || '';
    elements.inputs.jobType.value = application.jobType || '';
    elements.inputs.appliedDate.value = formatInputDate(application.appliedDate);
    elements.inputs.salary.value = application.salaryRange || '';
    elements.inputs.sourceUrl.value = application.sourceUrl || '';
    const stageList = Array.isArray(application.stages) && application.stages.length
      ? application.stages
      : DEFAULT_STAGES;
    state.customStages = [...stageList];
    renderCustomStages();
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
  const payload = {
    company: elements.inputs.company.value.trim(),
    position: elements.inputs.position.value.trim(),
    location: elements.inputs.location.value.trim(),
    jobType: elements.inputs.jobType.value,
    appliedDate: elements.inputs.appliedDate.value,
    salaryRange: elements.inputs.salary.value.trim(),
    sourceUrl: elements.inputs.sourceUrl.value.trim(),
    stages: state.customStages,
    currentStage: Math.min(Number(elements.inputs.currentStage.value) || 0, state.customStages.length - 1),
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
      // 更新投递记录徽章
      const countElement = document.getElementById('applicationsCount');
      if (countElement) {
        countElement.textContent = state.applications.length;
      }
      renderList();
      updateDashboard();
      closeForm();
    } else if (state.formMode === 'edit' && state.editingId) {
      const editedAppId = state.editingId;
      const updated = await request(`${API_BASE}/${editedAppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      mergeApplication(updated);
      renderList();
      updateDashboard();

      // Close form and reopen detail page with updated data
      closeForm();
      openDetail(editedAppId);
    }
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
  // 正在跟进：未结束 且 未到最后阶段
  const activeCount = state.applications.filter((item) => {
    if (item.isTerminated) return false;
    if (!Array.isArray(item.stages) || !item.stages.length) return false;
    return Number(item.currentStage) < item.stages.length - 1;
  }).length;
  elements.activeCount.textContent = activeCount;

  // 成功：未结束 且 到达最后阶段（Offer）
  const successCount = state.applications.filter((item) => {
    if (item.isTerminated) return false;
    if (!Array.isArray(item.stages) || !item.stages.length) return false;
    return Number(item.currentStage) === item.stages.length - 1;
  }).length;
  elements.successCount.textContent = successCount;

  // 失败：已标记结束
  const failedCount = state.applications.filter((item) => item.isTerminated).length;
  elements.failedCount.textContent = failedCount;

  // 最新更新时间
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

// ==================== 流程阶段处理 ====================

function renderCustomStages() {
  const container = document.getElementById('stagesTags');
  if (!container) return;

  container.innerHTML = '';

  state.customStages.forEach((stage, index) => {
    const tag = document.createElement('div');
    tag.className = 'stage-tag';
    tag.innerHTML = `
      <span>${stage}</span>
      <span class="remove-tag" data-index="${index}">×</span>
    `;

    tag.querySelector('.remove-tag').addEventListener('click', () => {
      removeStage(index);
    });

    container.appendChild(tag);
  });
}

function removeStage(index) {
  if (state.customStages.length <= 1) {
    showError('至少需要保留一个阶段');
    return;
  }
  state.customStages.splice(index, 1);
  renderCustomStages();
  updateCurrentStageSelect(state.customStages);
}

function updateCurrentStageSelect(stages) {
  const select = elements.inputs.currentStage;
  const currentValue = Number(select.value) || 0;
  hydrateStageSelect(stages, Math.min(currentValue, stages.length - 1));
}

// ==================== 导航和路由系统 ====================

function bindNavigationListeners() {
  // 绑定导航项点击事件
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      navigateTo(view);
    });
  });

  // 监听路由变化
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);
}

function navigateTo(view) {
  window.location.hash = `#/${view}`;
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const view = hash === '#/' || hash === '#/applications' ? 'applications' : hash.replace('#/', '');

  if (view === 'applications') {
    switchView('applications');
  } else if (view === 'jobs') {
    switchView('jobs');
  } else {
    // 默认显示投递记录
    window.location.hash = '#/applications';
  }
}

function switchView(viewName) {
  state.currentView = viewName;

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // 切换视图显示
  const applicationsView = document.getElementById('applicationsView');
  const jobsView = document.getElementById('jobsView');
  const createButton = document.getElementById('createButton');
  const createJobButton = document.getElementById('createJobButton');

  if (viewName === 'applications') {
    applicationsView.classList.remove('hidden');
    jobsView.classList.add('hidden');
    createButton.classList.remove('hidden');
    createJobButton.classList.add('hidden');
  } else if (viewName === 'jobs') {
    applicationsView.classList.add('hidden');
    jobsView.classList.remove('hidden');
    createButton.classList.add('hidden');
    createJobButton.classList.remove('hidden');
    renderJobsList();
    updateJobsStats();
  }
}

async function fetchJobs() {
  try {
    const response = await fetch('/api/jobs');
    if (!response.ok) {
      throw new Error('无法加载招聘信息');
    }
    const data = await response.json();
    state.jobs = Array.isArray(data) ? data : [];

    // 更新徽章计数
    const countElement = document.getElementById('jobsCount');
    if (countElement) {
      countElement.textContent = state.jobs.length;
    }

    // 更新公司统计
    updateCompanyStats();

    if (state.currentView === 'jobs') {
      renderJobsList();
      updateJobsStats();
    }
  } catch (error) {
    showError(error.message);
  }
}

function updateJobsStats() {
  const totalCount = state.jobs.length;
  const pendingCount = state.jobs.filter(job => !job.applied).length;

  const totalElement = document.getElementById('jobsTotalCount');
  const pendingElement = document.getElementById('jobsPendingCount');

  if (totalElement) totalElement.textContent = totalCount;
  if (pendingElement) pendingElement.textContent = pendingCount;
}

function updateCompanyStats() {
  const companyStatsList = document.getElementById('companyStatsList');
  if (!companyStatsList) return;

  // 统计每个公司的职位数量
  const companyMap = new Map();

  state.jobs.forEach(job => {
    const company = job.company || '未知公司';
    if (companyMap.has(company)) {
      companyMap.set(company, companyMap.get(company) + 1);
    } else {
      companyMap.set(company, 1);
    }
  });

  // 清空列表
  companyStatsList.innerHTML = '';

  // 如果没有数据，显示空状态
  if (companyMap.size === 0) {
    companyStatsList.innerHTML = '<div class="company-stats-empty">暂无数据</div>';
    return;
  }

  // 按公司名称排序
  const sortedCompanies = Array.from(companyMap.entries()).sort((a, b) => {
    return a[0].localeCompare(b[0], 'zh-CN');
  });

  // 渲染公司列表
  sortedCompanies.forEach(([company, count]) => {
    const item = document.createElement('div');
    item.className = 'company-item';
    item.innerHTML = `
      <span class="company-name" title="${company}">${company}</span>
      <span class="company-count">${count}</span>
    `;

    // 点击时跳转到招聘信息库并可以考虑筛选该公司
    item.addEventListener('click', () => {
      // 切换到招聘信息库视图
      const jobsNavItem = document.querySelector('.nav-item[data-view="jobs"]');
      if (jobsNavItem) {
        jobsNavItem.click();
      }
    });

    companyStatsList.appendChild(item);
  });
}

// ==================== 招聘信息渲染 ====================

function renderJobsList() {
  const jobList = document.getElementById('jobList');
  const emptyState = document.getElementById('jobsEmptyState');

  jobList.innerHTML = '';

  if (!state.jobs.length) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  const fragment = document.createDocumentFragment();

  state.jobs
    .slice()
    .sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    })
    .forEach((job, index) => {
      const card = createJobCard(job, index);
      fragment.appendChild(card);
    });

  jobList.appendChild(fragment);
}

function createJobCard(job, index) {
  const card = document.createElement('article');
  card.className = 'job-card';
  card.style.animationDelay = `${index * 70}ms`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = getInitials(job.company);

  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = `${job.company} · ${job.position}`;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  const metaPieces = [];
  if (job.location) metaPieces.push(job.location);
  if (job.source) metaPieces.push(job.source);
  meta.textContent = metaPieces.join(' · ');

  info.appendChild(title);
  info.appendChild(meta);

  const badges = document.createElement('div');
  badges.style.display = 'flex';
  badges.style.flexDirection = 'column';
  badges.style.gap = '0.4rem';
  badges.style.alignItems = 'flex-end';

  const priorityBadge = document.createElement('span');
  priorityBadge.className = `priority-badge ${job.priority || 'medium'}`;
  const priorityText = { high: '高优', medium: '中优', low: '低优' };
  priorityBadge.textContent = priorityText[job.priority] || '中优';
  badges.appendChild(priorityBadge);

  if (job.interestLevel > 0) {
    const stars = document.createElement('span');
    stars.className = 'star-display';
    stars.textContent = '★'.repeat(job.interestLevel) + '☆'.repeat(5 - job.interestLevel);
    stars.title = `感兴趣程度: ${job.interestLevel}/5`;
    badges.appendChild(stars);
  }

  // 按钮容器
  const buttonGroup = document.createElement('div');
  buttonGroup.style.display = 'flex';
  buttonGroup.style.gap = '0.5rem';
  buttonGroup.style.alignItems = 'center';

  // 一键网申按钮
  const quickApplyBtn = document.createElement('button');
  quickApplyBtn.className = 'quick-apply-button';
  quickApplyBtn.textContent = '一键网申';
  quickApplyBtn.disabled = !job.sourceUrl || !job.sourceUrl.trim();

  if (job.sourceUrl && job.sourceUrl.trim()) {
    quickApplyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(job.sourceUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // 投递按钮
  const applyBtn = document.createElement('button');
  applyBtn.className = job.applied ? 'apply-button applied' : 'apply-button';
  applyBtn.textContent = job.applied ? '已投递' : '投递';
  applyBtn.disabled = job.applied;

  if (!job.applied) {
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleQuickApply(job.id);
    });
  }

  buttonGroup.appendChild(quickApplyBtn);
  buttonGroup.appendChild(applyBtn);

  card.appendChild(avatar);
  card.appendChild(info);
  card.appendChild(badges);
  card.appendChild(buttonGroup);

  card.addEventListener('click', () => openJobDetail(job.id));

  return card;
}

// ==================== 招聘信息详情 ====================

function openJobDetail(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;
  state.currentJobDetailId = jobId;
  renderJobDetail(job);
  const overlay = document.getElementById('jobDetailOverlay');
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  elements.mainContent.classList.add('blurred');
}

function renderJobDetail(job) {
  document.getElementById('jobDetailCompany').textContent = job.company || '—';
  document.getElementById('jobDetailTitle').textContent = job.position || '—';
  document.getElementById('jobDetailLocation').textContent = job.location || '—';
  document.getElementById('jobDetailJobType').textContent = job.jobType || '—';
  document.getElementById('jobDetailSource').textContent = job.source || '—';
  document.getElementById('jobDetailDeadline').textContent = formatDate(job.deadline) || '—';
  document.getElementById('jobDetailUpdated').textContent = formatDateTime(job.updatedAt) || '—';

  // Make source URL clickable
  const urlElement = document.getElementById('jobDetailSourceUrl');
  if (job.sourceUrl && job.sourceUrl.trim()) {
    urlElement.innerHTML = `<a href="${job.sourceUrl}" target="_blank" rel="noopener noreferrer">${job.sourceUrl}</a>`;
  } else {
    urlElement.textContent = '—';
  }

  const priorityBadge = document.getElementById('jobPriorityBadge');
  priorityBadge.className = `priority-badge ${job.priority || 'medium'}`;
  const priorityText = { high: '高优先级', medium: '中优先级', low: '低优先级' };
  priorityBadge.textContent = priorityText[job.priority] || '中优先级';

  document.getElementById('jobInterestStars').textContent = job.interestLevel > 0
    ? `感兴趣: ${'★'.repeat(job.interestLevel)}${'☆'.repeat(5 - job.interestLevel)}`
    : '';

  document.getElementById('jobMatchStars').textContent = job.matchScore > 0
    ? `适配度: ${'★'.repeat(job.matchScore)}${'☆'.repeat(5 - job.matchScore)}`
    : '';

  document.getElementById('jobDetailDescription').innerHTML = job.description && job.description.trim()
    ? markdownRenderer.parse(job.description)
    : '<p>暂无职位描述</p>';

  document.getElementById('jobDetailRequirements').innerHTML = job.requirements && job.requirements.trim()
    ? markdownRenderer.parse(job.requirements)
    : '<p>暂无任职要求</p>';

  document.getElementById('jobDetailNotes').innerHTML = job.notes && job.notes.trim()
    ? markdownRenderer.parse(job.notes)
    : '<p>暂无个人备注</p>';

  const applyBtn = document.getElementById('applyJobButton');
  applyBtn.disabled = job.applied;
  applyBtn.textContent = job.applied ? '已投递' : '投递此职位';
}

function closeJobDetail() {
  const overlay = document.getElementById('jobDetailOverlay');
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  state.currentJobDetailId = null;
  elements.mainContent.classList.remove('blurred');
}

// ==================== 招聘信息表单 ====================

function openJobForm(mode, job = null) {
  state.jobFormMode = mode;
  state.editingJobId = job ? job.id : null;
  const form = document.getElementById('jobForm');

  if (mode === 'create') {
    form.reset();
    document.getElementById('jobFormTitle').textContent = '新增招聘信息';
    document.getElementById('jobFormSubtitle').textContent = '记录你感兴趣的职位机会';
  } else if (job) {
    document.getElementById('jobFormTitle').textContent = '编辑招聘信息';
    document.getElementById('jobFormSubtitle').textContent = `${job.company} · ${job.position}`;

    // Set form values directly without reset to preserve select values
    document.getElementById('jobCompanyInput').value = job.company || '';
    document.getElementById('jobPositionInput').value = job.position || '';
    document.getElementById('jobLocationInput').value = job.location || '';
    document.getElementById('jobJobTypeInput').value = job.jobType || '';
    document.getElementById('jobSourceInput').value = job.source || '';
    document.getElementById('jobSourceUrlInput').value = job.sourceUrl || '';
    document.getElementById('jobDeadlineInput').value = formatInputDate(job.deadline);
    document.getElementById('jobPriorityInput').value = job.priority || 'medium';
    document.getElementById('jobDescriptionInput').value = job.description || '';
    document.getElementById('jobRequirementsInput').value = job.requirements || '';
    document.getElementById('jobNotesInput').value = job.notes || '';

    setStarValue('jobInterestInput', job.interestLevel || 0);
    setStarValue('jobMatchInput', job.matchScore || 0);
  }

  const modal = document.getElementById('jobFormModal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  elements.mainContent.classList.add('blurred');
  document.getElementById('jobCompanyInput').focus();
}

function closeJobForm() {
  const modal = document.getElementById('jobFormModal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  state.editingJobId = null;
  elements.mainContent.classList.remove('blurred');
}

async function handleJobFormSubmit(event) {
  event.preventDefault();

  const payload = {
    company: document.getElementById('jobCompanyInput').value.trim(),
    position: document.getElementById('jobPositionInput').value.trim(),
    location: document.getElementById('jobLocationInput').value.trim(),
    jobType: document.getElementById('jobJobTypeInput').value,
    source: document.getElementById('jobSourceInput').value,
    sourceUrl: document.getElementById('jobSourceUrlInput').value.trim(),
    deadline: document.getElementById('jobDeadlineInput').value,
    priority: document.getElementById('jobPriorityInput').value,
    interestLevel: Number(document.getElementById('jobInterestInput').dataset.value) || 0,
    matchScore: Number(document.getElementById('jobMatchInput').dataset.value) || 0,
    description: document.getElementById('jobDescriptionInput').value,
    requirements: document.getElementById('jobRequirementsInput').value,
    notes: document.getElementById('jobNotesInput').value
  };

  if (!payload.company || !payload.position) {
    showError('公司与职位名称为必填项');
    return;
  }

  try {
    if (state.jobFormMode === 'create') {
      const created = await request('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.jobs.push(created);
      renderJobsList();
    } else if (state.jobFormMode === 'edit' && state.editingJobId) {
      const editedJobId = state.editingJobId;
      const updated = await request(`/api/jobs/${editedJobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const index = state.jobs.findIndex((item) => item.id === updated.id);
      if (index !== -1) {
        state.jobs[index] = updated;
      }
      renderJobsList();

      // Close form and reopen detail page with updated data
      closeJobForm();
      openJobDetail(editedJobId);
    }

    // 更新徽章计数和统计
    document.getElementById('jobsCount').textContent = state.jobs.length;
    updateJobsStats();

    if (state.jobFormMode === 'create') {
      closeJobForm();
    }
  } catch (error) {
    showError(error.message);
  }
}

// ==================== 星级输入组件 ====================

function initStarInputs() {
  document.querySelectorAll('.star-input').forEach((element) => {
    const spans = element.querySelectorAll('span');
    let currentValue = Number(element.dataset.value) || 0;

    // 初始化显示
    updateStars(spans, currentValue);

    spans.forEach((star) => {
      star.addEventListener('click', () => {
        const value = Number(star.dataset.value);
        currentValue = value;
        element.dataset.value = value;
        updateStars(spans, value);
      });

      star.addEventListener('mouseenter', () => {
        const value = Number(star.dataset.value);
        updateStars(spans, value);
      });
    });

    element.addEventListener('mouseleave', () => {
      updateStars(spans, currentValue);
    });
  });
}

function updateStars(spans, value) {
  spans.forEach((star, index) => {
    star.classList.toggle('active', index < value);
  });
}

function setStarValue(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.dataset.value = value;
  const spans = element.querySelectorAll('span');
  updateStars(spans, value);
}

// ==================== 一键投递功能 ====================

async function handleQuickApply(jobId) {
  if (!confirm('确认将此职位转为投递记录吗？')) {
    return;
  }

  try {
    const response = await request(`/api/jobs/${jobId}/apply`, {
      method: 'POST'
    });

    const { job, application } = response;

    // 更新本地状态
    const jobIndex = state.jobs.findIndex((item) => item.id === jobId);
    if (jobIndex !== -1) {
      state.jobs[jobIndex] = job;
    }

    state.applications.push(application);

    // 更新投递记录徽章
    const countElement = document.getElementById('applicationsCount');
    if (countElement) {
      countElement.textContent = state.applications.length;
    }

    // 刷新列表和统计
    if (state.currentView === 'jobs') {
      renderJobsList();
      updateJobsStats();
    }

    alert('已成功创建投递记录！');

    // 跳转到投递记录详情
    setTimeout(() => {
      navigateTo('applications');
      renderList();
      updateDashboard();
      openDetail(application.id);
    }, 500);

  } catch (error) {
    showError(error.message);
  }
}

// ==================== 招聘信息事件绑定 ====================

function bindJobsEventListeners() {
  // 新增招聘信息按钮
  const createJobButton = document.getElementById('createJobButton');
  if (createJobButton) {
    createJobButton.addEventListener('click', () => openJobForm('create'));
  }

  // 详情页按钮
  const closeJobDetailBtn = document.getElementById('closeJobDetail');
  if (closeJobDetailBtn) {
    closeJobDetailBtn.addEventListener('click', closeJobDetail);
  }

  const editJobBtn = document.getElementById('editJobButton');
  if (editJobBtn) {
    editJobBtn.addEventListener('click', () => {
      const job = state.jobs.find((item) => item.id === state.currentJobDetailId);
      if (job) {
        closeJobDetail();
        openJobForm('edit', job);
      }
    });
  }

  const deleteJobBtn = document.getElementById('deleteJobButton');
  if (deleteJobBtn) {
    deleteJobBtn.addEventListener('click', async () => {
      const job = state.jobs.find((item) => item.id === state.currentJobDetailId);
      if (!job) return;

      if (!confirm(`确认删除「${job.company} · ${job.position}」吗？`)) return;

      try {
        await request(`/api/jobs/${job.id}`, { method: 'DELETE' });
        state.jobs = state.jobs.filter((item) => item.id !== job.id);
        closeJobDetail();
        renderJobsList();
        document.getElementById('jobsCount').textContent = state.jobs.length;
        updateJobsStats();
      } catch (error) {
        showError(error.message);
      }
    });
  }

  const applyJobBtn = document.getElementById('applyJobButton');
  if (applyJobBtn) {
    applyJobBtn.addEventListener('click', async () => {
      const job = state.jobs.find((item) => item.id === state.currentJobDetailId);
      if (!job || job.applied) return;

      closeJobDetail();
      await handleQuickApply(job.id);
    });
  }

  // 表单相关
  const closeJobFormBtn = document.getElementById('closeJobForm');
  if (closeJobFormBtn) {
    closeJobFormBtn.addEventListener('click', closeJobForm);
  }

  const cancelJobFormBtn = document.getElementById('cancelJobForm');
  if (cancelJobFormBtn) {
    cancelJobFormBtn.addEventListener('click', closeJobForm);
  }

  // Bind top job form action buttons
  const cancelJobFormTop = document.getElementById('cancelJobFormTop');
  const saveJobFormTop = document.getElementById('saveJobFormTop');
  if (cancelJobFormTop) {
    cancelJobFormTop.addEventListener('click', closeJobForm);
  }
  if (saveJobFormTop) {
    saveJobFormTop.addEventListener('click', () => {
      const jobForm = document.getElementById('jobForm');
      if (jobForm) {
        jobForm.requestSubmit();
      }
    });
  }

  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', handleJobFormSubmit);
  }

  const jobFormModal = document.getElementById('jobFormModal');
  if (jobFormModal) {
    jobFormModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'true') {
        closeJobForm();
      }
    });
  }

  const jobDetailOverlay = document.getElementById('jobDetailOverlay');
  if (jobDetailOverlay) {
    jobDetailOverlay.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'true') {
        closeJobDetail();
      }
    });
  }

  // 初始化星级输入
  initStarInputs();
}
