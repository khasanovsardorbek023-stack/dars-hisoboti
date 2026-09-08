// Telegram hisobotidagi status emojilarini ma'noga mosroq ko'rinishda beradi.
// Sayt ichidagi tugma/rang logikasiga ta'sir qilmaydi.

taskLabel = function(v){
  return v === 'topshirdi'
    ? '✅ Topshirildi'
    : v === 'chala'
      ? '🟠 Chala topshirildi'
      : v === 'topshirmadi'
        ? '❌ Topshirilmadi'
        : '➖ Belgilanmagan';
};

homeworkLabel = function(v){
  return v === 'bajarildi'
    ? '✅ Bajarilingan'
    : v === 'chala'
      ? '🟠 Chala bajarilingan'
      : v === 'bajarilmadi'
        ? '❌ Bajarilinmagan'
        : '➖ Belgilanmagan';
};

speakingLabel = function(v){
  return v === 'alo'
    ? '🌟 A’lo'
    : v === 'yaxshi'
      ? '✅ Yaxshi'
      : v === 'ortacha'
        ? '🙂 O‘rtacha'
        : v === 'qoniqarli'
          ? '👍 Qoniqarli'
          : v === 'qoniqarsiz'
            ? '❌ Qoniqarsiz'
            : '➖ Belgilanmagan';
};

participationLabel = function(v){
  return v === 'alo'
    ? '🌟 A’lo'
    : v === 'yaxshi'
      ? '✅ Yaxshi'
      : v === 'ortacha'
        ? '🙂 O‘rtacha'
        : v === 'qoniqarli'
          ? '👍 Qoniqarli'
          : v === 'qoniqarsiz'
            ? '❌ Qoniqarsiz'
            : '➖ Belgilanmagan';
};
