import express from "express"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
dotenv.config()

const app = express()
app.use(express.json())

const mongoCilent = new MongoClient(process.env.DATABASE_URL)
let db

mongoCilent.connect()
try {
    db = mongoCilent.db()
} catch (err) {
    console.log("erro no banco de dados");
}


server.listen(5000, () => {
	console.log("Servidor rodando!")
})