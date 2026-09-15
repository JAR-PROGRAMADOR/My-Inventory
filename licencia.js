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
  window.doLogin = async function iniciarSesion(){
  const usuario = document.querySelector('input[placeholder="Usuario"]')?.value || document.getElementById('usuario')?.value || document.querySelectorAll('input')[0].value;
  const clave = document.querySelector('input[type="password"]')?.value;
  const licenciaInput = document.querySelector('input[value="MASTER-OWNER-2026"]') || document.querySelectorAll('input')[2];
  const licencia = licenciaInput? licenciaInput.value : '';

  const btn = document.querySelector('button'); btn.textContent='Validando...';

  try{
    // 1. Primero intenta login de usuario
    const rLogin = await fetch('/api/login',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({usuario, clave})
    });
    const dataLogin = await rLogin.json();

    if(dataLogin.ok){
      localStorage.setItem('usuario', dataLogin.usuario);
      localStorage.setItem('rol', dataLogin.rol);

      if(dataLogin.rol === 'superadmin'){
        // SUPERADMIN ENTRA SIN LICENCIA
        window.location.href = '/';
        return;
      }
      // Si es owner, ahora sí valida licencia
      if(!licencia){ alert('Pon tu licencia'); btn.textContent='Iniciar sesión'; return; }
      const rLic = await fetch('/api/licencia/validar',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key:licencia})});
      const dataLic = await rLic.json();
      if(dataLic.ok){ window.location.href='/'; }
      else { document.body.innerHTML += '<div style="color:red">Licencia vencida</div>'; btn.textContent='Iniciar sesión'; }
      return;
    } else {
      document.getElementById('error')?.remove();
      const err = document.createElement('div'); err.id='error'; err.style.color='red'; err.textContent='Error validando licencia - usuario no existe';
      btn.parentElement.appendChild(err);
      btn.textContent='Iniciar sesión';
    }
  }catch(e){ console.log(e); btn.textContent='Iniciar sesión'; alert('Error servidor'); }
  };
});