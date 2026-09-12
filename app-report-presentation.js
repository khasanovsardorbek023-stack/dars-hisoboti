// Asosiy Telegram hisobotini reyting bo‘yicha tartiblash va o‘qilishi qulay bloklarga ajratish.

const baseNormReportPresentation = norm;
norm = function(s){
  const out = baseNormReportPresentation(s);
  (out.groups || []).forEach(g => {
    if (typeof g.mainReportRanked !== 'boolean') g.mainReportRanked = false;
  });
  return out;
};

// Dars sozlamalariga asosiy hisobot tartibi uchun alohida tanlov qo‘shamiz.
(function addMainReportRankingToggle(){
  if ($('mainReportRanked')) return;
  const ratingToggle = $('ratingEnabled')?.closest('label');
  if (!ratingToggle?.parentNode) return;
  const label = document.createElement('label');
  label.id = 'mainReportRankedLabel';
  label.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;background:#f7f7fb;padding:9px;border-radius:10px;font-size:11px;margin-top:8px';
  label.innerHTML = '<span>🏆 Asosiy hisobotni reyting bo‘yicha tartiblash</span><input id="mainReportRanked" type="checkbox">';
  ratingToggle.insertAdjacentElement('afterend', label);

  $('mainReportRanked').onchange = e => {
    if (!state) return;
    group().mainReportRanked = !!e.target.checked;
    saveLocal();
    updateReports();
  };
})();

const baseRenderSettingsReportPresentation = renderSettings;
renderSettings = function(){
  baseRenderSettingsReportPresentation();
  const el = $('mainReportRanked');
  if (el && state) el.checked = !!group().mainReportRanked;
};

const baseSourceReportPresentation = source;
source = function(){
  const src = baseSourceReportPresentation();
  return {...src, mainReportRanked: !!group().mainReportRanked};
};

function taskPercent(v){
  return v === 'topshirdi' ? 100 : v === 'chala' ? 50 : v === 'topshirmadi' ? 0 : null;
}
function homeworkPercent(v){
  return v === 'bajarildi' ? 100 : v === 'chala' ? 50 : v === 'bajarilmadi' ? 0 : null;
}
function levelPercent(v){
  return v === 'alo' ? 100
    : v === 'yaxshi' ? 80
    : v === 'ortacha' ? 60
    : v === 'qoniqarli' ? 40
    : v === 'qoniqarsiz' ? 20
    : null;
}
function attendancePercent(v){
  return v === 'keldi' ? 100 : v === 'kech' ? 70 : v === 'kelmadi' ? 0 : null;
}
function overallResultPercent(s, src){
  const sec = normalizedReportSections(src.reportSections);
  if (sec.attendance && s.attendance === 'kelmadi') return 0;

  const values = [];
  const add = v => { if (typeof v === 'number' && Number.isFinite(v)) values.push(Math.max(0, Math.min(100, v))); };

  if (sec.attendance) add(attendancePercent(s.attendance));
  if (sec.vocab) add(taskPercent(s.vocab));
  if (sec.grammar) add(taskPercent(s.grammar));
  if (sec.homework) add(homeworkPercent(s.homework));
  if (sec.speaking) add(levelPercent(s.speaking));
  if (sec.participation) add(levelPercent(s.participation));
  if (sec.quiz && s.quiz != null && s.quiz !== '') {
    add(Math.min(100, Math.max(0, Number(s.quiz) / Math.max(1, Number(src.quizTotal) || 1) * 100)));
  }

  if (!values.length) return null;
  return Math.round(values.reduce((a,b)=>a+b,0) / values.length);
}

function reportScore(s, src){
  const p = overallResultPercent(s, src);
  return p == null ? 0 : p;
}

function orderedStudentsForMainReport(src){
  const arr = (src.students || [])
    .map((s,index) => ({s,index,p:reportScore(s,src)}))
    .filter(x => String(x.s?.name || '').trim());
  if (!src.mainReportRanked) return arr;
  return arr.sort((a,b) => (b.p - a.p) || (a.index - b.index));
}

