// Har yangi sana uchun kunlik maydonlarni tozalab, ism-familiya va telefon raqamlarini saqlab qoladi.
function resetDailyFieldsKeepStudents(g, identitySource=null){
  if (!g) return;
  const source = Array.isArray(identitySource) ? identitySource : (Array.isArray(g.students) ? g.students : []);
  g.students = source.map(s => ({
    id: s.id || uid('st'),
    name: s.name || '',
    phone: s.phone || '',
    attendance: null,
    vocab: null,
    grammar: null,
    homework: null,
    speaking: null,
    participation: null,
    quiz: null
  }));
  g.roster = g.students.map(s => s.name);
}

// Arxiv hisobotini tahrirlashga kirilganda joriy ishchi dars returnSession ichida saqlanadi.
// Yangi sanaga o‘tayotganda ism va telefonlarni eski arxivdan emas, shu doimiy ro‘yxatdan olamiz.
function persistentStudentsForNewDate(){
  const g = group();
  const rs = state.returnSession;
  if (rs && rs.groupId === g.id && rs.date !== state.date && Array.isArray(rs.students)) {
    return rs.students.map(s => ({
      id: s.id || uid('st'),
      name: s.name || '',
      phone: s.phone || ''
    }));
  }
  return (g.students || []).map(s => ({
    id: s.id || uid('st'),
    name: s.name || '',
    phone: s.phone || ''
  }));
}

// Arxiv tahriridan yangi kunga chiqilganda avvalgi ishchi darsning umumiy sozlamalarini ham qaytaramiz.
function restorePersistentLessonSettings(){
  const g = group();
  const rs = state.returnSession;
  if (!rs || rs.groupId !== g.id || rs.date === state.date) return;
  if (rs.quizTotal != null) g.quizTotal = Math.max(1, Number(rs.quizTotal) || 1);
  if (rs.ratingEnabled != null) g.ratingEnabled = !!rs.ratingEnabled;
  if (rs.reportSections && typeof normalizedReportSections === 'function') {
    g.reportSections = normalizedReportSections(rs.reportSections);
  }
}

chooseDate = function(date){
  if (!date || !state) return;

  // Saqlangan eski hisobot bo‘lsa, tarix sifatida ochiladi.
  const archived = selectedArchive(date);
  if (archived){
    openArchive(date);
    return;
  }

  // Shu sananing o‘zini qayta bosish hech narsani o‘chirmaydi.
  if (date === state.date && !state.archiveEditing){
    calendarDate = new Date(date + 'T12:00:00');
    renderCalendar();
    return;
  }

  const identities = persistentStudentsForNewDate();
  restorePersistentLessonSettings();
  resetDailyFieldsKeepStudents(group(), identities);
  state.date = date;
  state.editorClosed = false;
  state.archiveEditing = null;
  state.returnSession = null;
  calendarDate = new Date(date + 'T12:00:00');
  saveLocal();
  render();
  toast(fmt(date) + ' — yangi dars tayyor ✅');
};

// "Yangi dars" ham xuddi shu tamoyilda ishlaydi.
newLesson = function(date = state.date){
  const identities = persistentStudentsForNewDate();
  restorePersistentLessonSettings();
  resetDailyFieldsKeepStudents(group(), identities);
  state.date = date;
  state.editorClosed = false;
  state.archiveEditing = null;
  state.returnSession = null;
  calendarDate = new Date(date + 'T12:00:00');
  saveLocal();
  render();
  toast('Yangi dars tayyor ✅');
};

// Website ochilganda oxirgi ishlatilgan sana emas, qurilmadagi bugungi sana ochiladi.
// Agar bugungi hisobot avval saqlangan bo‘lsa, aynan o‘sha saqlangan holat tiklanadi.
function openTodayOnStartup(){
  if (!state || !account) return;
  const d = today();
  calendarDate = new Date(d + 'T12:00:00');

  if (state.date === d && !state.archiveEditing){
    renderCalendar();
    return;
  }

  const g = group();
  const archivedToday = (state.archives?.[g.id] || {})[d];

  if (archivedToday){
    g.students = deep(archivedToday.students || []);
    g.roster = g.students.map(s => s.name || '');
    g.quizTotal = archivedToday.quizTotal || g.quizTotal;
    g.ratingEnabled = !!archivedToday.ratingEnabled;
    if (typeof normalizedReportSections === 'function') {
      g.reportSections = normalizedReportSections(archivedToday.reportSections);
    }
    state.date = d;
    state.editorClosed = true;
    state.archiveEditing = null;
    state.returnSession = null;
  } else {
    const identities = persistentStudentsForNewDate();
    restorePersistentLessonSettings();
    resetDailyFieldsKeepStudents(g, identities);
    state.date = d;
    state.editorClosed = false;
    state.archiveEditing = null;
    state.returnSession = null;
  }

  saveLocal();
  render();
}

