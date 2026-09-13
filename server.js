import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
const app = express();
app.use(cors());
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

app.get('/', (req,res)=> res.sendFile('index.html',{root:'.'}));

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
app.post('/api/login', (req,res)=>{
  const {usuario, contrasena}=req.body;
  db.query('SELECT * FROM usuarios WHERE usuario=? AND password_hash=?',[usuario,contrasena], (err,r)=>{
    if(err) return res.status(500).json(err);
    if(r.length===0) return res.status(400).json({message:'Usuario o contraseña incorrectos'});
    if(r[0].pendiente==1) return res.status(403).json({message:'Cuenta pendiente de aprobación'});
    res.json(r[0]);
  });
});
app.get('/api/usuarios', (req,res)=>{
  db.query('SELECT * FROM usuarios',(err,r)=>{
    if(err) return res.json([]);
    res.json(r);
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Servidor corriendo '+PORT));