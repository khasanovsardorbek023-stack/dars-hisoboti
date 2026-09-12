// Saqlash va yopish bosilmagan darslarni ham guruh+sana bo‘yicha qoralama sifatida saqlash.
// Bu fayl app-init.js dan OLDIN yuklanadi: login/pull paytidayoq eski ishchi kun yo‘qolib ketmasin.

let draftLastContext = '';

function ensureDraftContainers(s){
  if (!s || typeof s !== 'object') return s;
  s.drafts = s.drafts && typeof s.drafts === 'object' ? s.drafts : {};
  (s.groups || []).forEach(g => {
    if (!s.drafts[g.id] || typeof s.drafts[g.id] !== 'object') s.drafts[g.id] = {};
    if (!Array.isArray(g.rosterDetails) || !g.rosterDetails.length) {
      g.rosterDetails = (g.students || []).map(st => ({
        id: st.id || uid('st'),
        name: st.name || '',
        phone: st.phone || ''
      }));
    }
  });
  return s;
}

function draftContextOf(s=state){
  return s ? `${s.activeGroupId || ''}|${s.date || ''}` : '';
}

function draftSnapshotFromGroup(g){
  return {
    students: deep(g.students || []),
    quizTotal: Math.max(1, Number(g.quizTotal) || 1),
    ratingEnabled: !!g.ratingEnabled,
    reportSections: typeof normalizedReportSections === 'function'
      ? normalizedReportSections(g.reportSections)
      : deep(g.reportSections || {}),
    mainReportRanked: !!g.mainReportRanked,
    updatedAt: new Date().toISOString()
  };
}

function draftHasMeaningfulDailyData(d){
  return !!(d?.students || []).some(s =>
    s.attendance != null || s.vocab != null || s.grammar != null ||
    s.homework != null || s.speaking != null || s.participation != null ||
    s.quiz != null
  );
}

function captureCurrentDraftToState(force=false){
  if (!state || !state.date || state.editorClosed || state.archiveEditing) return;
  ensureDraftContainers(state);
  const g = group();
  if (!g) return;

  // Doimiy ism/telefon ro‘yxatini ham yangilab boramiz.
  g.rosterDetails = (g.students || []).map(st => ({
    id: st.id || uid('st'),
    name: st.name || '',
    phone: st.phone || ''
  }));

  const gid = g.id, date = state.date;
  const ctx = `${gid}|${date}`;
  const snap = draftSnapshotFromGroup(g);
  const existing = state.drafts[gid]?.[date];

  // Sana/guruh endigina almashgan birinchi save bo‘lsa, avvaldan bor mazmunli qoralamani
  // yangi bo‘sh dars bilan tasodifan bosib yubormaymiz.
  if (!force && ctx !== draftLastContext && existing && draftHasMeaningfulDailyData(existing) && !draftHasMeaningfulDailyData(snap)) {
    draftLastContext = ctx;
    return;
  }

  state.drafts[gid][date] = snap;
  draftLastContext = ctx;
}

const baseNormWithDrafts = norm;
norm = function(s){
  const out = ensureDraftContainers(baseNormWithDrafts(s));
  const g = (out.groups || []).find(x => x.id === out.activeGroupId) || out.groups?.[0];
  if (g && out.date && !out.editorClosed && !out.archiveEditing) {
    out.drafts[g.id] = out.drafts[g.id] || {};
    // Remote/local state yuklanganda o‘sha paytdagi ishchi darsni qoralamaga ko‘chirib qo‘yamiz.
    out.drafts[g.id][out.date] = {
      students: deep(g.students || []),
      quizTotal: Math.max(1, Number(g.quizTotal) || 1),
      ratingEnabled: !!g.ratingEnabled,
      reportSections: typeof normalizedReportSections === 'function'
        ? normalizedReportSections(g.reportSections)
        : deep(g.reportSections || {}),
      mainReportRanked: !!g.mainReportRanked,
      updatedAt: new Date().toISOString()
    };
  }
  draftLastContext = draftContextOf(out);
  return out;
};

const baseSaveLocalWithDrafts = saveLocal;
saveLocal = function(){
  captureCurrentDraftToState(false);
  baseSaveLocalWithDrafts();
};
