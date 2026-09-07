// Har bir dars uchun hisobot bo'limlarini xohlagan kombinatsiyada yoqish/o'chirish.
const defaultReportSections = () => ({ attendance:true, vocab:true, grammar:true, quiz:true });

function normalizedReportSections(v){
  const d = defaultReportSections();
  if (!v || typeof v !== 'object') return d;
  return {
    attendance: v.attendance !== false,
    vocab: v.vocab !== false,
    grammar: v.grammar !== false,
    quiz: v.quiz !== false
  };
}

function ensureReportSections(g){
  if (!g) return defaultReportSections();
  g.reportSections = normalizedReportSections(g.reportSections);
  return g.reportSections;
}

// Eski ma'lumotlar ham avtomatik ravishda barcha bo'limlar yoqilgan holatda ishlaydi.
const baseNormSections = norm;
norm = function(s){
  const out = baseNormSections(s);
  (out.groups || []).forEach(g => ensureReportSections(g));
  Object.values(out.archives || {}).forEach(groupArchives => {
    Object.values(groupArchives || {}).forEach(a => {
      a.reportSections = normalizedReportSections(a.reportSections);
    });
  });
  return out;
};

// Sozlamalar paneliga bo'lim tanlash tugmalarini qo'shamiz.
(function addReportSectionControls(){
  if ($('reportSectionsBox')) return;
  const ratingToggle = $('ratingEnabled')?.closest('label');
  if (!ratingToggle?.parentNode) return;
  const box = document.createElement('div');
  box.id = 'reportSectionsBox';
  box.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #ececf4;border-radius:12px;background:#fafaff';
  box.innerHTML = `
    <div style="font-size:11px;font-weight:800;margin-bottom:8px">🧩 Hisobot bo‘limlari</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
      <label style="display:flex;align-items:center;gap:7px;font-size:11px"><input id="sectionAttendance" type="checkbox"> Davomat</label>
      <label style="display:flex;align-items:center;gap:7px;font-size:11px"><input id="sectionVocab" type="checkbox"> So‘zlar</label>
      <label style="display:flex;align-items:center;gap:7px;font-size:11px"><input id="sectionGrammar" type="checkbox"> Grammatika</label>
      <label style="display:flex;align-items:center;gap:7px;font-size:11px"><input id="sectionQuiz" type="checkbox"> Quiz / test</label>
    </div>
    <div style="font-size:10px;color:#777;margin-top:7px;line-height:1.35">Faqat belgilangan bo‘limlar Telegram hisobotida chiqadi.</div>`;
  ratingToggle.parentNode.insertBefore(box, ratingToggle);
})();

const sectionIds = {
  attendance:'sectionAttendance',
  vocab:'sectionVocab',
  grammar:'sectionGrammar',
  quiz:'sectionQuiz'
};

function syncSectionCheckboxes(){
  if (!state) return;
  const sec = ensureReportSections(group());
  Object.entries(sectionIds).forEach(([key,id]) => {
    const el = $(id);
    if (el) el.checked = !!sec[key];
  });
}

function applyReportSectionUI(){
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
      {index:5,key:'quiz'}
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
}

Object.entries(sectionIds).forEach(([key,id]) => {
  const el = $(id);
  if (!el) return;
  el.onchange = e => {
    const sec = ensureReportSections(group());
    sec[key] = !!e.target.checked;
    saveLocal();
    updateReports();
    applyReportSectionUI();
    renderRating();
  };
});

const baseRenderSettingsSections = renderSettings;
renderSettings = function(){
  baseRenderSettingsSections();
  syncSectionCheckboxes();
  setTimeout(applyReportSectionUI,0);
};

const baseRenderStudentsSections = renderStudents;
renderStudents = function(){
  baseRenderStudentsSections();
  applyReportSectionUI();
};

const baseRenderStudentRowSections = renderStudentRow;
renderStudentRow = function(id){
  baseRenderStudentRowSections(id);
  applyReportSectionUI();
};

// Hisobot manbasi qaysi bo'limlar yoqilganini ham olib yuradi.
source = function(){
  const g = group();
  return {
    title: state.reportTitle,
    groupName: g.name,
    date: state.date,
    quizTotal: g.quizTotal,
    students: g.students,
    reportSections: deep(ensureReportSections(g))
  };
};

// Telefon raqamli va raqamsiz variantlar uchun bitta moslashuvchan hisobot.
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
    if (sec.quiz) l.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
    return l.join('\n');
  });
  return h.join('\n') + '\n\n' + (arr.join('\n\n') || 'O‘quvchilar kiritilmagan.');
};

