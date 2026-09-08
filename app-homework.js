// "Uyga vazifa qilib berilgan mashqlar" hisobot bo‘limi.
// Variantlar: Bajarilingan, Chala bajarilingan, Bajarilinmagan.
// Bu bo‘lim reyting formulasiga ta'sir qilmaydi.

const baseNormalizedHomework = normalizedReportSections;
normalizedReportSections = function(v){
  const base = baseNormalizedHomework(v);
  return {
    ...base,
    homework: !v || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v,'homework')
      ? true
      : v.homework !== false
  };
};

// Eski arxivlarda bu bo‘lim bo‘lmagan, shuning uchun ularni o‘zgartirmaymiz.
const baseNormHomework = norm;
norm = function(s){
  const missingInOldArchives = new Set();
  if (s?.archives && typeof s.archives === 'object') {
    Object.entries(s.archives).forEach(([gid, groupArchives]) => {
      Object.entries(groupArchives || {}).forEach(([date, a]) => {
        if (!a?.reportSections || !Object.prototype.hasOwnProperty.call(a.reportSections,'homework')) {
          missingInOldArchives.add(gid + '|' + date);
        }
      });
    });
  }

  const out = baseNormHomework(s);
  (out.groups || []).forEach(g => {
    ensureReportSections(g);
    if (!Object.prototype.hasOwnProperty.call(g.reportSections,'homework')) g.reportSections.homework = true;
    (g.students || []).forEach(st => {
      if (!Object.prototype.hasOwnProperty.call(st,'homework')) st.homework = null;
    });
  });
  Object.entries(out.archives || {}).forEach(([gid, groupArchives]) => {
    Object.entries(groupArchives || {}).forEach(([date, a]) => {
      a.reportSections = normalizedReportSections(a.reportSections);
      if (missingInOldArchives.has(gid + '|' + date)) a.reportSections.homework = false;
      (a.students || []).forEach(st => {
        if (!Object.prototype.hasOwnProperty.call(st,'homework')) st.homework = null;
      });
    });
  });
  return out;
};

// Yangi darsda ism/telefon qoladi, uyga vazifa va qatnashish holati tozalanadi.
const baseFreshStudentsHomework = freshStudents;
freshStudents = function(g){
  return baseFreshStudentsHomework(g).map(st => ({
    ...st,
    homework: null,
    participation: null
  }));
};

// Sozlamalarga checkbox qo‘shamiz — Grammatika va qatnashish ko‘rsatkichi orasida.
(function addHomeworkSectionToggle(){
  if ($('sectionHomework')) return;
  const participationToggle = $('sectionParticipation')?.closest('label');
  const quizToggle = $('sectionQuiz')?.closest('label');
  const anchor = participationToggle || quizToggle;
  if (!anchor?.parentNode) return;
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:11px';
  label.innerHTML = '<input id="sectionHomework" type="checkbox"> Uyga vazifa mashqlari';
  anchor.parentNode.insertBefore(label, anchor);
})();

const baseSyncHomework = syncSectionCheckboxes;
syncSectionCheckboxes = function(){
  baseSyncHomework();
  const el = $('sectionHomework');
  if (el && state) el.checked = !!ensureReportSections(group()).homework;
};

if ($('sectionHomework')) {
  $('sectionHomework').onchange = e => {
    ensureReportSections(group()).homework = !!e.target.checked;
    saveLocal();
    updateReports();
    applyReportSectionUI();
  };
}

function homeworkLabel(v){
  return v === 'bajarildi'
    ? '✅ Bajarilingan'
    : v === 'chala'
      ? '⚠️ Chala bajarilingan'
      : v === 'bajarilmadi'
        ? '❌ Bajarilinmagan'
        : '➖ Belgilanmagan';
}

