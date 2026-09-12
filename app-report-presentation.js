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

function reportScore(s, src){
  try {
    return score(s, {
      quizTotal: Math.max(1, Number(src.quizTotal) || 1),
      reportSections: normalizedReportSections(src.reportSections)
    });
  } catch {
    return 0;
  }
}

function orderedStudentsForMainReport(src){
  const arr = (src.students || [])
    .map((s,index) => ({s,index,p:reportScore(s,src)}))
    .filter(x => String(x.s?.name || '').trim());
  if (!src.mainReportRanked) return arr;
  return arr.sort((a,b) => (b.p - a.p) || (a.index - b.index));
}

function prettyTaskLabel(v){
  const t = taskLabel(v);
  return t.replace(/^⚠️\s*/, '🟠 ');
}
function prettyHomeworkLabel(v){
  const t = homeworkLabel(v);
  return t.replace(/^⚠️\s*/, '🟠 ');
}
function prettySpeakingLabel(v){
  if (v === 'ortacha') return '🙂 O‘rtacha';
  if (v === 'qoniqarli') return '👍 Qoniqarli';
  return speakingLabel(v);
}
function prettyParticipationLabel(v){
  if (v === 'ortacha') return '🙂 O‘rtacha';
  if (v === 'qoniqarli') return '👍 Qoniqarli';
  return participationLabel(v);
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

    if (sec.attendance && s.attendance === 'kelmadi') {
      lines.push('🚫 Darsga kelmadi');
      return lines.join('\n');
    }

    if (sec.attendance) lines.push(`👨‍🏫 Davomat: ${s.attendance==='keldi'?'✅ Keldi':s.attendance==='kech'?'⏰ Kech qolib keldi':'➖ Belgilanmagan'}`);
    if (sec.vocab) lines.push(`🔤 So‘zlar: ${prettyTaskLabel(s.vocab)}`);
    if (sec.grammar) lines.push(`📘 Grammatika: ${prettyTaskLabel(s.grammar)}`);
    if (sec.homework) lines.push(`🏠 Uyga vazifa qilib berilgan mashqlar: ${prettyHomeworkLabel(s.homework)}`);
    if (sec.speaking) lines.push(`🗣 Gapirish savollariga berilgan javoblar: ${prettySpeakingLabel(s.speaking)}`);
    if (sec.participation) lines.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${prettyParticipationLabel(s.participation)}`);
    if (sec.quiz) lines.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
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
