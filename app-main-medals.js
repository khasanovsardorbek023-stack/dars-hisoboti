// Asosiy Telegram hisobotida Top-3 medallarini alohida yoqish/o‘chirish.
// Reyting tartibi va alohida reyting kartasiga ta'sir qilmaydi.

const baseNormMainMedals = norm;
norm = function(s){
  const out = baseNormMainMedals(s);
  (out.groups || []).forEach(g => {
    if (typeof g.mainReportMedals !== 'boolean') g.mainReportMedals = true;
  });
  return out;
};

(function addMainReportMedalToggle(){
  if ($('mainReportMedals')) return;
  const rankedLabel = $('mainReportRankedLabel');
  const ratingToggle = $('ratingEnabled')?.closest('label');
  const anchor = rankedLabel || ratingToggle;
  if (!anchor?.parentNode) return;

  const label = document.createElement('label');
  label.id = 'mainReportMedalsLabel';
  label.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;background:#f7f7fb;padding:9px;border-radius:10px;font-size:11px;margin-top:8px';
  label.innerHTML = '<span>🥇🥈🥉 Top 3 medallarini ko‘rsatish</span><input id="mainReportMedals" type="checkbox">';
  anchor.insertAdjacentElement('afterend', label);

  $('mainReportMedals').onchange = e => {
    if (!state) return;
    group().mainReportMedals = !!e.target.checked;
    saveLocal();
    updateReports();
  };
})();

function syncMainReportMedalToggle(){
  if (!state) return;
  const el = $('mainReportMedals');
  if (el) el.checked = group().mainReportMedals !== false;
}

const baseRenderSettingsMainMedals = renderSettings;
renderSettings = function(){
  baseRenderSettingsMainMedals();
  syncMainReportMedalToggle();
};

const baseSourceMainMedals = source;
source = function(){
  const src = baseSourceMainMedals();
  return {...src, mainReportMedals: group().mainReportMedals !== false};
};

// Oldindan tuzilgan kartochka matnidan faqat Top-3 medal emojilarini olib tashlaymiz.
const baseMainTextMainMedals = mainText;
mainText = function(src, includePhone=false){
  const text = baseMainTextMainMedals(src, includePhone);
  if (src.mainReportMedals !== false) return text;
  return text.replace(/^👤\s+[🥇🥈🥉]\s+/gm, '👤 ');
};