// Grammatika va Darsda qatnashish ko‘rsatkichi orasiga yangi ustun.
const baseRowHtmlHomework = rowHtml;
rowHtml = function(s){
  const html = baseRowHtmlHomework(s);
  const absent = s.attendance === 'kelmadi';
  const opt = (val,label,tone) => `<button class="opt ${s.homework===val?'on '+tone:''}" data-act="homework" data-val="${val}" ${absent?'disabled':''}>${label}</button>`;
  const cell = `<div class="mobilelabel" data-label="Uyga vazifa qilib berilgan mashqlar"><div class="status">${opt('bajarildi','Bajarilingan','good')}${opt('chala','Chala bajarilingan','warn')}${opt('bajarilmadi','Bajarilinmagan','bad')}</div></div>`;
  const marker = '<div class="mobilelabel" data-label="Darsda qatnashish ko‘rsatkichi">';
  return html.replace(marker, cell + marker);
};

// Yangi ustunlar tartibiga mos yoqish/o‘chirish.
applyReportSectionUI = function(){
  if (!state) return;
  const sec = ensureReportSections(group());
  const absenceCard = $('absenceReport')?.closest('section');
  if (absenceCard) absenceCard.classList.toggle('hidden', !sec.attendance);

  document.querySelectorAll('.srow').forEach(row => {
    const studentId = row.dataset.id;
    const st = group().students.find(s => s.id === studentId);
    const effectivelyAbsent = sec.attendance && st?.attendance === 'kelmadi';
    const cells = row.children;
    const settings = [
      {index:2,key:'attendance'},
      {index:3,key:'vocab'},
      {index:4,key:'grammar'},
      {index:5,key:'homework'},
      {index:6,key:'participation'},
      {index:7,key:'quiz'}
    ];
    settings.forEach(({index,key}) => {
      const cell = cells[index];
      if (!cell) return;
      const enabled = !!sec[key];
      cell.style.opacity = enabled ? '' : '.32';
      cell.style.filter = enabled ? '' : 'grayscale(.3)';
      if (key === 'quiz') {
        const input = cell.querySelector('[data-quiz]');
        if (input) input.disabled = !enabled || effectivelyAbsent;
      } else {
        cell.querySelectorAll('[data-act]').forEach(btn => {
          btn.disabled = !enabled || (key !== 'attendance' && effectivelyAbsent);
        });
      }
    });
  });
};

// Attendance "Kelmadi" bo‘lsa yangi kunlik maydonlarni ham tozalaymiz.
const baseBindRowHomework = bindRow;
bindRow = function(el){
  baseBindRowHomework(el);
  const id = el.dataset.id;
  el.querySelectorAll('[data-act="attendance"]').forEach(btn => {
    const oldClick = btn.onclick;
    btn.onclick = () => {
      if (oldClick) oldClick();
      const st = group().students.find(x => x.id === id);
      if (st?.attendance === 'kelmadi') {
        st.homework = null;
        st.participation = null;
        saveLocal();
        renderStudentRow(id);
        updateReports();
      }
    };
  });
};

// Telegram hisobotiga ham qo‘shamiz.
mainText = function(src, includePhone=false){
  const sec = normalizedReportSections(src.reportSections);
  const h = [`📚 Bugun dars hisoboti`,`👥 Guruh: ${src.groupName}`,`📅 Sana: ${fmt(src.date)}`];
  const arr = (src.students || []).filter(s => String(s.name||'').trim()).map((s,i) => {
    const l = [`${i+1}. ${String(s.name).trim()}`];
    if (includePhone && String(s.phone||'').trim()) l.push(`📞 Telefon: ${String(s.phone).trim()}`);
    if (sec.attendance && s.attendance === 'kelmadi') {
      l.push('🚫 Darsga kelmadi');
      return l.join('\n');
    }
    if (sec.attendance) l.push(`👨‍🏫 Davomat: ${s.attendance==='keldi'?'✅ Keldi':s.attendance==='kech'?'⏰ Kech qolib keldi':'➖ Belgilanmagan'}`);
    if (sec.vocab) l.push(`🔤 So‘zlar: ${taskLabel(s.vocab)}`);
    if (sec.grammar) l.push(`📘 Grammatika: ${taskLabel(s.grammar)}`);
    if (sec.homework) l.push(`🏠 Uyga vazifa qilib berilgan mashqlar: ${homeworkLabel(s.homework)}`);
    if (sec.participation) l.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${participationLabel(s.participation)}`);
    if (sec.quiz) l.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
    return l.join('\n');
  });
  return h.join('\n') + '\n\n' + (arr.join('\n\n') || 'O‘quvchilar kiritilmagan.');
};
