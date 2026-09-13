import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, result) => {
    if(err) return res.status(500).send(err);
    res.json(result);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor corriendo'));