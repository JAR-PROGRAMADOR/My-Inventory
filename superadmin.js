async function crear(){
  const cliente=document.getElementById('cliente').value;
  const dias=document.getElementById('dias').value;
  const r=await fetch('/api/licencia/generar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cliente,dias})});
  const j=await r.json();
  document.getElementById('resultado').innerHTML=`<div class=card><b>KEY:</b> ${j.key}<br><b>Cliente:</b> ${j.cliente}<br><b>Días:</b> ${j.dias}</div>`;
  cargar();
}
async function cargar(){
  const r=await fetch('/api/licencias'); const data=await r.json();
  document.getElementById('lista').innerHTML=data.map(l=>`<div class=card>${l.clave} - ${l.cliente} - Expira en: ${l.dias_restantes} días <button onclick="borrar(${l.id})">Eliminar</button></div>`).join('');
}
async function borrar(id){ await fetch('/api/licencia/eliminar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); cargar(); }
cargar();