import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from 'joi'
import dayjs from 'dayjs'

dotenv.config()
const app = express()
const data = dayjs().format("HH:MM:ss")
app.use(cors());
app.use(express.json())

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
    /*try {
        console.log("rodou get participants")   
        const participants = db.collection("participants").find({}).toArray()
        return res.send(participants);
    } catch (err) {
        return res.status(500).send(err.message);
    }*/
});
//-------------------POST /messages----------------------------
app.post('/messages', async (req, res) => {
    console.log("rodou post messages")

	const messages = req.body
    const { user } = req.headers
   
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

	try {
        const respUser = await db.collection("participants").findOne({ name: user }); // Erro de usuario não encontrado
        if (!respUser) return res.status(422).send("Usuario não encontrado")

        await db.collection("messages").insertOne({ to: messages.to, from: user, text: messages.text, type: messages.type, time: data})
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
    //console.log(limit)
    
    db.collection("messages").find().toArray()

        .then(dados => {

            //console.log(dados.filter(msg => (msg.to == "João")))
            const filterMsg = dados.filter(msg => (msg.to == user) || (msg.to == "Todos") || (msg.from == user))
            const ArrayMsg = [...filterMsg]

              
            if (limit === 0 || typeof limit == "string" || Math.sign(limit) === -1) return res.sendStatus(422)

            if (!limit) return res.send(ArrayMsg) 

            console.log(limit)
            const ArrayMsgReverse = ArrayMsg.reverse().slice(0, limit)
            return res.send(ArrayMsgReverse)
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
//-------------------POST /participants------------------------
app.post('/status', async (req, res) => {
    console.log("rodou post status")

	//const { lastStatus } = req.body;
    const { user } = req.headers
    const lastStatus = Date.now()

	try {
        const respUser = await db.collection("participants").findOne({ name: user }); // Erro
        //console.log(respUser)

        if (!respUser) return res.sendStatus(404)

        const result = await db.collection("participants").updateOne({ name: user},{ $set: { lastStatus }});

        console.log(result);
        //1673744606866
        //1673744706424

        return res.sendStatus(200);

        //await db.collection("participants").insertOne({ name: participants.name, lastStatus: Date.now()});
        //await db.collection("messages").insertOne({ from: participants.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: data })

        //return res.sendStatus(201);

    } catch (err) {
        return res.status(500).send(err.message);
    }
})
//--------Remoção automática de usuários inativos--------------
const stopInterval = setInterval (() => {
        console.log("----Remoção automática----")
        //const lastStatusAtual = Date.now()
           // const { user } = req.headers
        db.collection("participants").find().toArray()
            .then(dados => {
                dados.filter(user => {
                    //console.log(user.name)
                    if(user.lastStatus > 10000){
                        console.log(user.name)
                            db.collection("messages").insertOne({ from: user.name, to: 'Todos', text: 'sai na sala...', type: 'status', time: data })
                            db.collection("participants").deleteOne( user )
                    }
                })
            })        
        
}, 15000)
//-------------------porta do servidor-------------------------
app.listen(5000, () => {
	console.log("Servidor rodando!")
})