// Avtomatik login app-daily.js yuklanishidan oldin tugashi mumkin, shuning uchun
// hozirgi sessiyani ham, keyinchalik qo‘lda kirishni ham qamrab olamiz.
const baseStartAppToday = startApp;
startApp = function(){
  baseStartAppToday();
  setTimeout(openTodayOnStartup, 0);
};
setTimeout(openTodayOnStartup, 0);

// app-init dagi sana tugmalarini yangi xavfsiz funksiyaga ulaymiz.
if ($('todayBtn')) $('todayBtn').onclick = () => chooseDate(today());
if ($('workDate')) $('workDate').onchange = e => { if (e.target.value) chooseDate(e.target.value); };
if ($('newLessonBtn')) $('newLessonBtn').onclick = () => newLesson(state.date);
if ($('closedNewBtn')) $('closedNewBtn').onclick = () => newLesson(today());

// -----------------------------------------------------------------------------
// Tartib raqamlari + bir nechta o‘quvchini tanlab ommaviy amallar qilish.
// Oddiy holatda checkbox yo‘q: 1, 2, 3... raqamlar ko‘rinadi.
// "Ko‘p tanlash" rejimida shu raqamlarning o‘zi tanlash tugmasiga aylanadi.
// -----------------------------------------------------------------------------
let bulkMode = false;
let bulkSelected = new Set();
let bulkContext = '';

function currentBulkContext(){
  return state ? `${state.activeGroupId || ''}|${state.date || ''}` : '';
}

function setupBulkUI(){
  const tools = document.querySelector('.student-tools');
  const editor = $('editorCard');
  if (!tools || !editor) return;

  const headFirst = document.querySelector('.thead > div:first-child');
  if (headFirst) headFirst.textContent = '№';

  if (!$('bulkModeBtn')) {
    const btn = document.createElement('button');
    btn.id = 'bulkModeBtn';
    btn.className = 'btn outline';
    btn.textContent = '☑ Ko‘p tanlash';
    const count = $('studentCount');
    tools.insertBefore(btn, count || null);
    btn.onclick = () => setBulkMode(!bulkMode);
  }

  if (!$('bulkToolbar')) {
    const bar = document.createElement('div');
    bar.id = 'bulkToolbar';
    bar.className = 'bulk-toolbar hidden';
    bar.innerHTML = `
      <span id="bulkInfo" class="bulk-info">0 ta tanlandi</span>
      <button id="bulkSelectAll" class="btn outline">Hammasini tanlash</button>
      <button id="bulkKeldi" class="btn soft" data-bulk-action>✅ Keldi</button>
      <button id="bulkKech" class="btn soft" data-bulk-action>⏰ Kech qoldi</button>
      <button id="bulkKelmadi" class="btn soft" data-bulk-action>🚫 Kelmadi</button>
      <button id="bulkClear" class="btn neutral" data-bulk-action>🧹 Kunlikni tozalash</button>
      <button id="bulkDelete" class="btn danger" data-bulk-action>🗑 Tanlanganlarni o‘chirish</button>`;
    const table = editor.querySelector('.tablewrap');
    editor.insertBefore(bar, table || null);

    $('bulkSelectAll').onclick = toggleBulkSelectAll;
    $('bulkKeldi').onclick = () => bulkSetAttendance('keldi');
    $('bulkKech').onclick = () => bulkSetAttendance('kech');
    $('bulkKelmadi').onclick = () => bulkSetAttendance('kelmadi');
    $('bulkClear').onclick = bulkClearDaily;
    $('bulkDelete').onclick = bulkDeleteStudents;
  }
}

function setBulkMode(on){
  bulkMode = !!on;
  if (!bulkMode) bulkSelected.clear();
  updateBulkUI();
}

function selectedBulkStudents(){
  if (!state) return [];
  return (group().students || []).filter(s => bulkSelected.has(s.id));
}

