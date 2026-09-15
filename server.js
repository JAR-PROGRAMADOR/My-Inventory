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

app.post('/api/register', (req,res)=>{
  const {nombre_completo, usuario, contrasena}=req.body;
  db.query('SELECT * FROM usuarios WHERE usuario=?',[usuario], (err,existe)=>{
    if(existe && existe.length>0) return res.status(400).json({message:'Ese usuario ya existe'});
    db.query('SELECT COUNT(*) as total FROM usuarios', (err2,totalRes)=>{
      const esPrimero = totalRes[0].total===0;
      const rol_id=esPrimero?1:2; const activo=esPrimero?1:0; const pendiente=esPrimero?0:1;
      // Guardamos en TODAS las columnas posibles para compatibilidad
      db.query('INSERT INTO usuarios (nombre_completo, usuario, clave, password_hash, rol, rol_id, activo, pendiente) VALUES (?,?,?,?,?,?,?,?)',
      [nombre_completo,usuario,contrasena,contrasena, esPrimero?'dueño':'empleado', rol_id,activo,pendiente], (err3)=>{
        if(err3){ console.log(err3); return res.status(500).json(err3); }
        res.json({ok:true, rol_id});
      });
    });
  });
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

// LICENCIAS
app.get('/api/licencias',(req,res)=>{ db.query("SELECT * FROM licencias", (e,r)=> res.json(r||[])); });
app.post('/api/licencia/generar',(req,res)=>{
  const key = 'LIC-'+Math.random().toString(36).substring(2,8).toUpperCase()+'-'+Date.now().toString().slice(-4);
  const cliente = req.body.cliente || 'Cliente';
  const dias = parseInt(req.body.dias) || 30;
  db.query("INSERT INTO licencias (clave, cliente, activa, expira_en) VALUES (?,?,1, DATE_ADD(NOW(), INTERVAL? DAY))",[key, cliente, dias], (e)=>{
    if(e){ console.log(e); return res.json({key}); }
    res.json({key, cliente, dias});
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