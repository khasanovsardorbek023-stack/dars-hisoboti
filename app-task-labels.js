// So‘zlar va Grammatika variantlari uchun yangilangan nomlar.
const baseRowHtmlTaskLabels = rowHtml;
rowHtml = function(s){
  return baseRowHtmlTaskLabels(s)
    .replace(/>Topshirdi</g, '>Topshirildi<')
    .replace(/>Chala topshirdi</g, '>Chala topshirildi<')
    .replace(/>Topshirmadi</g, '>Topshirilmadi<');
};

taskLabel = function(v){
  return v === 'topshirdi'
    ? '✅ Topshirildi'
    : v === 'chala'
      ? '⚠️ Chala topshirildi'
      : v === 'topshirmadi'
        ? '❌ Topshirilmadi'
        : '➖ Belgilanmagan';
};
