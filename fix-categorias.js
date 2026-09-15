// FIX CATEGORIAS - Solo corre si ya iniciaste sesión
(function(){
  const esLogin = document.body.innerHTML.includes('Iniciar sesion') && document.body.innerHTML.includes('My Inventory');
  const noLogueado = !localStorage.getItem('usuario') && !localStorage.getItem('rol');
  if(esLogin || noLogueado){
    console.log('En login, no cargo categorias');
    return;
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    // Borra categoria "Owner" que se creó por error
    try{ await fetch('/api/categorias/borrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:'Owner'})}); }catch(e){}

    const tabla = document.getElementById('tbody-categorias');
    if(!tabla) return;

    async function cargar(){
      const r = await fetch('/api/categorias'); const cats = await r.json();
      // Filtra Owner
      const filtradas = cats.filter(c=> c.nombre.toLowerCase() !== 'owner');
      tabla.innerHTML = filtradas.map(c=>`<tr><td>${c.nombre}</td><td>0</td><td><button onclick="borrarCat('${c.nombre}')">Borrar</button></td></tr>`).join('');
      const select = document.querySelector('select');
      if(select) select.innerHTML = filtradas.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('');
    }
    window.borrarCat = async (nombre)=>{
      if(!confirm('¿Borrar '+nombre+'?')) return;
      await fetch('/api/categorias/borrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre})});
      cargar();
    };
    const btn = document.getElementById('btn-crear-cat');
    if(btn){
      btn.onclick = async ()=>{
        const nombre = document.getElementById('nueva-cat-input').value.trim();
        if(!nombre || /\d/.test(nombre)){ alert('Sin números'); return; }
        await fetch('/api/categorias',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre})});
        document.getElementById('nueva-cat-input').value=''; cargar();
      };
    }
    cargar();
  });
})();