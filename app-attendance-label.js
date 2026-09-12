// Telegram hisobotidagi davomat yozuvini aniqlashtirish.
prettyAttendanceLabel = function(v){
  return v === 'keldi' ? 'Keldi ✅'
    : v === 'kech' ? 'Kech qolib keldi ⏰'
    : v === 'kelmadi' ? 'Kelmadi ❌'
    : 'Belgilanmagan ➖';
};
