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

// Arxiv hisobotini tahrirlashga kirilganda app-phone.js joriy ishchi darsni
// returnSession ichida saqlaydi. Yangi sanaga o‘tayotganda ism va telefonlarni
// eski arxivdan emas, aynan shu joriy ro‘yxatdan olish kerak.
function persistentStudentsForNewDate(){
  const g = group();
  if (state.archiveEditing && state.returnSession && Array.isArray(state.returnSession.students)) {
    return state.returnSession.students.map(s => ({
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

chooseDate = function(date){
  if (!date || !state) return;

  // Saqlangan eski hisobot bo‘lsa, tarix sifatida ochiladi.
  const archived = selectedArchive(date);
  if (archived){
    openArchive(date);
    return;
  }

  // Shu sananing o‘zini qayta bosish hech narsani o‘chirmaydi.
  // Arxiv tahrirlash rejimida bo‘lsak esa bu qoida ishlamaydi: yangi ishchi
  // holatga chiqish uchun pastdagi reset bajarilishi kerak.
  if (date === state.date && !state.archiveEditing){
    calendarDate = new Date(date + 'T12:00:00');
    renderCalendar();
    return;
  }

  const identities = persistentStudentsForNewDate();
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

// app-init dagi sana tugmalarini yangi xavfsiz funksiyaga ulaymiz.
if ($('todayBtn')) $('todayBtn').onclick = () => chooseDate(today());
if ($('workDate')) $('workDate').onchange = e => { if (e.target.value) chooseDate(e.target.value); };
if ($('newLessonBtn')) $('newLessonBtn').onclick = () => newLesson(state.date);
if ($('closedNewBtn')) $('closedNewBtn').onclick = () => newLesson(today());
