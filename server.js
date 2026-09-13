import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Usamos POOL para que no se caiga
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

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, result) => {
    if(err) {
      console.log(err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor corriendo en ' + PORT));