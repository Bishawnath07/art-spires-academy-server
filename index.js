const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
 
 // middleware
 app.use(cors());
 app.use(express.json());
 
 
 const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
    const instructorsCollection = client.db("artspiresDB").collection("instructors")
    const usersCollection = client.db("artspiresDB").collection("users")


    // users relatate api
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





    // classes relate api
    app.get('/classes' , async(req , res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

    // Instructors relate api
    app.get('/instructors' , async(req , res) =>{
        const result = await classCollection.find().toArray();
        res.send(result);
    })

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