// Telegram uchun foydalanuvchi tanlagan aniq emoji va yozuvlar.
function prettyTaskLabel(v){
  return v === 'topshirdi' ? 'Topshirildi ✅'
    : v === 'chala' ? 'Chala topshirildi ⚠️'
    : v === 'topshirmadi' ? 'Topshirilmadi ❌'
    : 'Belgilanmagan ➖';
}
function prettyHomeworkLabel(v){
  return v === 'bajarildi' ? 'Bajarilingan ✅'
    : v === 'chala' ? 'Chala bajarilingan ⚠️'
    : v === 'bajarilmadi' ? 'Bajarilinmagan ❌'
    : 'Belgilanmagan ➖';
}
function prettySpeakingLabel(v){
  return v === 'alo' ? 'A’lo 🏆'
    : v === 'yaxshi' ? 'Yaxshi 🏅'
    : v === 'ortacha' ? 'O‘rtacha ✅'
    : v === 'qoniqarli' ? 'Qoniqarli ⚠️'
    : v === 'qoniqarsiz' ? 'Qoniqarsiz ❌'
    : 'Belgilanmagan ➖';
}
function prettyParticipationLabel(v){
  return prettySpeakingLabel(v);
}
function prettyAttendanceLabel(v){
  return v === 'keldi' ? 'Keldi ✅'
    : v === 'kech' ? 'Kech keldi ⏰'
    : v === 'kelmadi' ? 'Kelmadi ❌'
    : 'Belgilanmagan ➖';
}

mainText = function(src, includePhone=false){
  const sec = normalizedReportSections(src.reportSections);
  const ordered = orderedStudentsForMainReport(src);
  const header = [
    '📚 Bugungi dars hisoboti',
    `👥 Guruh: ${src.groupName}`,
    `📅 Sana: ${fmt(src.date)}`
  ];

  if (!ordered.length) return header.join('\n') + '\n\nO‘quvchilar kiritilmagan.';

  const divider = '──────────────';
  const blocks = ordered.map((item,i) => {
    const s = item.s;
    const medal = src.mainReportRanked ? (['🥇','🥈','🥉'][i] || '') : '';
    const firstLine = medal ? `${medal} ${i+1}. ${String(s.name).trim()}` : `${i+1}. ${String(s.name).trim()}`;
    const lines = [firstLine];

    if (includePhone && String(s.phone || '').trim()) lines.push(`📞 Telefon: ${String(s.phone).trim()}`);

    if (sec.attendance) lines.push(`👨‍🏫 Davomat: ${prettyAttendanceLabel(s.attendance)}`);

    if (sec.attendance && s.attendance === 'kelmadi') {
      lines.push('📊 Umumiy natijalar foizi: 0%');
      return lines.join('\n');
    }

    if (sec.vocab) lines.push(`🔤 So‘zlar: ${prettyTaskLabel(s.vocab)}`);
    if (sec.grammar) lines.push(`📘 Grammatika: ${prettyTaskLabel(s.grammar)}`);
    if (sec.homework) lines.push(`🏠 Uyga vazifa qilib berilgan Topshiriqlar: ${prettyHomeworkLabel(s.homework)}`);
    if (sec.speaking) lines.push(`🗣 Gapirish savollariga berilgan javoblar: ${prettySpeakingLabel(s.speaking)}`);
    if (sec.participation) lines.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${prettyParticipationLabel(s.participation)}`);
    if (sec.quiz) lines.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);

    const overall = overallResultPercent(s, src);
    lines.push(`📊 Umumiy natijalar foizi: ${overall == null ? '➖' : overall + '%'}`);
    return lines.join('\n');
  });

  return header.join('\n') + '\n\n' + divider + '\n' + blocks.join(`\n${divider}\n`) + '\n' + divider;
};

ratingText = function(src){
  const ratingGroup = {
    quizTotal: Math.max(1, Number(src.quizTotal) || 1),
    reportSections: normalizedReportSections(src.reportSections)
  };
  const ranked = (src.students || [])
    .filter(s => String(s.name || '').trim())
    .map((s,index) => ({s,index,p:score(s,ratingGroup)}))
    .sort((a,b) => (b.p-a.p) || (a.index-b.index));

  return [
    '🏆 O‘quvchining dars davomida qatnashish reytingi',
    `👥 Guruh: ${src.groupName}`,
    `📅 Sana: ${fmt(src.date)}`,
    '',
    ...ranked.map((r,i) => `${['🥇','🥈','🥉'][i]||''}${i+1}. ${String(r.s.name).trim()} — ${r.p}%`)
  ].join('\n');
};

// Saytdagi reyting kartasi nomini ham yangi nomga moslaymiz.
function syncRatingTitle(){
  const title = $('ratingCard')?.querySelector('.title');
  if (title) title.textContent = '🏆 O‘quvchining dars davomida qatnashish reytingi';
}
const baseRenderRatingReportPresentation = renderRating;
renderRating = function(){
  baseRenderRatingReportPresentation();
  syncRatingTitle();
};
syncRatingTitle();
