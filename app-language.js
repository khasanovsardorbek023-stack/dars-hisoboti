// Interfeysda "nomer" o'rniga adabiyroq "raqam" so'zini ishlatish.
function useRaqamWords(root=document){
  root.querySelectorAll('button').forEach(btn => {
    btn.textContent = btn.textContent
      .replace(/Nomersiz/g,'Raqamsiz')
      .replace(/Nomer bilan/g,'Raqam bilan')
      .replace(/nomersiz/g,'raqamsiz')
      .replace(/nomer bilan/g,'raqam bilan');
  });
}

const baseShowModalRaqam = showModal;
showModal = function(title,html,onOk,showDefault=true){
  baseShowModalRaqam(title,html,onOk,showDefault);
  useRaqamWords($('modalBg'));
};

setTimeout(() => useRaqamWords(document), 0);
