const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const SSLCommerzPayment = require('sslcommerz-lts')

app.use(cors());

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
    const usersCollection = client.db("bistroBoss").collection("users");
    const orderCollection = client.db("bistroBoss").collection("order");
    const orderDetailsCollection = client.db("bistroBoss").collection("orderDetails");

    const store_id = process.env.store_id
    const store_passwd = process.env.store_pass
    const is_live = false //true for live, false for sandbox


    app.get('/menu', async (req,res) =>{
        const itemId = req.query.id
        const query = {_id: new ObjectId(itemId)}
        if(itemId){
          const result = await menuCollection.findOne(query)
          res.send(result)
          return
        }
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
      }
      else{
        query = {}
      }
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })

    // jwt related api 

    app.post('/jwt', async(req, res) =>{
      const email = req.query.email
      const token = jwt.sign({email}, process.env.SECRETE, {expiresIn: '1h'})
      res.send({token})
    })


    // verify token 

    const verifyToken = (req, res, next) =>{
      if(!req.headers.authorization){
        return res.status(401).send({message:'forbidden access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.SECRETE,  (err, decoded) => {
        if(err){
          return res.status(401).send({message:'forbidden access'})
        }
        req.decoded = decoded
        next() 
      })

    }

    app.get('/users/admin/:email', verifyToken, async(req,res) =>{
      const email = req.params.email;
      if(email !== req.decoded.email ){
        return res.status(403).send({message:'unauthorized access'})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let admin = false;
      if(user){
        admin = user?.role === 'Admin';
      }
      res.send(admin)
    })

    app.get('/users', verifyToken, async(req,res) =>{
      const user = req.headers.authorization
      const result = await usersCollection.find().toArray()
      res.send(result)
      
    })

    app.post('/users', async(req, res) =>{
      const user = req.body
      
      const query = {email: user?.email}

      const exitUser = await usersCollection.findOne(query)
      if(exitUser){
        return res.send({message:'already email exit'})
      }

      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    app.post('/menu', verifyToken, async(req,res) =>{
      const item = req.body
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })


    app.put('/users/Admin', async(req,res) =>{
      const id = req.query.id
      console.log(id)
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'Admin'
        },
      };

      const result = await usersCollection.updateOne(filter,updateDoc)
      res.send(result)
    })


    app.post('/carts', async(req,res) =>{
      const cartItem = req.body
      const result = await cartsCollection.insertOne(cartItem)
      res.send(result)
    })
    app.delete('/carts', async(req,res) =>{
      const cartId = req.query.id
      console.log(cartId)
      const query = {_id: new ObjectId(cartId)}

      const result = await cartsCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/menu', async(req,res) =>{
      const cartId = req.query.id
      const query = {_id: new ObjectId(cartId)}
      const result = await menuCollection.deleteOne(query)
      res.send(result)

    })

    app.delete('/users', async(req,res) =>{
      const id = req.query.id
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })


    app.patch('/menu/:id', async(req,res) =>{
      const menuId = req.params.id

      const menuData = req.body
      const filter = {_id: new ObjectId(menuId)}

      const updateDoc = {
        $set: {
          name: menuData.name,
          recipe: menuData.recipe,
          image: menuData.image,
          category: menuData.category,
          price: menuData.price,
          
        },
      }
      
      
      const result = await menuCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    
    app.get('/', (req, res) => {
        res.send('Hello World!')
      })
      



    app.post('/init', async (req, res) => {


      const tranId = new ObjectId().toString()
      const paymentData = req.body

      const query = {_id:{
        $in:paymentData?._id?.map(id => new ObjectId(id))
      }}


      const data = {
          total_amount: paymentData?.totalPrice,
          currency: 'BDT',
          tran_id: tranId,
          success_url: `https://bistro-boss-server-5u30.onrender.com/dashboard/successPay/${tranId}`,
          fail_url: 'http://localhost:3030/fail',
          cancel_url: 'http://localhost:3030/cancel',
          ipn_url: 'http://localhost:3030/ipn',
          shipping_method: 'Courier',
          product_name: 'Computer.',
          product_category: 'Electronic',
          product_profile: 'general',
          cus_name: 'Customer Name',
          cus_email: 'customer@example.com',
          cus_add1: 'Dhaka',
          cus_add2: 'Dhaka',
          cus_city: 'Dhaka',
          cus_state: 'Dhaka',
          cus_postcode: '1000',
          cus_country: 'Bangladesh',
          cus_phone: '01711111111',
          cus_fax: '01711111111',
          ship_name: 'Customer Name',
          ship_add1: 'Dhaka',
          ship_add2: 'Dhaka',
          ship_city: 'Dhaka',
          ship_state: 'Dhaka',
          ship_postcode: 1000,
          ship_country: 'Bangladesh',
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
      
          let GatewayPageURL = apiResponse.GatewayPageURL
          res.send(GatewayPageURL)
          

      });
      const findResult = await cartsCollection.find(query).toArray()
           const updateDoc = {
          $set: {
            date: paymentData?.date,
            status: 'pending'
          },
        };

      const insertResult = await orderCollection.insertMany(findResult)
      const result = await orderCollection.updateMany(query, updateDoc)
      const deleteResult = await cartsCollection.deleteMany(query)



      app.post('/dashboard/successPay/:tranId' , async(req, res) =>{

        const orderDetails = {
          trangactionId: tranId,
          totalPrice: paymentData?.totalPrice,
          name: paymentData?.name,
          email:paymentData?.email,
          phone:paymentData?.phone,
          date: paymentData?.date,
          address: paymentData?.address,
          count: paymentData?.count

        }
        const query = {email: paymentData?.email} 


        const findFinalPaymentResult = await orderDetailsCollection.find(query).toArray()
        const updateDoc = {
          $set: {
            trangactionId:tranId,
            totalPrice:findFinalPaymentResult[0]?.totalPrice + orderDetails?.totalPrice,
            count: findFinalPaymentResult[0]?.count + orderDetails.count,
            name:paymentData?.name,
            phone:paymentData?.phone,
            date: paymentData?.date,
          },
        };

    
  
        if(findFinalPaymentResult.length){
         
          const updateResult = await orderDetailsCollection.updateMany(query, updateDoc);
          console.log(updateResult)
          if(updateResult?.acknowledged === true){
            res.redirect(`https://bistro-boss-3473d.web.app/dashboard/successPay/${req.params.tranId}`)
          }
          
        }else{
          const finalPaymentResult = await orderDetailsCollection.insertOne(orderDetails)
        if(finalPaymentResult?.acknowledged === true){
          res.redirect(`https://bistro-boss-3473d.web.app/dashboard/successPay/${req.params.tranId}`)
        }
        }
      })
  })
  


  app.get('/orderDetails/:email', verifyToken, async(req, res) =>{
    const email = req.params.email;
    const query = {email: email}
    const result = await orderDetailsCollection.find(query).toArray()
    res.send(result)

  })
  app.get('/order/:email', verifyToken, async(req, res) =>{
    const email = req.params.email;
    const query = {email: email}
    const result = await orderCollection.find(query).toArray()
    res.send(result)

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