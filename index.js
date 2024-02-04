const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const bodyParser = require('body-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true })) 








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.elvxgab.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    

    const menuCollection = client.db("bistroBoss").collection("menu");
    const reviewsCollection = client.db("bistroBoss").collection("reviews");
    const cartsCollection = client.db("bistroBoss").collection("carts");



    app.get('/menu', async (req,res) =>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })
    app.get('/reviews', async (req,res) =>{
        const result = await reviewsCollection.find().toArray()
        res.send(result)
    })


    app.get('/carts', async(req,res) =>{
      const email = req.query.email
      let query ={}
      if(email){
        query = {email:email}
      }else{
        query = {}
      }
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/carts', async(req,res) =>{
      const cartItem = req.body
      const result = await cartsCollection.insertOne(cartItem)
      res.send(result)
    })
    app.delete('/carts', async(req,res) =>{
      const cartId = req.query.id
      const query = {_id: new ObjectId(cartId)}

      const result = await cartsCollection.deleteOne(query)
      res.send(result)
    })

    
    app.get('/', (req, res) => {
        res.send('Hello World!')
      })
      


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);











  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })