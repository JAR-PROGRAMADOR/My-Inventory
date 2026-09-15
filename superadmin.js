async function login(){
  const usuario = document.getElementById('usuario').value;
  const clave = document.getElementById('clave').value;
  const r = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario, clave})});
  const data = await r.json();
  if(data.ok){
    localStorage.setItem('usuario', data.usuario);
    localStorage.setItem('rol', data.rol);
    // Si es superadmin entra igual pero con poder total
    if(data.rol === 'superadmin'){
      alert('Bienvenido SUPERADMIN');
    }
    window.location.href = '/'; // o donde tengas tu panel
  } else {
    alert('Usuario o clave mal');
  }
}