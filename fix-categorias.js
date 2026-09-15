console.log('fix-categorias OK');
document.addEventListener('DOMContentLoaded', async ()=>{
  const box = document.createElement('div');
  box.innerHTML = `<div style="margin:20px;padding:15px;background:#f3f3f3;border-radius:12px">
  <h3>Crear Categoria Ilimitada</h3>
  <input id="cat-in" placeholder="Ej: Bebidas" style="padding:10px;width:70%;border-radius:8px;border:1px solid #ccc">
  <button id="cat-btn" style="padding:10px 15px;border-radius:8px;background:black;color:white">Crear</button>
  <div id="cat-msg"></div><div id="cat-list" style="margin-top:10px"></div></div>`;
  document.body.insertBefore(box, document.body.firstChild);

  async function cargar(){
    const r = await fetch('/api/categorias'); const cats = await r.json();
    document.getElementById('cat-list').innerHTML = cats.length ? cats.map(c=>`• ${c.nombre}`).join('<br>') : 'Aún no hay categorías - crea la primera';
  }
  document.getElementById('cat-btn').onclick = async ()=>{
    const input = document.getElementById('cat-in'); const nombre = input.value.trim();
    const msg = document.getElementById('cat-msg');
    if(!nombre){ msg.textContent='Escribe nombre'; return;}
    if(/\d/.test(nombre)){ msg.textContent='❌ Sin números'; return;}
    const r = await fetch('/api/categorias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre})});
    const j = await r.json(); if(j.error){ msg.textContent='❌ '+j.error; } else { msg.textContent='✅ Creada'; input.value=''; cargar(); }
  };
  cargar();
});