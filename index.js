const express = require('express')
let cors = require("cors");
const app = express()
require('dotenv').config()
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruhvmdy.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // DATABASE COLLECTIONS 
        let blogsCollection = client.db("delightfulBlogsDB").collection("blogs");

        // API ENDPOINT TO POST DATA INTO BLOGS COLLECTION 
        app.post("/blogs", async (req, res) => {
            const blogs = req.body;
            const result = await blogsCollection.insertOne(blogs);
            console.log(result);
            res.send(result);
        });

        // API ENDPOINT TO GET BLOG DATA BY DATE
        app.get('/blogsByDate', async (req, res) => {
            try {
                const blogsByDate = await blogsCollection.find().sort({ postedAt: -1 }).toArray();
                res.json(blogsByDate);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Failed to retrieve blogs.' });
            }
        });

        // API ENDPOINT TO READ ALL BLOGS 
        app.get("/blogs", async (req, res) => {
            const result = await blogsCollection.find().toArray();
            res.send(result);
          });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Delightful Blogs Server Running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})