absText = function(src, includePhone=false){
  const sec = normalizedReportSections(src.reportSections);
  if (!sec.attendance) return '';
  const a = (src.students || []).filter(s => String(s.name||'').trim() && s.attendance === 'kelmadi');
  const rows = a.length ? a.map((s,i) => {
    let t = `${i+1}. ${String(s.name).trim()}`;
    if (includePhone && String(s.phone||'').trim()) t += `\n📞 Telefon: ${String(s.phone).trim()}`;
    return t;
  }) : ['✅ Bugun barcha o‘quvchilar darsda qatnashdi.'];
  return [`🚫 Darsga kelmaganlar`,`👥 Guruh: ${src.groupName}`,`📅 Sana: ${fmt(src.date)}`,'',...rows].join('\n');
};

// Reyting faqat yoqilgan baholash bo'limlari bo'yicha, vaznlarni nisbatda saqlagan holda hisoblanadi.
score = function(s,g){
  const sec = normalizedReportSections(g.reportSections);
  if (sec.attendance && s.attendance === 'kelmadi') return 0;
  const t = v => v==='topshirdi' ? 100 : v==='chala' ? 50 : 0;
  const parts = [];
  if (sec.vocab) parts.push([t(s.vocab),25]);
  if (sec.grammar) parts.push([t(s.grammar),25]);
  if (sec.quiz) parts.push([s.quiz==null?0:Math.min(100,s.quiz/g.quizTotal*100),50]);
  const totalWeight = parts.reduce((n,p)=>n+p[1],0);
  if (!totalWeight) return 0;
  return Math.round(parts.reduce((n,p)=>n+p[0]*p[1],0)/totalWeight);
};

ratingText = function(src){
  const ratingGroup = {quizTotal:src.quizTotal,reportSections:normalizedReportSections(src.reportSections)};
  const ranked=(src.students||[]).filter(s=>String(s.name||'').trim()).map(s=>({s,p:score(s,ratingGroup)})).sort((a,b)=>b.p-a.p);
  return [`🏆 Dars reytingi`,`👥 Guruh: ${src.groupName}`,`📅 Sana: ${fmt(src.date)}`,'',...ranked.map((r,i)=>`${['🥇','🥈','🥉'][i]||''}${i+1}. ${String(r.s.name).trim()} — ${r.p}%`)].join('\n');
};

// Saqlanganda o'sha kunning tanlangan bo'limlari ham arxivga yoziladi.
saveClose = function(){
  const g=group();
  state.archives[g.id]=state.archives[g.id]||{};
  state.archives[g.id][state.date]={
    date:state.date,
    savedAt:new Date().toISOString(),
    students:deep(g.students),
    groupName:g.name,
    quizTotal:g.quizTotal,
    reportTitle:state.reportTitle,
    ratingEnabled:g.ratingEnabled,
    reportSections:deep(ensureReportSections(g))
  };
  state.editorClosed=true;
  state.archiveEditing=null;
  saveLocal();
  render();
  toast('Hisobot saqlandi ✅');
};

// Arxiv ham aynan o'sha kunning bo'limlari bilan ko'rsatiladi va tahrirlanadi.
openArchive = function(date){
  const a=selectedArchive(date);
  if(!a)return;
  const src={
    groupName:a.groupName||group().name,
    date:a.date||date,
    quizTotal:a.quizTotal||50,
    students:a.students||[],
    reportSections:normalizedReportSections(a.reportSections)
  };
  showModal('Saqlangan hisobot',`<div class="sub" style="margin-bottom:8px">${fmt(date)} · ${esc(a.groupName||group().name)}</div><textarea id="archiveText" class="input" style="min-height:280px">${esc(mainText(src))}</textarea><div class="modalacts"><button id="copyAr" class="btn outline">📋 Raqamsiz nusxa</button><button id="copyArPhone" class="btn soft">📞 Raqam bilan nusxa</button><button id="editAr" class="btn soft">✏️ Tahrirlash</button><button id="delAr" class="btn danger">🗑 O‘chirish</button></div>`,null,false);
  setTimeout(()=>{
    $('copyAr').onclick=()=>copy(mainText(src));
    $('copyArPhone').onclick=()=>copy(mainText(src,true));
    $('delAr').onclick=()=>confirmModal('Hisobotni o‘chirish',`${fmt(date)} hisoboti o‘chirilsinmi?`,()=>{delete state.archives[group().id][date];saveLocal();closeModal();render()});
    $('editAr').onclick=()=>{
      state.returnSession={
        groupId:group().id,
        date:state.date,
        students:deep(group().students),
        editorClosed:state.editorClosed,
        quizTotal:group().quizTotal,
        ratingEnabled:group().ratingEnabled,
        reportSections:deep(ensureReportSections(group()))
      };
      group().students=deep(a.students||[]);
      group().quizTotal=a.quizTotal||group().quizTotal;
      group().ratingEnabled=!!a.ratingEnabled;
      group().reportSections=normalizedReportSections(a.reportSections);
      state.date=date;
      state.archiveEditing={groupId:group().id,date};
      state.editorClosed=false;
      closeModal();
      saveLocal();
      render();
    };
  },0);
};

// app-init shu funksiyalarni tugmalarga bog'laydi, shuning uchun bu fayl app-init dan oldin yuklanadi.
