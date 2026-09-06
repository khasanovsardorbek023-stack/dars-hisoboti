// Telefon raqami funksiyasi va raqamli/raqamsiz hisobot nusxalari.
const baseNormWithPhones = norm;
norm = function(s){
  const out = baseNormWithPhones(s);
  out.groups.forEach(g => (g.students || []).forEach(st => {
    if (!('phone' in st)) st.phone = '';
    st.phone = st.phone || '';
  }));
  return out;
};

freshStudents = function(g){
  return (g.roster || []).filter(Boolean).map(name => {
    const old = (g.students || []).find(s => s.name.trim() === String(name).trim());
    return {
      id: old?.id || uid('st'),
      name: String(name),
      phone: old?.phone || '',
      attendance: null,
      vocab: null,
      grammar: null,
      quiz: null
    };
  });
};

rowHtml = function(s){
  const absent = s.attendance === 'kelmadi';
  const opt = (field,val,label,tone) => `<button class="opt ${s[field]===val?'on '+tone:''}" data-act="${field}" data-val="${val}" ${absent&&field!=='attendance'?'disabled':''}>${label}</button>`;
  return `<div class="srow" data-id="${s.id}">
    <div><input type="checkbox"></div>
    <div class="mobilelabel" data-label="Ism familiya va telefon">
      <div class="identitybox">
        <input class="input nameinput" data-name value="${esc(s.name)}" title="${esc(s.name)}" placeholder="Ism familiya">
        <input class="input phoneinput" data-phone type="tel" inputmode="tel" autocomplete="tel" value="${esc(s.phone||'')}" title="${esc(s.phone||'')}" placeholder="Telefon: +998 90 123 45 67">
      </div>
    </div>
    <div class="mobilelabel" data-label="Davomat"><div class="status">${opt('attendance','keldi','Keldi','good')}${opt('attendance','kech','Kech qolib keldi','warn')}${opt('attendance','kelmadi','Kelmadi','bad')}</div></div>
    <div class="mobilelabel" data-label="So‘zlar"><div class="status">${opt('vocab','topshirdi','Topshirdi','good')}${opt('vocab','chala','Chala topshirdi','warn')}${opt('vocab','topshirmadi','Topshirmadi','bad')}</div></div>
    <div class="mobilelabel" data-label="Grammatika"><div class="status">${opt('grammar','topshirdi','Topshirdi','good')}${opt('grammar','chala','Chala topshirdi','warn')}${opt('grammar','topshirmadi','Topshirmadi','bad')}</div></div>
    <div class="mobilelabel" data-label="Quiz"><div class="quizbox"><input class="input quizinput" data-quiz type="number" min="0" max="${group().quizTotal}" inputmode="numeric" value="${s.quiz??''}" ${absent?'disabled':''}><span class="sub">/${group().quizTotal}</span><span class="pct">${s.quiz!=null?Math.round(s.quiz/group().quizTotal*100)+'%':''}</span></div></div>
    <div><button class="del" data-del>🗑</button></div>
  </div>`;
};

bindRow = function(el){
  const id = el.dataset.id;
  el.querySelector('[data-name]').addEventListener('input', e => {
    const s = group().students.find(x => x.id === id);
    if (!s) return;
    s.name = e.target.value;
    e.target.title = e.target.value;
    group().roster = group().students.map(x => x.name);
    saveLocal();
    updateReports();
  });
  el.querySelector('[data-phone]').addEventListener('input', e => {
    const s = group().students.find(x => x.id === id);
    if (!s) return;
    s.phone = e.target.value;
    e.target.title = e.target.value;
    saveLocal();
  });
  el.querySelector('[data-quiz]').addEventListener('input', e => {
    const s = group().students.find(x => x.id === id);
    if (!s) return;
    const v = e.target.value;
    s.quiz = v === '' ? null : Math.max(0, Math.min(group().quizTotal, Number(v) || 0));
    el.querySelector('.pct').textContent = s.quiz == null ? '' : Math.round(s.quiz/group().quizTotal*100) + '%';
    saveLocal();
    updateReports();
  });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const s = group().students.find(x => x.id === id), field = b.dataset.act, val = b.dataset.val;
    if (!s) return;
    if (field === 'attendance') {
      s.attendance = s.attendance === val ? null : val;
      if (s.attendance === 'kelmadi') { s.vocab = null; s.grammar = null; s.quiz = null; }
    } else {
      s[field] = s[field] === val ? null : val;
    }
    saveLocal();
    renderStudentRow(id);
    updateReports();
  });
  el.querySelector('[data-del]').onclick = () => confirmModal('O‘quvchini o‘chirish', `“${group().students.find(x=>x.id===id)?.name||'O‘quvchi'}” o‘chirilsinmi?`, () => {
    group().students = group().students.filter(x => x.id !== id);
    group().roster = group().students.map(x => x.name);
    saveLocal();
    render();
  });
};

