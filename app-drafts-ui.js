// Qoralamalarni sana bo‘yicha qayta ochish va yangi kun ochilganda eski qoralamani saqlab qolish.
// Bu fayl app-daily.js dan KEYIN yuklanadi.

function getLessonDraft(date, gid=state?.activeGroupId){
  if (!state || !gid || !date) return null;
  ensureDraftContainers(state);
  return state.drafts?.[gid]?.[date] || null;
}

function restoreLessonDraft(date, draft, message=true){
  if (!state || !draft) return false;
  ensureDraftContainers(state);
  const g = group();
  g.students = deep(draft.students || []);
  g.roster = g.students.map(s => s.name || '');
  g.rosterDetails = g.students.map(s => ({id:s.id||uid('st'), name:s.name||'', phone:s.phone||''}));
  if (draft.quizTotal != null) g.quizTotal = Math.max(1, Number(draft.quizTotal) || 1);
  if (draft.ratingEnabled != null) g.ratingEnabled = !!draft.ratingEnabled;
  if (draft.reportSections && typeof normalizedReportSections === 'function') {
    g.reportSections = normalizedReportSections(draft.reportSections);
  }
  if (typeof draft.mainReportRanked === 'boolean') g.mainReportRanked = draft.mainReportRanked;

  state.date = date;
  state.editorClosed = false;
  state.archiveEditing = null;
  state.returnSession = null;
  calendarDate = new Date(date + 'T12:00:00');
  draftLastContext = `${g.id}|${date}`;
  saveLocal();
  render();
  if (message) toast(fmt(date) + ' — qoralama tiklandi ✅');
  return true;
}

const baseChooseDateWithDrafts = chooseDate;
chooseDate = function(date){
  if (!date || !state) return;

  // Hozirgi kunning belgilarini sana almashishidan oldin qoralamaga aniq yozib qo‘yamiz.
  captureCurrentDraftToState(true);

  // Yakuniy saqlangan hisobot har doim ustun turadi.
  if (selectedArchive(date)) {
    baseChooseDateWithDrafts(date);
    return;
  }

  if (date === state.date && !state.archiveEditing) {
    calendarDate = new Date(date + 'T12:00:00');
    renderCalendar();
    return;
  }

  const draft = getLessonDraft(date);
  if (draft) {
    restoreLessonDraft(date, draft, true);
    return;
  }

  baseChooseDateWithDrafts(date);
};

// Startup: bugungi sana ochiladi. Bugunning qoralama hisoboti bo‘lsa, aynan o‘sha tiklanadi.
const baseOpenTodayWithDrafts = openTodayOnStartup;
openTodayOnStartup = function(){
  if (!state || !account) return;
  ensureDraftContainers(state);
  const d = today();

  if (state.date !== d) captureCurrentDraftToState(true);

  const g = group();
  const archivedToday = state.archives?.[g.id]?.[d];
  const draftToday = getLessonDraft(d, g.id);

  if (!archivedToday && draftToday) {
    // Agar joriy state allaqachon bugungi mazmunli dars bo‘lsa, uni qayta almashtirish shart emas.
    const current = state.date === d ? draftSnapshotFromGroup(g) : null;
    if (state.date !== d || !draftHasMeaningfulDailyData(current) || state.editorClosed) {
      restoreLessonDraft(d, draftToday, false);
      return;
    }
  }

  baseOpenTodayWithDrafts();
};

// "Yangi dars" — foydalanuvchining ongli ravishda tozalash buyrug‘i, shuning uchun o‘sha sananing qoralamasini ham yangidan boshlaymiz.
const baseNewLessonWithDrafts = newLesson;
newLesson = function(date=state.date){
  if (!state) return;
  captureCurrentDraftToState(true);
  ensureDraftContainers(state);
  const gid = group().id;
  if (state.drafts?.[gid]) delete state.drafts[gid][date];
  draftLastContext = `${gid}|${date}`;
  baseNewLessonWithDrafts(date);
};

// Yakuniy "Saqlash va yopish" qilinganda qoralama endi kerak emas — arxiv yakuniy nusxa bo‘ladi.
const baseSaveCloseWithDrafts = saveClose;
saveClose = function(){
  if (state) {
    ensureDraftContainers(state);
    const gid = group().id, d = state.date;
    if (state.drafts?.[gid]) delete state.drafts[gid][d];
  }
  baseSaveCloseWithDrafts();
};

// app-init tugmalari avvalgi funksiya obyektiga bog‘langan bo‘lishi mumkin; yangisiga qayta ulaymiz.
if ($('todayBtn')) $('todayBtn').onclick = () => chooseDate(today());
if ($('workDate')) $('workDate').onchange = e => { if (e.target.value) chooseDate(e.target.value); };
if ($('newLessonBtn')) $('newLessonBtn').onclick = () => newLesson(state.date);
if ($('closedNewBtn')) $('closedNewBtn').onclick = () => newLesson(today());
if ($('saveCloseBtn')) $('saveCloseBtn').onclick = () => saveClose();

// Race-condition himoyasi: app-daily startup callback'i bu fayldan oldin ishlagan bo‘lsa ham,
// saqlangan bugungi qoralamani blank holat ustiga qayta tiklaymiz.
setTimeout(() => {
  if (!state || !account) return;
  ensureDraftContainers(state);
  const d = today();
  const g = group();
  if (state.archives?.[g.id]?.[d]) return;
  const draft = getLessonDraft(d, g.id);
  if (!draft) return;
  const current = state.date === d ? draftSnapshotFromGroup(g) : null;
  if (state.date !== d || !draftHasMeaningfulDailyData(current)) {
    restoreLessonDraft(d, draft, false);
  }
}, 0);
