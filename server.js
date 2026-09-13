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
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Comprobar conexión al arrancar
db.query('SELECT 1', (err) => {
  if(err) console.log('Error DB:', err);
  else console.log('DB Conectada a', process.env.DB_NAME);
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// --- PRODUCTOS ---
app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, result) => {
    if(err) return res.status(500).json(err);
    res.json(result);
  });
});

// --- REGISTRO ---
app.post('/api/register', (req, res) => {
  const { nombre_completo, usuario, contrasena } = req.body;

  // Ver si ya existe
  db.query('SELECT * FROM usuarios WHERE usuario =?', [usuario], (err, result) => {
    if(err) return res.status(500).json({message: 'Error DB'});
    if(result.length > 0) return res.status(400).json({message: 'Ese nombre de usuario ya existe.'});

    // Ver si es el primero (sera Dueño)
    db.query('SELECT COUNT(*) as total FROM usuarios', (err2, countResult) => {
      const esPrimero = countResult[0].total === 0;
      const rol = esPrimero? 'Dueño' : 'Empleado';
      const estado = esPrimero? 'aprobado' : 'pendiente';

      db.query('INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol, estado) VALUES (?,?,?,?,?)',
      [nombre_completo, usuario, contrasena, rol, estado], (err3) => {
        if(err3) return res.status(500).json({message: 'Error al crear'});
        res.json({message: 'Cuenta creada', rol, estado});
      });
    });
  });
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
  const { usuario, contrasena } = req.body;
  db.query('SELECT * FROM usuarios WHERE usuario =? AND contrasena =?', [usuario, contrasena], (err, result) => {
    if(err) return res.status(500).json({message: 'Error DB'});
    if(result.length === 0) return res.status(400).json({message: 'Usuario o contraseña incorrectos'});

    const user = result[0];
    if(user.estado!== 'aprobado') return res.status(403).json({message: 'Cuenta pendiente de aprobación por el dueño'});

    res.json(user);
  });
});

// --- LISTAR USUARIOS PARA DUEÑO ---
app.get('/api/usuarios', (req, res) => {
  db.query('SELECT id, nombre_completo, usuario, rol, estado FROM usuarios', (err, result) => {
    if(err) return res.status(500).json(err);
    res.json(result);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor corriendo en ' + PORT));