// fix categorias ilimitadas + bloquea numeros en productos
document.addEventListener('DOMContentLoaded', async ()=>{
  const catBox = document.querySelector('#categorias') || document.body;

  // inyectar form para crear categoria
  if(!document.getElementById('nueva-cat-input')){
    const div = document.createElement('div');
    div.innerHTML = `<div style="display:flex;gap:8px;margin:10px 0"><input id="nueva-cat-input" placeholder="Nueva categoria (solo letras)" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ccc"><button id="btn-crear-cat" style="padding:10px 16px;border-radius:8px;background:black;color:white">Crear</button></div><div id="msg-cat"></div>`;
    const tabla = document.querySelector('table');
    if(tabla) tabla.parentElement.prepend(div);
  }

  async function cargarCats(){
    try{
      const r = await fetch('/api/categorias');
      const cats = await r.json();
      // llenar select de productos
      const sel = document.querySelector('select[name="categoria"], #producto-categoria');
      if(sel){
        sel.innerHTML = cats.map(c=>`<option>${c.nombre}</option>`).join('') || '<option>General</option>';
        if(cats.length==0) sel.innerHTML='<option>General</option>';
      }
      // actualizar tabla de categorias
      const rows = document.querySelectorAll('table tbody tr');
      // si tu tabla es simple, la reemplazamos
      const tbody = document.querySelector('table tbody');
      if(tbody && cats.length>0){
         // cuenta productos por categoria si existe endpoint, si no pon 0
         tbody.innerHTML = cats.map(c=>`<tr><td>${c.nombre}</td><td>#</td></tr>`).join('');
      }
    }catch(e){}
  }

  document.getElementById('btn-crear-cat')?.addEventListener('click', async ()=>{
    const input = document.getElementById('nueva-cat-input');
    const nombre = input.value.trim();
    const msg = document.getElementById('msg-cat');
    if(/\d/.test(nombre)){ msg.textContent='❌ No se permiten numeros en categoria'; return; }
    if(!nombre){ msg.textContent='Escribe un nombre'; return; }
    const r = await fetch('/api/categorias',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nombre})});
    const j = await r.json();
    if(j.error){ msg.textContent='❌ '+j.error; } else { msg.textContent='✅ Categoria creada'; input.value=''; cargarCats(); }
  });

  // BLOQUEAR NUMEROS EN NOMBRE DE PRODUCTO
  const prodInput = document.querySelector('input[name="nombre"], #producto-nombre');
  if(prodInput){
    prodInput.addEventListener('input', ()=>{
      if(/\d/.test(prodInput.value)){
        prodInput.value = prodInput.value.replace(/[0-9]/g,'');
        prodInput.style.border='2px solid red';
      } else prodInput.style.border='1px solid #ccc';
    });
  }

  cargarCats();
});