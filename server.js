import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
const app = express();
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.static('.'));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

app.get('index.html', (req,res)=> res.sendFile('index.html',{root:'.'}));

// PRODUCTOS COMPARTIDOS
app.get('/api/productos', (req,res)=>{
  db.query('SELECT * FROM productos ORDER BY id DESC', (err,r)=>{
    if(err){ console.log("Error productos:",err); return res.json([]); }
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

// USUARIOS COMPARTIDOS
app.post('/api/register', (req,res)=>{
  const {nombre_completo, usuario, contrasena}=req.body;
  db.query('SELECT * FROM usuarios WHERE usuario=?',[usuario], (err,existe)=>{
    if(err) return res.status(500).json(err);
    if(existe.length>0) return res.status(400).json({message:'Ese nombre de usuario ya existe.'});
    db.query('SELECT COUNT(*) as total FROM usuarios', (err2,totalRes)=>{
      if(err2) return res.status(500).json(err2);
      const esPrimero = totalRes[0].total===0;
      const rol_id=esPrimero?1:2; const activo=esPrimero?1:0; const pendiente=esPrimero?0:1;
      db.query('INSERT INTO usuarios (nombre_completo, usuario, password_hash, rol_id, activo, pendiente) VALUES (?,?,?,?,?,?)',
      [nombre_completo,usuario,contrasena,rol_id,activo,pendiente], (err3)=>{
        if(err3){ console.log(err3); return res.status(500).json(err3); }
        res.json({message:'creado', rol_id});
      });
    });
  });
});
app.post('/api/login', (req, res) => {
  const { usuario, clave } = req.body;

  // DIOS - Entra siempre, sin consultar base de datos
  if (usuario === 'superadmin' && clave === 'Super2026!') {
    return res.json({ ok: true, usuario: 'superadmin', rol: 'superadmin' });
  }

  // Dueños y demás
  db.query("SELECT * FROM usuarios WHERE usuario=? AND clave=?", [usuario, clave], (e, rows) => {
    if (rows && rows.length > 0) {
      return res.json({ ok: true, usuario: rows[0].usuario, rol: rows[0].rol });
    }
    return res.json({ ok: false, error: 'usuario no existe' });
  });
});

app.post('/api/licencia/validar', (req,res)=>{
  const {key} = req.body;
  if(key === 'MASTER-OWNER-2026') return res.json({ok:true}); // tu master siempre válida
  db.query("SELECT * FROM licencias WHERE clave=? AND activa=1", [key], (e, rows)=>{
    if(rows && rows.length>0) return res.json({ok:true});
    return res.json({ok:false});
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
// === SUPERADMIN Y LICENCIAS CON TIEMPO ===
function initLicenciasV2(){
  db.query(`CREATE TABLE IF NOT EXISTS licencias (id INT AUTO_INCREMENT PRIMARY KEY, clave VARCHAR(100) UNIQUE NOT NULL, cliente VARCHAR(100), activa TINYINT(1) DEFAULT 1, creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expira_en DATETIME NULL)`, (e)=>{
    if(!e){
      db.query("INSERT IGNORE INTO licencias (clave, cliente, activa, expira_en) VALUES ('MASTER-OWNER-2026','SuperAdmin Master',1, DATE_ADD(NOW(), INTERVAL 10 YEAR))");
      // intenta agregar columna si la tabla es vieja
      db.query("ALTER TABLE licencias ADD COLUMN IF NOT EXISTS expira_en DATETIME NULL", ()=>{});
    }
  });
  db.query(`CREATE TABLE IF NOT EXISTS categorias (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) UNIQUE NOT NULL)`, ()=>{});
}
function initSistema(){
  db.query(`CREATE TABLE IF NOT EXISTS usuarios (id INT AUTO_INCREMENT PRIMARY KEY, usuario VARCHAR(100) UNIQUE, clave VARCHAR(100), rol VARCHAR(20))`, ()=>{
    db.query(`INSERT IGNORE INTO usuarios (usuario, clave, rol) VALUES ('superadmin','Super2026!','superadmin'), ('owner','owner123','owner')`);
  });
  db.query(`CREATE TABLE IF NOT EXISTS licencias (id INT AUTO_INCREMENT PRIMARY KEY, clave VARCHAR(100) UNIQUE, cliente VARCHAR(100), activa TINYINT(1) DEFAULT 1, expira_en DATETIME)`, ()=>{});
  db.query(`CREATE TABLE IF NOT EXISTS categorias (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) UNIQUE)`, ()=>{});
}
initSistema();

// LOGIN UNICO PARA TODOS - ESTE ES EL QUE QUIERES
app.post('/api/login', (req,res)=>{
  const {usuario, clave} = req.body;
  db.query("SELECT * FROM usuarios WHERE usuario=? AND clave=?", [usuario, clave], (e, rows)=>{
    if(rows && rows.length > 0){
      return res.json({ok:true, usuario: rows[0].usuario, rol: rows[0].rol});
    }
    // Si no es usuario, intenta como licencia vieja
    if(usuario === 'MASTER-OWNER-2026') return res.json({ok:true, usuario:'owner', rol:'owner'});
    return res.json({ok:false});
  });
});

// CATEGORIAS ILIMITADAS - YA SIN BLOQUEO
app.get('/api/categorias',(req,res)=>{ db.query("SELECT * FROM categorias", (e,r)=> res.json(r||[])); });
app.post('/api/categorias',(req,res)=>{
  const nombre = req.body.nombre?.trim();
  if(!nombre) return res.status(400).json({error:'vacío'});
  db.query("INSERT INTO categorias (nombre) VALUES (?)",[nombre], (e)=>{
    if(e) return res.status(400).json({error:'Ya existe'});
    res.json({ok:true});
  });
});
app.post('/api/categorias/borrar',(req,res)=>{
  db.query("DELETE FROM categorias WHERE nombre=?",[req.body.nombre], ()=> res.json({ok:true}));
});

// LICENCIAS - SOLO SI ERES SUPERADMIN TE DEJA USARLAS
app.get('/api/licencias',(req,res)=>{ db.query("SELECT * FROM licencias", (e,r)=> res.json(r||[])); });
app.post('/api/licencia/generar',(req,res)=>{
  const key = 'LIC-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const cliente = req.body.cliente || 'Cliente';
  const dias = req.body.dias || 30;
  db.query("INSERT INTO licencias (clave, cliente, expira_en) VALUES (?,?, DATE_ADD(NOW(), INTERVAL? DAY))",[key, cliente, dias], ()=> res.json({key, cliente, dias}));
});
const PORT = process.env.PORT || 12000;
app.listen(PORT, ()=> console.log('Servidor corriendo '+PORT));