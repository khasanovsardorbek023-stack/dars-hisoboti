// "Speaking savollariga berilgan javoblar" hisobot bo‘limi.
// Variantlar: A’lo, Yaxshi, O‘rtacha, Qoniqarli, Qoniqarsiz.
// Bu bo‘lim reyting formulasiga ta'sir qilmaydi.

const baseNormalizedSpeaking = normalizedReportSections;
normalizedReportSections = function(v){
  const base = baseNormalizedSpeaking(v);
  return {
    ...base,
    speaking: !v || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v,'speaking')
      ? true
      : v.speaking !== false
  };
};

// Eski arxivlarda Speaking bo‘lmagan, shuning uchun ularni o‘zgartirmaymiz.
const baseNormSpeaking = norm;
norm = function(s){
  const missingInOldArchives = new Set();
  if (s?.archives && typeof s.archives === 'object') {
    Object.entries(s.archives).forEach(([gid, groupArchives]) => {
      Object.entries(groupArchives || {}).forEach(([date, a]) => {
        if (!a?.reportSections || !Object.prototype.hasOwnProperty.call(a.reportSections,'speaking')) {
          missingInOldArchives.add(gid + '|' + date);
        }
      });
    });
  }

  const out = baseNormSpeaking(s);
  (out.groups || []).forEach(g => {
    ensureReportSections(g);
    if (!Object.prototype.hasOwnProperty.call(g.reportSections,'speaking')) g.reportSections.speaking = true;
    (g.students || []).forEach(st => {
      if (!Object.prototype.hasOwnProperty.call(st,'speaking')) st.speaking = null;
    });
  });
  Object.entries(out.archives || {}).forEach(([gid, groupArchives]) => {
    Object.entries(groupArchives || {}).forEach(([date, a]) => {
      a.reportSections = normalizedReportSections(a.reportSections);
      if (missingInOldArchives.has(gid + '|' + date)) a.reportSections.speaking = false;
      (a.students || []).forEach(st => {
        if (!Object.prototype.hasOwnProperty.call(st,'speaking')) st.speaking = null;
      });
    });
  });
  return out;
};

// Yangi darsda Speaking javobi tozalanadi.
const baseFreshStudentsSpeaking = freshStudents;
freshStudents = function(g){
  return baseFreshStudentsSpeaking(g).map(st => ({...st, speaking:null}));
};

// Sozlamalarga checkbox: Uyga vazifadan keyin, qatnashish ko‘rsatkichidan oldin.
(function addSpeakingSectionToggle(){
  if ($('sectionSpeaking')) return;
  const participationToggle = $('sectionParticipation')?.closest('label');
  const quizToggle = $('sectionQuiz')?.closest('label');
  const anchor = participationToggle || quizToggle;
  if (!anchor?.parentNode) return;
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:11px';
  label.innerHTML = '<input id="sectionSpeaking" type="checkbox"> Speaking javoblari';
  anchor.parentNode.insertBefore(label, anchor);
})();

const baseSyncSpeaking = syncSectionCheckboxes;
syncSectionCheckboxes = function(){
  baseSyncSpeaking();
  const el = $('sectionSpeaking');
  if (el && state) el.checked = !!ensureReportSections(group()).speaking;
};

if ($('sectionSpeaking')) {
  $('sectionSpeaking').onchange = e => {
    ensureReportSections(group()).speaking = !!e.target.checked;
    saveLocal();
    updateReports();
    applyReportSectionUI();
  };
}

function speakingLabel(v){
  return v === 'alo'
    ? '🌟 A’lo'
    : v === 'yaxshi'
      ? '✅ Yaxshi'
      : v === 'ortacha'
        ? '🟡 O‘rtacha'
        : v === 'qoniqarli'
          ? '⚠️ Qoniqarli'
          : v === 'qoniqarsiz'
            ? '❌ Qoniqarsiz'
            : '➖ Belgilanmagan';
}

// Uyga vazifa va Darsda qatnashish ko‘rsatkichi orasiga Speaking ustuni.
const baseRowHtmlSpeaking = rowHtml;
rowHtml = function(s){
  const html = baseRowHtmlSpeaking(s);
  const absent = s.attendance === 'kelmadi';
  const opt = (val,label,tone) => `<button class="opt ${s.speaking===val?'on '+tone:''}" data-act="speaking" data-val="${val}" ${absent?'disabled':''}>${label}</button>`;
  const cell = `<div class="mobilelabel" data-label="Speaking savollariga berilgan javoblar"><div class="status">${opt('alo','A’lo','good')}${opt('yaxshi','Yaxshi','good')}${opt('ortacha','O‘rtacha','warn')}${opt('qoniqarli','Qoniqarli','warn')}${opt('qoniqarsiz','Qoniqarsiz','bad')}</div></div>`;
  const marker = '<div class="mobilelabel" data-label="Darsda qatnashish ko‘rsatkichi">';
  return html.replace(marker, cell + marker);
};

// Yangi ustun tartibiga mos yoqish/o‘chirish.
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
      {index:6,key:'speaking'},
      {index:7,key:'participation'},
      {index:8,key:'quiz'}
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

// "Kelmadi" bo‘lsa Speaking holatini ham tozalaymiz.
const baseBindRowSpeaking = bindRow;
bindRow = function(el){
  baseBindRowSpeaking(el);
  const id = el.dataset.id;
  el.querySelectorAll('[data-act="attendance"]').forEach(btn => {
    const oldClick = btn.onclick;
    btn.onclick = () => {
      if (oldClick) oldClick();
      const st = group().students.find(x => x.id === id);
      if (st?.attendance === 'kelmadi') {
        st.speaking = null;
        saveLocal();
        renderStudentRow(id);
        updateReports();
      }
    };
  });
};

// Telegram hisobotiga Speaking qatorini qo‘shamiz.
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
    if (sec.speaking) l.push(`🗣 Speaking savollariga berilgan javoblar: ${speakingLabel(s.speaking)}`);
    if (sec.participation) l.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${participationLabel(s.participation)}`);
    if (sec.quiz) l.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
    return l.join('\n');
  });
  return h.join('\n') + '\n\n' + (arr.join('\n\n') || 'O‘quvchilar kiritilmagan.');
};