function updateBulkUI(){
  setupBulkUI();
  const editor = $('editorCard');
  const btn = $('bulkModeBtn');
  const bar = $('bulkToolbar');
  if (!editor || !btn || !bar) return;

  editor.classList.toggle('bulk-mode', bulkMode);
  btn.textContent = bulkMode ? '✕ Tanlashni tugatish' : '☑ Ko‘p tanlash';
  btn.className = bulkMode ? 'btn soft' : 'btn outline';
  bar.classList.toggle('hidden', !bulkMode);

  const validIds = new Set(state ? (group().students || []).map(s => s.id) : []);
  bulkSelected = new Set([...bulkSelected].filter(id => validIds.has(id)));
  const count = bulkSelected.size;
  if ($('bulkInfo')) $('bulkInfo').textContent = `${count} ta tanlandi`;
  if ($('bulkSelectAll')) {
    const total = state ? (group().students || []).length : 0;
    $('bulkSelectAll').textContent = total > 0 && count === total ? 'Tanlovni tozalash' : 'Hammasini tanlash';
  }
  document.querySelectorAll('[data-bulk-action]').forEach(b => b.disabled = count === 0);

  document.querySelectorAll('.srow').forEach(row => {
    const selected = bulkSelected.has(row.dataset.id);
    row.classList.toggle('bulk-selected', selected);
    const n = row.querySelector('[data-bulk-select]');
    if (n) {
      n.classList.toggle('selected', selected);
      n.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
  });
}

function toggleBulkSelectAll(){
  if (!state) return;
  const ids = (group().students || []).map(s => s.id);
  if (ids.length && ids.every(id => bulkSelected.has(id))) bulkSelected.clear();
  else bulkSelected = new Set(ids);
  updateBulkUI();
}

function clearStudentDailyFields(s, includeAttendance=true){
  if (!s) return;
  if (includeAttendance) s.attendance = null;
  ['vocab','grammar','homework','speaking','participation','quiz'].forEach(k => {
    if (Object.prototype.hasOwnProperty.call(s,k)) s[k] = null;
  });
}

function refreshAfterBulk(message){
  saveLocal();
  renderStudents();
  if (typeof applyReportSectionUI === 'function') applyReportSectionUI();
  updateReports();
  updateBulkUI();
  if (message) toast(message);
}

function bulkSetAttendance(value){
  const arr = selectedBulkStudents();
  if (!arr.length) return;
  arr.forEach(s => {
    s.attendance = value;
    if (value === 'kelmadi') clearStudentDailyFields(s, false);
  });
  const label = value === 'keldi' ? 'Keldi' : value === 'kech' ? 'Kech qoldi' : 'Kelmadi';
  refreshAfterBulk(`${arr.length} o‘quvchi: ${label} ✅`);
}

function bulkClearDaily(){
  const arr = selectedBulkStudents();
  if (!arr.length) return;
  arr.forEach(s => clearStudentDailyFields(s, true));
  refreshAfterBulk(`${arr.length} o‘quvchining kunlik hisoboti tozalandi`);
}

function bulkDeleteStudents(){
  const arr = selectedBulkStudents();
  if (!arr.length) return;
  confirmModal(
    'Tanlangan o‘quvchilarni o‘chirish',
    `${arr.length} ta o‘quvchi guruh ro‘yxatidan o‘chirilsinmi?`,
    () => {
      const ids = new Set(arr.map(s => s.id));
      group().students = (group().students || []).filter(s => !ids.has(s.id));
      group().roster = group().students.map(s => s.name);
      bulkSelected.clear();
      bulkMode = false;
      saveLocal();
      closeModal();
      render();
      toast(`${arr.length} ta o‘quvchi o‘chirildi`);
    }
  );
}

// Final row HTML ichidagi eski checkboxni tartib raqamiga almashtiramiz.
const baseRowHtmlBulk = rowHtml;
rowHtml = function(s){
  let html = baseRowHtmlBulk(s);
  const idx = Math.max(0, (group().students || []).findIndex(x => x.id === s.id)) + 1;
  const selected = bulkSelected.has(s.id);
  const numberCell = `<div class="rownumcell"><button type="button" class="rownum ${selected?'selected':''}" data-bulk-select aria-pressed="${selected?'true':'false'}" title="${bulkMode?'Tanlash/tanlovdan chiqarish':'Tartib raqami'}">${idx}</button></div>`;
  html = html.replace(/<div>\s*<input\b[^>]*type=["']checkbox["'][^>]*>\s*<\/div>/i, numberCell);
  return html;
};

// Har bir qayta chizilgan qatorda raqam orqali tanlash ishlaydi.
const baseBindRowBulk = bindRow;
bindRow = function(el){
  baseBindRowBulk(el);
  const selectBtn = el.querySelector('[data-bulk-select]');
  if (selectBtn) {
    selectBtn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      if (!bulkMode) return;
      const id = el.dataset.id;
      if (bulkSelected.has(id)) bulkSelected.delete(id);
      else bulkSelected.add(id);
      updateBulkUI();
    };
  }
};

// Guruh yoki sana almashsa eski tanlovni olib yurmaymiz.
const baseRenderBulk = render;
render = function(){
  const ctx = currentBulkContext();
  if (bulkContext && ctx !== bulkContext) {
    bulkSelected.clear();
    bulkMode = false;
  }
  bulkContext = ctx;
  baseRenderBulk();
  updateBulkUI();
};

// Script yuklangan paytda sahifa allaqachon chizilgan bo‘lishi mumkin.
setupBulkUI();
setTimeout(() => {
  setupBulkUI();
  if (state) {
    bulkContext = currentBulkContext();
    renderStudents();
    if (typeof applyReportSectionUI === 'function') applyReportSectionUI();
    updateBulkUI();
  }
}, 0);
