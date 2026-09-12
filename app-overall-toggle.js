// "Umumiy natijalar foizi" qatorini Telegram hisobotida yoqish/o‘chirish.
// Bu sozlama reyting hisoblash formulasiga ta'sir qilmaydi.

const baseNormalizedOverall = normalizedReportSections;
normalizedReportSections = function(v){
  const base = baseNormalizedOverall(v);
  return {
    ...base,
    overall: !v || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v, 'overall')
      ? true
      : v.overall !== false
  };
};

(function addOverallSectionToggle(){
  if ($('sectionOverall')) return;
  const box = $('reportSectionsBox');
  if (!box) return;
  const grid = box.children?.[1];
  if (!grid) return;

  const label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:11px';
  label.innerHTML = '<input id="sectionOverall" type="checkbox"> Umumiy natijalar foizi';
  grid.appendChild(label);
})();

const baseSyncOverallCheckbox = syncSectionCheckboxes;
syncSectionCheckboxes = function(){
  baseSyncOverallCheckbox();
  const el = $('sectionOverall');
  if (el && state) el.checked = !!ensureReportSections(group()).overall;
};

if ($('sectionOverall')) {
  $('sectionOverall').onchange = e => {
    const sec = ensureReportSections(group());
    sec.overall = !!e.target.checked;
    saveLocal();
    updateReports();
    renderRating();
  };
}

// Kartochka ko‘rinishidagi asosiy hisobotdan umumiy foiz qatorini kerak bo‘lsa yashiramiz.
const baseMainTextOverallToggle = mainText;
mainText = function(src, includePhone=false){
  const text = baseMainTextOverallToggle(src, includePhone);
  const sec = normalizedReportSections(src.reportSections);
  if (sec.overall) return text;
  return text
    .split('\n')
    .filter(line => !line.startsWith('📊 Umumiy natijalar foizi:'))
    .join('\n');
};
