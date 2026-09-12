// Telegram hisobotida har bir o‘quvchini alohida, aniq ko‘rinadigan blokka ajratish.

mainText = function(src, includePhone=false){
  const sec = normalizedReportSections(src.reportSections);
  const ordered = orderedStudentsForMainReport(src);
  const header = [
    '📚 Bugungi dars hisoboti',
    `👥 Guruh: ${src.groupName}`,
    `📅 Sana: ${fmt(src.date)}`
  ];

  if (!ordered.length) return header.join('\n') + '\n\nO‘quvchilar kiritilmagan.';

  const border = '━━━━━━━━━━━━━━━━━━';
  const blocks = ordered.map((item,i) => {
    const s = item.s;
    const medal = src.mainReportRanked ? (['🥇','🥈','🥉'][i] || '') : '';
    const name = String(s.name || '').trim();
    const studentTitle = `👤 ${medal ? medal + ' ' : ''}${i+1}. ${name}`;
    const lines = [border, studentTitle, border];

    if (includePhone && String(s.phone || '').trim()) {
      lines.push(`📞 Telefon: ${String(s.phone).trim()}`);
    }

    if (sec.attendance) lines.push(`👨‍🏫 Davomat: ${prettyAttendanceLabel(s.attendance)}`);

    // Darsga kelmagan o‘quvchi uchun boshqa natijalar va umumiy foiz ko‘rsatilmaydi.
    if (sec.attendance && s.attendance === 'kelmadi') {
      lines.push(border);
      return lines.join('\n');
    }

    if (sec.vocab) lines.push(`🔤 So‘zlar: ${prettyTaskLabel(s.vocab)}`);
    if (sec.grammar) lines.push(`📘 Grammatika: ${prettyTaskLabel(s.grammar)}`);
    if (sec.homework) lines.push(`🏠 Uyga vazifa qilib berilgan Topshiriqlar: ${prettyHomeworkLabel(s.homework)}`);
    if (sec.speaking) lines.push(`🗣 Gapirish savollariga berilgan javoblar: ${prettySpeakingLabel(s.speaking)}`);
    if (sec.participation) lines.push(`🙋 Darsda qatnashish ko‘rsatkichi: ${prettyParticipationLabel(s.participation)}`);
    if (sec.quiz) lines.push(`📝 Quiz / test: ${s.quiz==null?'➖':`${s.quiz}/${src.quizTotal} (${Math.round(s.quiz/src.quizTotal*100)}%)`}`);

    const overall = overallResultPercent(s, src);
    lines.push('');
    lines.push(`📊 Umumiy natijalar foizi: ${overall == null ? '➖' : overall + '%'}`);
    lines.push(border);
    return lines.join('\n');
  });

  return header.join('\n') + '\n\n' + blocks.join('\n\n');
};
