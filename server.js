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
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/', (req, res) => res.sendFile('index.html', { root: '.' }));

app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, r) => {
    if(err) return res.status(500).json(err);
    res.json(r);
  });
});

// REGISTRO COMPATIBLE CON TU TABLA
app.post('/api/register', (req, res) => {
  const { nombre_completo, usuario, contrasena } = req.body;

  db.query('SELECT * FROM usuarios WHERE usuario =?', [usuario], (err, existe) => {
    if(err) return res.status(500).json({message:'Error DB'});
    if(existe.length > 0) return res.status(400).json({message:'Ese nombre de usuario ya existe.'});

    db.query('SELECT COUNT(*) as total FROM usuarios', (err2, totalRes) => {
      const esPrimero = totalRes[0].total === 0;
      const rol_id = esPrimero? 1 : 2; // 1=Dueño, 2=Empleado
      const activo = esPrimero? 1 : 0;
      const pendiente = esPrimero? 0 : 1;

      db.query('INSERT INTO usuarios (nombre_completo, usuario, password_hash, rol_id, activo, pendiente) VALUES (?,?,?,?,?,?)',
      [nombre_completo, usuario, contrasena, rol_id, activo, pendiente], (err3) => {
        if(err3) {
          console.log(err3);
          return res.status(500).json({message:'Error al crear usuario'});
        }
        res.json({message:'Creado', rol_id, activo});
      });
    });
  });
});

// LOGIN COMPATIBLE
app.post('/api/login', (req, res) => {
  const { usuario, contrasena } = req.body;
  db.query('SELECT * FROM usuarios WHERE usuario =? AND password_hash =?', [usuario, contrasena], (err, result) => {
    if(err) return res.status(500).json({message:'Error DB'});
    if(result.length === 0) return res.status(400).json({message:'Usuario o contraseña incorrectos'});

    const user = result[0];
    if(user.pendiente == 1) return res.status(403).json({message:'Cuenta pendiente de aprobación'});

    res.json(user);
  });
});

app.get('/api/usuarios', (req, res) => {
  db.query('SELECT * FROM usuarios', (err, r) => {
    if(err) return res.status(500).json(err);
    res.json(r);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor corriendo ' + PORT));