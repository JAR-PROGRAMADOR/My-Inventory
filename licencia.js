// licencia.js - inyecta el campo sin romper nada
document.addEventListener('DOMContentLoaded', ()=>{
  const userInput = document.getElementById('login-user');
  if(!userInput) return;
  const passInput = document.getElementById('login-pass');

  // crear input de licencia si no existe
  if(!document.getElementById('licencia-key')){
    const inp = document.createElement('input');
    inp.id = 'licencia-key';
    inp.placeholder = 'Key de Licencia (MASTER-OWNER-2026)';
    inp.style = 'margin-top:8px; width:100%; padding:10px; border-radius:8px; border:1px solid #ccc';
    passInput.after(inp);
  }

  // guardar login original y reemplazarlo
  const originalDoLogin = window.doLogin;
  window.doLogin = async function(){
    const key = document.getElementById('licencia-key').value.trim();
    const err = document.getElementById('login-error');
    if(!key){ err.textContent='Pon tu Key de licencia'; return; }
    try{
      const r = await fetch('/api/licencia/validar', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key})});
      const j = await r.json();
      if(!j.ok){ err.textContent='Licencia no válida'; return; }
    }catch(e){ err.textContent='Error validando licencia'; return; }
    // si pasa, llama al login original
    return originalDoLogin();
  }
});