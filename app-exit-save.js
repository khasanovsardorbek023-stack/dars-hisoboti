// Saytdan chiqish/yopish paytida oxirgi holatni darhol bulutga yuborish.
function flushStateOnExit(){
  if (!account || !state) return;
  try { localStorage.setItem(CACHE, JSON.stringify(state)); } catch {}
  if (!navigator.onLine) return;

  try {
    clearTimeout(saveTimer);
    fetch(`${SB_URL}/rest/v1/rpc/teacher_sync_save`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_account_id: account.accountId,
        p_username: account.username,
        p_password: account.password,
        p_data: state
      }),
      keepalive: true
    }).catch(()=>{});
  } catch {}
}

window.addEventListener('pagehide', flushStateOnExit);
window.addEventListener('beforeunload', flushStateOnExit);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushStateOnExit();
});

// "Chiqish" tugmasida ham bulutga saqlash tugashini kutamiz.
const baseLogoutWithSave = logout;
logout = async function(){
  if (account && state && navigator.onLine) {
    clearTimeout(saveTimer);
    try { await push(); } catch {}
  }
  baseLogoutWithSave();
};

// Telegram hisobotidagi status emojilarini chiroyliroq variantlarga almashtiruvchi faylni yuklaymiz.
(function loadReportEmojiOverrides(){
  const script = document.createElement('script');
  script.src = 'app-report-emojis.js?v=20260908-2332';
  script.onload = () => {
    try { if (state) updateReports(); } catch {}
  };
  document.head.appendChild(script);
})();
