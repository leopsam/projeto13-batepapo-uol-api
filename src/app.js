import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from 'joi'
import dayjs from 'dayjs'

dotenv.config()
const app = express()
app.use(cors());
app.use(express.json())


let data = dayjs().format("HH:MM:ss")
let lastStatusAtual = Date.now()
let usuarioAtual

const mongoCilent = new MongoClient(process.env.DATABASE_URL)
let db


//-----------------conexao banco mongo-----------------------
try {
    await mongoCilent.connect()
    db = mongoCilent.db()
    console.log("Banco conectado!")
} catch (err) {
    console.log("erro no banco de dados");
}
//-------------------POST /participants------------------------
app.post('/participants', async (req, res) => {
    console.log("rodou post participants")

	const participants = req.body;

    const participantsSchema = joi.object({
        name: joi.string().required(),
      });

    const validation = participantsSchema.validate(participants, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

	try {
        const resp = await db.collection("participants").findOne({ name: participants.name }); // Erro

        if (resp) return res.status(409).send("nome já está sendo utilizado")

        await db.collection("participants").insertOne({ name: participants.name, lastStatus: Date.now()});
        await db.collection("messages").insertOne({ from: participants.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: data })
        usuarioAtual = participants.name

        return res.sendStatus(201);

    } catch (err) {
        return res.status(500).send(err.message);
    }
})
//-------------------GET /participants-------------------------
app.get("/participants", (req, res) => { 
    console.log("rodou get participants")
    db.collection("participants").find().toArray()
    .then(dados => {
      return res.send(dados)
    })
    .catch(() => {
      res.status(500)
    })
});
//-------------------POST /messages----------------------------
app.post('/messages', async (req, res) => {
    console.log("rodou post messages")

	const messages = req.body
    const { user } = req.headers
    usuarioAtual = user
    data = dayjs().format("HH:MM:ss")
   
    const messagesSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required()
      });

    const validation = messagesSchema.validate(messages, { abortEarly: false })

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message)
        return res.status(422).send(errors)
    }
    console.log(messages.type != "message")
    console.log(typeof messages.type)
    if ((messages.type != "message") && (messages.type != "private_message")) {
        return res.status(422).send("Tipo de msg fora do padrão")
    }

	try {
        const respUser = await db.collection("participants").findOne({ name: user }); // Erro de usuario não encontrado
        if (!respUser) return res.status(422).send("Usuario não encontrado")

        await db.collection("messages").insertOne({ from: user, to: messages.to, text: messages.text, type: messages.type, time: data})
        return res.sendStatus(201)

    } catch (err) {
        return res.status(500).send(err.message)
    }
})
//-------------------GET /messages-----------------------------
app.get("/messages", (req, res) => { 
    console.log("rodou get messages")

    const { limit } = req.query
    const { user } = req.headers
    usuarioAtual = user
    
    db.collection("messages").find().toArray()
        .then(dados => {            
            const filterMsg = dados.filter(msg => (msg.to == user) || (msg.to == "Todos") || (msg.from == user))
            const ArrayMsg = [...filterMsg]

            if (limit == undefined) return res.send(ArrayMsg) 
              
            if (Number(limit) === 0 || isNaN(limit) || Math.sign(Number(limit)) === -1) return res.sendStatus(422)

            const ArrayMsgReverse = ArrayMsg.reverse().slice(0, Number(limit))
            return res.send(ArrayMsgReverse)
        })

        .catch(() => {
            res.status(500)
        })    
});
//-------------------POST /participants------------------------
app.post('/status', async (req, res) => {
    console.log("rodou post status")

    const { user } = req.headers
    lastStatusAtual = Date.now()
    usuarioAtual = user    

	try {
        const respUser = await db.collection("participants").findOne({ name: user }); // Erro
        console.log(respUser + " - retorno nome existente")

        if (!respUser) return res.sendStatus(404)

        const result = await db.collection("participants").updateOne({ name: user},{ $set: { lastStatus: lastStatusAtual }});

        console.log(result);

        return res.sendStatus(200);

    } catch (err) {
        return res.status(500).send(err.message);
    }
})
//--------Remoção automática de usuários inativos--------------
const stopInterval = setInterval (() => {
    console.log("----Remoção automática----")
    lastStatusAtual = Date.now()
    data = dayjs().format("HH:MM:ss")
    console.log((lastStatusAtual ) + " - lastStatus atualizado")
    
    db.collection("participants").find().toArray()
        .then(dados => {
            dados.filter(participant => {
                    if((lastStatusAtual - participant.lastStatus) > 10000){
                        console.log(participant.name + " - usuario removido")
                        console.log((lastStatusAtual - participant.lastStatus) + " - usuario lastStatus")
                        db.collection("messages").insertOne({ from: participant.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: data })
                        db.collection("participants").deleteOne( participant )
                    }else{
                        db.collection("participants").updateOne({ name: participant.name},{ $set: { lastStatus: lastStatusAtual }});
                        console.log(participant.name + " - usuario ativo")
                        console.log((participant.lastStatus - lastStatusAtual ) + " - usuario lastStatus")
                    }
                }
            )
        })        
    
}, 15000)
//-------------------porta do servidor-------------------------
app.listen(5000, () => {
	console.log("Servidor rodando!")
})