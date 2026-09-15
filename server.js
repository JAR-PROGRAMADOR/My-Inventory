import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));

// PRODUCTOS
app.get('/api/productos', (req,res)=>{
  db.query('SELECT * FROM productos ORDER BY id DESC', (err,r)=>{
    if(err){ console.log(err); return res.json([]); }
    res.json(r);
  });
});
app.post('/api/productos', (req,res)=>{
  const {codigo,nombre,categoria_id,precio_compra,precio_venta,stock,stock_minimo}=req.body;
  db.query('INSERT INTO productos (codigo,nombre,categoria_id,precio_compra,precio_venta,stock,stock_minimo) VALUES (?,?,?,?,?,?,?)',
  [codigo,nombre,categoria_id||1,precio_compra,precio_venta,stock,stock_minimo], (err,r)=>{
    if(err){ console.log(err); return res.status(500).json(err); }
    res.json({id:r.insertId});
  });
});
app.put('/api/productos/:id', (req,res)=>{
  const {codigo,nombre,categoria_id,precio_compra,precio_venta,stock_minimo}=req.body;
  db.query('UPDATE productos SET codigo=?,nombre=?,categoria_id=?,precio_compra=?,precio_venta=?,stock_minimo=? WHERE id=?',
  [codigo,nombre,categoria_id,precio_compra,precio_venta,stock_minimo,req.params.id], (err)=>{
    if(err) return res.status(500).json(err);
    res.json({ok:true});
  });
});
app.put('/api/productos/:id/stock', (req,res)=>{
  db.query('UPDATE productos SET stock=? WHERE id=?',[req.body.stock, req.params.id], (err)=>{
    if(err) return res.status(500).json(err);
    res.json({ok:true});
  });
});
app.delete('/api/productos/:id', (req,res)=>{
  db.query('DELETE FROM productos WHERE id=?',[req.params.id], (err)=>{
    if(err) return res.status(500).json(err);
    res.json({ok:true});
  });
});

// USUARIOS - AQUI ESTABA EL 404
app.get('/api/usuarios', (req,res)=>{
  db.query('SELECT id, nombre_completo, usuario, rol_id, pendiente, activo, rol FROM usuarios', (err,r)=>{
    if(err){ console.log(err); return res.json([]); }
    res.json(r);
  });
});

app.post('/api/register', async (req, res) => {
  try {
    const { nombre_completo, usuario, contrasena, nombre, password } = req.body;
    const nombreFinal = nombre_completo || nombre;
    const passFinal = contrasena || password;
    const userFinal = (usuario||'').trim();

    console.log('INTENTO REGISTRO:', userFinal, nombreFinal);

    if(!nombreFinal ||!userFinal ||!passFinal){
      return res.status(400).json({error: 'Faltan datos: nombre, usuario y contraseña son obligatorios'});
    }

    // Verifica tabla
    const [exist] = await pool.query('SELECT id FROM usuarios WHERE usuario =?', [userFinal]);
    if(exist.length > 0){
      return res.status(400).json({error: `El usuario '${userFinal}' ya existe. Usa otro.`});
    }

    const [totalRows] = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const total = totalRows[0].total;
    const esPrimero = total === 0;

    const rol_id = esPrimero? 1 : 2; // 1=Dueño, 2=Empleado
    const pendiente = esPrimero? 0 : 1;

    await pool.query(
      'INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol_id, pendiente) VALUES (?,?,?,?,?)',
      [nombreFinal, userFinal, passFinal, rol_id, pendiente]
    );

    console.log('REGISTRADO OK:', userFinal, 'rol', rol_id);
    return res.json({ok: true, rol_id, mensaje: esPrimero? 'Dueño creado' : 'Pendiente de aprobación'});

  } catch (err) {
    console.error('ERROR REAL EN /api/register:', err);
    return res.status(500).json({error: 'Error interno: ' + err.message});
  }
});
// LOGIN UNICO Y BUENO - SUPERADMIN SIEMPRE
app.post('/api/login', (req,res)=>{
  const {usuario, clave} = req.body;
  if(usuario==='superadmin' && clave==='Super2026!'){
    return res.json({ok:true, usuario:'superadmin', rol:'superadmin', rol_id:99, nombre:'Super Admin'});
  }
  // Busca por cualquier columna de clave
  db.query("SELECT * FROM usuarios WHERE usuario=? AND (clave=? OR password_hash=?)", [usuario, clave, clave], (e, rows)=>{
    if(e){ console.log(e); return res.json({ok:false}); }
    if(rows && rows.length>0){
      const u = rows[0];
      if(u.pendiente==1) return res.json({ok:false, error:'Pendiente por aprobar'});
      const rol = u.rol || (u.rol_id==1?'dueño':'empleado');
      return res.json({ok:true, usuario:u.usuario, rol:rol, rol_id:u.rol_id, nombre:u.nombre_completo||u.usuario});
    }
    return res.json({ok:false, error:'usuario no existe'});
  });
});

