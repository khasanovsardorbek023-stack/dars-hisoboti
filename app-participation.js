// "Darsda qatnashish ko‘rsatkichi" hisobot bo‘limi.
// Darajalar: A’lo, Yaxshi, O‘rtacha, Qoniqarli, Qoniqarsiz.
// Bu bo‘lim reyting formulasiga ta'sir qilmaydi.

const baseNormalizedParticipation = normalizedReportSections;
normalizedReportSections = function(v){
  const base = baseNormalizedParticipation(v);
  return {
    ...base,
    participation: !v || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v,'participation')
      ? true
      : v.participation !== false
  };
};

function migrateParticipationValue(v){
  // Oldingi 3 ta variantdan yangi 5 ta variantga moslash.
  if (v === 'yaxshi_emas') return 'qoniqarli';
  if (v === 'umuman') return 'qoniqarsiz';
  if (['alo','yaxshi','ortacha','qoniqarli','qoniqarsiz'].includes(v)) return v;
  return null;
}

// Eski arxivlarda bu funksiya mavjud bo‘lmagan, shuning uchun ularda avtomatik ko‘rsatmaymiz.
const baseNormParticipation = norm;
norm = function(s){
  const missingInOldArchives = new Set();
  if (s?.archives && typeof s.archives === 'object') {
    Object.entries(s.archives).forEach(([gid, groupArchives]) => {
      Object.entries(groupArchives || {}).forEach(([date, a]) => {
        if (!a?.reportSections || !Object.prototype.hasOwnProperty.call(a.reportSections,'participation')) {
          missingInOldArchives.add(gid + '|' + date);
        }
      });
    });
  }

  const out = baseNormParticipation(s);
  (out.groups || []).forEach(g => {
    ensureReportSections(g);
    if (!Object.prototype.hasOwnProperty.call(g.reportSections,'participation')) g.reportSections.participation = true;
    (g.students || []).forEach(st => {
      st.participation = migrateParticipationValue(st.participation);
    });
  });
  Object.entries(out.archives || {}).forEach(([gid, groupArchives]) => {
    Object.entries(groupArchives || {}).forEach(([date, a]) => {
      a.reportSections = normalizedReportSections(a.reportSections);
      if (missingInOldArchives.has(gid + '|' + date)) a.reportSections.participation = false;
      (a.students || []).forEach(st => {
        st.participation = migrateParticipationValue(st.participation);
      });
    });
  });
  return out;
};

// Sozlamalar ichiga yangi checkbox qo‘shamiz.
(function addParticipationSectionToggle(){
  if ($('sectionParticipation')) return;
  const quizToggle = $('sectionQuiz')?.closest('label');
  if (!quizToggle?.parentNode) return;
  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:11px';
  label.innerHTML = '<input id="sectionParticipation" type="checkbox"> Darsda qatnashish ko‘rsatkichi';
  quizToggle.parentNode.insertBefore(label, quizToggle);
})();

const baseSyncSectionParticipation = syncSectionCheckboxes;
syncSectionCheckboxes = function(){
  baseSyncSectionParticipation();
  const el = $('sectionParticipation');
  if (el && state) el.checked = !!ensureReportSections(group()).participation;
};

if ($('sectionParticipation')) {
  $('sectionParticipation').onchange = e => {
    ensureReportSections(group()).participation = !!e.target.checked;
    saveLocal();
    updateReports();
    applyReportSectionUI();
  };
}

function participationLabel(v){
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

// Grammatika va Quiz orasiga yangi ustun qo‘shamiz.
const baseRowHtmlParticipation = rowHtml;
rowHtml = function(s){
  const html = baseRowHtmlParticipation(s);
  const absent = s.attendance === 'kelmadi';
  const opt = (val,label,tone) => `<button class="opt ${s.participation===val?'on '+tone:''}" data-act="participation" data-val="${val}" ${absent?'disabled':''}>${label}</button>`;
  const cell = `<div class="mobilelabel" data-label="Darsda qatnashish ko‘rsatkichi"><div class="status">${opt('alo','A’lo','good')}${opt('yaxshi','Yaxshi','good')}${opt('ortacha','O‘rtacha','warn')}${opt('qoniqarli','Qoniqarli','warn')}${opt('qoniqarsiz','Qoniqarsiz','bad')}</div></div>`;
  return html.replace('<div class="mobilelabel" data-label="Quiz">', cell + '<div class="mobilelabel" data-label="Quiz">');
};

// Yoqilgan/o‘chirilgan bo‘limlarni yangi ustun tartibida boshqaramiz.
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
      {index:5,key:'participation'},
      {index:6,key:'quiz'}
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
    if (sec.participation) l.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${participationLabel(s.participation)}`);
    if (sec.quiz) l.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
    return l.join('\n');
  });
  return h.join('\n') + '\n\n' + (arr.join('\n\n') || 'O‘quvchilar kiritilmagan.');
};
