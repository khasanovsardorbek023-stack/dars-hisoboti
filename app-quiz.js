// Quiz bali inputida sichqoncha g‘ildiragi bilan son o‘zgarishini o‘chiradi.
// Maydon faqat raqam yozish uchun ishlaydi.
const quizRowHtmlNoWheel = rowHtml;
rowHtml = function(s){
  return quizRowHtmlNoWheel(s).replace(
    /data-quiz type="number" min="0" max="[^"]*" inputmode="numeric"/g,
    'data-quiz type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off"'
  );
};

// Har qanday tasodifiy harf yoki belgini darhol olib tashlaymiz.
document.addEventListener('input', e => {
  const input = e.target.closest?.('[data-quiz]');
  if (!input) return;
  const cleaned = input.value.replace(/\D/g, '');
  if (input.value !== cleaned) input.value = cleaned;
}, true);
