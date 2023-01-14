import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"

dotenv.config()
const app = express()
app.use(cors());
app.use(express.json())

const mongoCilent = new MongoClient(process.env.DATABASE_URL)
let db

try {
    await mongoCilent.connect()
    db = mongoCilent.db()
    console.log("Banco conectado!")
} catch (err) {
    console.log("erro no banco de dados");
}

app.get("/participants", (req, res) => { 
    db.collection("participants").find().toArray()
    .then(dados => {
      return res.send(dados)
    })
    .catch(() => {
      res.status(500)
    })    
    /*try {
        console.log("rodou get participants")   
        const participants = db.collection("participants").find({}).toArray()
        return res.send(participants);
    } catch (err) {
        return res.status(500).send(err.message);
    }*/
  });


app.listen(5000, () => {
	console.log("Servidor rodando!")
})