app.put('/api/usuarios/:id/aprobar', (req,res)=>{
  db.query('UPDATE usuarios SET activo=1, pendiente=0, rol_id=? WHERE id=?',[req.body.rol_id||2, req.params.id],(err)=>{
    if(err) return res.status(500).json(err);
    res.json({ok:true});
  });
});
app.delete('/api/usuarios/:id', (req,res)=>{
  db.query('DELETE FROM usuarios WHERE id=?',[req.params.id],(err)=>{
    if(err) return res.status(500).json(err);
    res.json({ok:true});
  });
});

// CATEGORIAS
app.get('/api/categorias',(req,res)=>{ db.query("SELECT * FROM categorias", (e,r)=> res.json(r||[])); });
app.post('/api/categorias',(req,res)=>{
  const nombre = req.body.nombre?.trim();
  if(!nombre) return res.status(400).json({error:'vacío'});
  db.query("INSERT INTO categorias (nombre) VALUES (?)",[nombre], (e)=>{
    if(e) return res.status(400).json({error:'Ya existe'});
    res.json({ok:true});
  });
});

// ==================== LICENCIAS MASTER - FIX DEFINITIVO ====================
const licenciasDB = []; // Si usas MySQL, cambia esto por tu tabla

function generarKeyUnica(){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'LIC-';
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++) key += chars.charAt(Math.floor(Math.random()*chars.length));
    if(i<3) key += '-';
  }
  return key + '-' + Date.now().toString().slice(-4);
}

app.post('/api/licencia/generar', (req, res) => {
  const { cliente, cantidad, unidad, dias } = req.body;
  
  // Soporte para ambos formatos
  let diasFinal = 30;
  let cantidadFinal = cantidad || 30;
  let unidadFinal = unidad || 'dias';

  if(dias) {
    diasFinal = parseInt(dias);
  } else {
    const cant = parseInt(cantidad) || 30;
    if(unidad === 'minutos') diasFinal = cant / 1440;
    else if(unidad === 'dias') diasFinal = cant;
    else if(unidad === 'meses') diasFinal = cant * 30;
    else diasFinal = cant;
  }

  const key = generarKeyUnica();
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + (diasFinal * 24 * 60 * 60 * 1000));

  const nueva = {
    id: Date.now().toString(),
    clave: key,
    cliente: cliente || 'Cliente',
    cantidad: cantidadFinal,
    unidad: unidadFinal,
    dias: diasFinal,
    activa: 1,
    expira_en: expira.toISOString(),
    creada_en: ahora.toISOString()
  };

  licenciasDB.push(nueva);
  
  // Si usas MySQL, guarda también:
  // await db.query('INSERT INTO licencias (clave, cliente, expira_en) VALUES (?,?,?)', [key, cliente, expira])

  console.log('LICENCIA GENERADA:', key, 'para', cliente, 'expira', expira);
  res.json({ ok: true, key: key, licencia: nueva });
});

