// Har yangi sana uchun kunlik maydonlarni tozalab, ism-familiya va telefon raqamlarini saqlab qoladi.
function resetDailyFieldsKeepStudents(g){
  if (!g || !Array.isArray(g.students)) return;
  g.students = g.students.map(s => ({
    ...s,
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

const chooseDateBeforeDailyReset = chooseDate;
chooseDate = function(date){
  if (!date || !state) return;

  // Avval saqlangan hisobot bo‘lsa, uni yangi dars sifatida tozalamasdan ochamiz.
  const archived = selectedArchive(date);
  if (archived){
    openArchive(date);
    return;
  }

  // Shu sananing o‘zini qayta bosish hech narsani o‘chirmaydi.
  if (date === state.date){
    calendarDate = new Date(date + 'T12:00:00');
    renderCalendar();
    return;
  }

  // Yangi sana: doimiy ma'lumotlar qoladi, kunlik natijalar tozalanadi.
  resetDailyFieldsKeepStudents(group());
  state.date = date;
  state.editorClosed = false;
  state.archiveEditing = null;
  calendarDate = new Date(date + 'T12:00:00');
  saveLocal();
  render();
  toast(fmt(date) + ' — yangi dars tayyor ✅');
};

// "Yangi dars" ham xuddi shu tamoyilda ishlaydi.
newLesson = function(date = state.date){
  const g = group();
  resetDailyFieldsKeepStudents(g);
  state.date = date;
  state.editorClosed = false;
  state.archiveEditing = null;
  calendarDate = new Date(date + 'T12:00:00');
  saveLocal();
  render();
  toast('Yangi dars tayyor ✅');
};

// app-init dagi to‘g‘ridan-to‘g‘ri sana almashtirishni yangi xavfsiz funksiyaga ulaymiz.
if ($('todayBtn')) $('todayBtn').onclick = () => chooseDate(today());
if ($('workDate')) $('workDate').onchange = e => { if (e.target.value) chooseDate(e.target.value); };
if ($('newLessonBtn')) $('newLessonBtn').onclick = () => newLesson(state.date);
if ($('closedNewBtn')) $('closedNewBtn').onclick = () => newLesson(today());
