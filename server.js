import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// No conectamos al arrancar, para que no se caiga
let db = null;
if(process.env.DB_HOST){
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

app.get('/api/productos', (req, res) => {
  if(!db) return res.json({msg: "Falta configurar DB"});
  db.query('SELECT * FROM productos', (err, result) => {
    if(err) return res.status(500).send(err);
    res.json(result);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Servidor corriendo en ' + PORT));