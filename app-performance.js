// UI silliqligi uchun sync optimizatsiyasi.
// Bir xil remote ma'lumot kelsa sahifani qayta chizmaydi;
// foydalanuvchi inputga yozayotgan paytda remote renderni kechiktiradi.
let localDirtyUntil = 0;

saveLocal = function(){
  localStorage.setItem(CACHE, JSON.stringify(state));
  localDirtyUntil = Date.now() + 1800;
  scheduleSave();
};

pull = async function(silent=false){
  if (!account) return;
  if (silent && Date.now() < localDirtyUntil) return;

  const {data,error} = await sb.rpc('teacher_sync_load',{
    p_account_id:account.accountId,
    p_username:account.username,
    p_password:account.password
  });

  if (error){
    if (!silent) sync('err','⚠️ Ulanmadi');
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return;
  if (lastRemote && row.updated_at <= lastRemote) return;

  const incoming = norm(row.data);
  const same = JSON.stringify(incoming) === JSON.stringify(state);
  if (same){
    lastRemote = row.updated_at || lastRemote;
    if (!silent) sync('ok','✓ Saqlandi');
    return;
  }

  const active = document.activeElement;
  const isEditing = !!active && (active.matches?.('input, textarea') || active.isContentEditable);
  if (silent && isEditing) return;

  lastRemote = row.updated_at || '';
  applying = true;
  state = incoming;
  localStorage.setItem(CACHE,JSON.stringify(state));
  render();
  applying = false;
  if (!silent) sync('ok','✓ Saqlandi');
};
