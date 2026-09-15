async function login(){
  const usuario=document.getElementById('u').value;
  const clave=document.getElementById('p').value;
  const r=await fetch('/api/superadmin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario,clave})});
  const j=await r.json();
  if(j.ok){ document.getElementById('login').style.display='none'; document.getElementById('panel').style.display='block'; cargar(); cargarUsuarios(); }
  else document.getElementById('msg').textContent='❌ Usuario o clave mal';
}
async function crear(){ const cliente=document.getElementById('cliente').value; const dias=document.getElementById('dias').value; const r=await fetch('/api/licencia/generar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cliente,dias})}); const j=await r.json(); document.getElementById('resultado').innerHTML=`<div class=card><b>KEY:</b> ${j.key}<br><b>Cliente:</b> ${j.cliente} - ${j.dias} dias</div>`; cargar(); }
async function cargar(){ const r=await fetch('/api/licencias'); const data=await r.json(); document.getElementById('lista').innerHTML=data.map(l=>`<div class=card>${l.clave} - ${l.cliente} - ${l.dias_restantes} dias <button onclick="borrarLic(${l.id})">Eliminar Owner</button></div>`).join(''); }
async function borrarLic(id){ if(!confirm('¿Borrar esta licencia/owner?')) return; await fetch('/api/licencia/eliminar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); cargar(); }
async function cargarUsuarios(){ const r=await fetch('/api/usuarios'); const data=await r.json(); document.getElementById('listaUsuarios').innerHTML=data.map(u=>`<div class=card>${u.usuario} (${u.rol}) ${u.usuario!=='superadmin'?`<button onclick="borrarUser(${u.id},'${u.usuario}')">Borrar</button> <button onclick="editarUser(${u.id},'${u.usuario}')">Editar</button>`:''}</div>`).join(''); }
async function borrarUser(id,usuario){ if(!confirm('¿Borrar '+usuario+'?')) return; await fetch('/api/usuario/eliminar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,usuario})}); cargarUsuarios(); }
async function editarUser(id,usuario){ const nuevo=prompt('Nuevo usuario:',usuario); if(!nuevo) return; const nuevaClave=prompt('Nueva clave:'); if(!nuevaClave) return; await fetch('/api/usuario/editar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,usuario:nuevo,clave:nuevaClave})}); cargarUsuarios(); }