app.get('/api/licencias', (req, res) => {
  res.json(licenciasDB);
});

app.post('/api/licencia/eliminar', (req, res) => {
  const { id } = req.body;
  const idx = licenciasDB.findIndex(l => l.id == id);
  if(idx !== -1) licenciasDB.splice(idx, 1);
  res.json({ ok: true });
});

app.post('/api/licencia/validar', (req, res) => {
  const { clave } = req.body;
  if(clave === 'MASTER-OWNER-2026') return res.json({ ok: true, rol: 'superadmin' });
  
  const lic = licenciasDB.find(l => l.clave === clave && l.activa);
  if(!lic) return res.json({ ok: false, error: 'Licencia no válida' });
  
  if(new Date(lic.expira_en) < new Date()){
    return res.json({ ok: false, error: 'Licencia expirada' });
  }
  res.json({ ok: true, licencia: lic });
});
// ==================== FIN LICENCIAS ====================
// ====== SISTEMA DE LICENCIAS MASTER (PARA SUPERADMIN) ======
db.query(`CREATE TABLE IF NOT EXISTS licencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) UNIQUE,
  cliente VARCHAR(100),
  activa TINYINT DEFAULT 1,
  expira_en DATETIME,
  creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

app.get('/api/licencias', (req,res)=>{
  db.query("SELECT * FROM licencias ORDER BY id DESC", (e,r)=>{
    if(e){ console.log(e); return res.json([]); }
    res.json(r);
  });
});

app.post('/api/licencia/generar', (req,res)=>{
  const key = 'LIC-'+Math.random().toString(36).substring(2,8).toUpperCase()+'-'+Date.now().toString().slice(-4);
  const cliente = req.body.cliente || 'Cliente';
  const cantidad = parseInt(req.body.cantidad) || 30;
  const unidad = req.body.unidad || 'dias';

  let sql = "";
  if(unidad === 'minutos') sql = "INSERT INTO licencias (clave, cliente, activa, expira_en) VALUES (?,?,1, DATE_ADD(NOW(), INTERVAL? MINUTE))";
  else if(unidad === 'meses') sql = "INSERT INTO licencias (clave, cliente, activa, expira_en) VALUES (?,?,1, DATE_ADD(NOW(), INTERVAL? MONTH))";
  else sql = "INSERT INTO licencias (clave, cliente, activa, expira_en) VALUES (?,?,1, DATE_ADD(NOW(), INTERVAL? DAY))";

  db.query(sql, [key, cliente, cantidad], (e)=>{
    if(e){ console.log(e); return res.status(500).json(e); }
    res.json({ok:true, key, cliente, cantidad, unidad});
  });
});

app.post('/api/licencia/eliminar', (req,res)=>{
  db.query("DELETE FROM licencias WHERE id=?", [req.body.id], (e)=>{
    if(e) return res.status(500).json(e);
    res.json({ok:true});
  });
});

app.get('/api/licencia/verificar', (req,res)=>{
  const clave = req.query.clave;
  if(clave === 'MASTER-OWNER-2026') return res.json({valida:true, eterna:true});
  db.query("SELECT * FROM licencias WHERE clave=? AND activa=1 AND (expira_en IS NULL OR expira_en > NOW())", [clave], (e,r)=>{
    if(e) return res.json({valida:false});
    res.json({valida: r.length>0, datos: r[0]||null});
  });
});
app.post('/api/licencia/validar', (req,res)=>{
  const {key} = req.body;
  if(key === 'MASTER-OWNER-2026') return res.json({ok:true});
  db.query("SELECT * FROM licencias WHERE clave=? AND activa=1", [key], (e, rows)=>{
    if(rows && rows.length>0) return res.json({ok:true});
    return res.json({ok:false});
  });
});
app.post('/api/licencia/eliminar',(req,res)=>{
  db.query("DELETE FROM licencias WHERE id=?",[req.body.id], ()=> res.json({ok:true}));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Server '+PORT));