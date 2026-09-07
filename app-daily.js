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
