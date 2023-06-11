const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
 
 // middleware
// middleware
const corsConfig = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE' , 'PATCH']
  }
  app.use(cors(corsConfig))
  app.options("", cors(corsConfig))
app.use(express.json());
 
 const verifyJWT = (req , res , next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({ error: true , message: 'unauthorized access'});
  }

  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token , process.env.ACCESS_TOKEN_SECRET, (err , decoded) => {
    if(err){
      return res.status(401).send({error: true , message: 'unauthorized access'})
    }
    req.decoded =decoded;
    next();
  })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eo0io7y.mongodb.net/?retryWrites=true&w=majority`

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

    const classCollection = client.db("artspiresDB").collection("classes")
    const approveclassCollection = client.db("artspiresDB").collection("approveclasses")


    const usersCollection = client.db("artspiresDB").collection("users")
    const studentCollection = client.db("artspiresDB").collection("selectClass")
    const paymentCollection = client.db("artspiresDB").collection("payments")

    // JWT
    app.post('/jwt' , (req , res) => {
      const user = req.body;
      const token = jwt.sign(user , process.env.ACCESS_TOKEN_SECRET , {expiresIn: '1h'})
      res.send({token})
    })

      // Warning: use verifyJWT before using verifyAdmin
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        if (user?.role !== 'admin') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }
      // Warning: use verifyJWT before using verifyInstructor
      const verifyInstructor = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        if (user?.role !== 'instructor') {
          return res.status(403).send({ error: true, message: 'forbidden message' });
        }
        next();
      }
      // Warning: use verifyJWT before using verifyInstructor
      app.get("/instructorusers", async (req, res) => {
        const result = await usersCollection.find({ role: "instructor" }).toArray();
        res.send(result);
      });

    app.get('/users' , async (req , res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users' , async(req , res) =>{
        const user = req.body;
        console.log(user)
        const query = {email: user.email }
        const existingUser = await usersCollection.findOne(query)
        if(existingUser){
          return res.send({message: 'user already exists'})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      })

      app.get('/users/admin/:email' , verifyJWT  , async(req , res)=>{
      const email =req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result)

    })
    // instructor
      app.get('/users/instructor/:email' , verifyJWT   , async(req , res)=>{
      const email =req.params.email;

      if(req.decoded.email !== email){
        res.send({instructor: false})
      }

      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
      res.send(result)

    })

      app.patch('/users/admin/:id' , async(req ,res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)} ;
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await usersCollection.updateOne(filter , updateDoc)
      res.send(result)
    })

       app.patch('/users/instructor/:id' , async(req ,res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)} ;
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await usersCollection.updateOne(filter , updateDoc)
      res.send(result)
    })

    // Get paid classes successfully
    app.get('/selectstudent'  , async(req , res)=>{
      let query = {} ;
      if(req.query?.email){
        query= {email: req.query.email }
      }
      const result = await studentCollection.find(query).toArray();
      res.send(result)

    })
    app.get('/succefulpay'  , async(req , res)=>{
      let query = {} ;
      if(req.query?.email){
        query= {email: req.query.email }
      }
      const result = await paymentCollection.find(query).sort({ timestamp: -1 }).toArray();
      res.send(result)

    })

    // student select their class
    app.post('/selectclasses'  , async(req , res)  =>{
      const newItem = req.body;
      const result = await studentCollection.insertOne(newItem);
      res.send(result)
    })

    app.get('/selectclass' ,async(req , res) =>{
      const result = await studentCollection.find().toArray();
      res.send(result);
    })

    app.get('/selectclass/:id' ,async(req , res ) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const option = {
        projection: {name: 1 , price:1 , email:1},
      };
      const result = await studentCollection.findOne(query , option);
      res.send(result)
    })

    app.delete('/selectclass/:id' , async(req , res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await studentCollection.deleteOne(query);
      res.send(result)
    })
    // Instructors relate api
    app.get('/classes' , async(req , res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    // get by id 
    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { name: 1, price: 1, status: 1, img: 1 },
      };

      const result = await classCollection.findOne(query, options);
      res.send(result);
    })

    // updata by admin and next show in classes page
    app.post('/approveclasses'  , async(req , res)  =>{
      const newClass = req.body;
      const result = await approveclassCollection.insertOne(newClass);
      res.send(result)
    })
    // get all aprove classes
    app.get('/appreveclasses', async(req , res) =>{
      const result = await approveclassCollection.find().toArray();
      res.send(result)
    })

  app.post('/classes'  , async(req , res)  =>{
    const newItem = req.body;
    const result = await classCollection.insertOne(newItem);
    res.send(result)
  })


    // create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(price, amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

        // payment related api
        app.post('/payments', verifyJWT, async (req, res) => {
          const payment = req.body;
          const insertResult = await paymentCollection.insertOne(payment);

          res.send({ insertResult });
        });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req , res) =>{
    res.send('art-spires-academy is running')
})

app.listen(port ,()=>{
    console.log(`art-spires-academy is running on port${port}`)
})