mainText = function(src, includePhone=false){
  const h = [`📚 Bugun dars hisoboti`,`👥 Guruh: ${src.groupName}`,`📅 Sana: ${fmt(src.date)}`];
  const arr = src.students.filter(s => s.name.trim()).map((s,i) => {
    const l = [`${i+1}. ${s.name.trim()}`];
    if (includePhone && String(s.phone||'').trim()) l.push(`📞 Telefon: ${String(s.phone).trim()}`);
    if (s.attendance === 'kelmadi') {
      l.push('🚫 Darsga kelmadi');
      return l.join('\n');
    }
    l.push(`👨‍🏫 Davomat: ${s.attendance==='keldi'?'✅ Keldi':s.attendance==='kech'?'⏰ Kech qolib keldi':'➖ Belgilanmagan'}`);
    l.push(`🔤 So‘zlar: ${taskLabel(s.vocab)}`);
    l.push(`📘 Grammatika: ${taskLabel(s.grammar)}`);
    l.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);
    return l.join('\n');
  });
  return h.join('\n') + '\n\n' + (arr.join('\n\n') || 'O‘quvchilar kiritilmagan.');
};

absText = function(src, includePhone=false){
  const a = src.students.filter(s => s.name.trim() && s.attendance === 'kelmadi');
  const rows = a.length ? a.map((s,i) => {
    let t = `${i+1}. ${s.name.trim()}`;
    if (includePhone && String(s.phone||'').trim()) t += `\n📞 Telefon: ${String(s.phone).trim()}`;
    return t;
  }) : ['✅ Bugun barcha o‘quvchilar darsda qatnashdi.'];
  return [`🚫 Darsga kelmaganlar`,`👥 Guruh: ${src.groupName}`,`📅 Sana: ${fmt(src.date)}`,'',...rows].join('\n');
};

openArchive = function(date){
  const a = selectedArchive(date);
  if (!a) return;
  const src = {groupName:a.groupName||group().name,date:a.date||date,quizTotal:a.quizTotal||50,students:a.students||[]};
  showModal('Saqlangan hisobot', `<div class="sub" style="margin-bottom:8px">${fmt(date)} · ${esc(a.groupName||group().name)}</div><textarea id="archiveText" class="input" style="min-height:280px">${esc(mainText(src))}</textarea><div class="modalacts"><button id="copyAr" class="btn outline">📋 Nomersiz nusxa</button><button id="copyArPhone" class="btn soft">📞 Nomer bilan nusxa</button><button id="editAr" class="btn soft">✏️ Tahrirlash</button><button id="delAr" class="btn danger">🗑 O‘chirish</button></div>`, null, false);
  setTimeout(() => {
    $('copyAr').onclick = () => copy(mainText(src));
    $('copyArPhone').onclick = () => copy(mainText(src,true));
    $('delAr').onclick = () => confirmModal('Hisobotni o‘chirish', `${fmt(date)} hisoboti o‘chirilsinmi?`, () => {
      delete state.archives[group().id][date];
      saveLocal();
      closeModal();
      render();
    });
    $('editAr').onclick = () => {
      state.returnSession = {groupId:group().id,date:state.date,students:deep(group().students),editorClosed:state.editorClosed};
      group().students = deep(a.students||[]);
      group().quizTotal = a.quizTotal || group().quizTotal;
      group().ratingEnabled = !!a.ratingEnabled;
      state.date = date;
      state.archiveEditing = {groupId:group().id,date};
      state.editorClosed = false;
      closeModal();
      saveLocal();
      render();
    };
  },0);
};

setTimeout(() => {
  const mainPhone = $('copyMainPhone');
  const absPhone = $('copyAbsPhone');
  const closedPhone = $('copyClosedPhoneBtn');
  if (mainPhone) mainPhone.onclick = () => copy(mainText(source(), true));
  if (absPhone) absPhone.onclick = () => copy(absText(source(), true));
  if (closedPhone) closedPhone.onclick = () => copy(mainText(source(), true));
}, 0);
