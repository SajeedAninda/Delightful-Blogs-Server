const express = require('express')
let cors = require("cors");
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(cors({
    origin: ['https://delightful-blogs-sajeed.netlify.app', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    // console.log(token);
    if (!token) {
        return res.status(401).send({ message: 'Not Authorized' })
    }
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        // WISHLIST COLLECTION 
        let wishlistCollection = client.db("delightfulBlogsDB").collection("wishlist");
        // COMMENTS COLLECTION 
        let commentsCollection = client.db("delightfulBlogsDB").collection("comments");

        // API ENDPOINT TO POST DATA INTO BLOGS COLLECTION 
        app.post("/blogs", verifyToken, async (req, res) => {
            const blogs = req.body;
            const result = await blogsCollection.insertOne(blogs);
            // console.log(result);
            res.send(result);
        });

        // API ENDPOINT TO GET BLOG DATA BY DATE
        app.get('/blogsByDate', async (req, res) => {
            try {
                let projection = {
                    title: 1,
                    photoUrl: 1,
                    shortDescription: 1,
                    categoryName: 1,
                    postedAt: 1
                };

                const blogsByDate = await blogsCollection.find().sort({ postedAt: -1 }).project(projection).limit(6).toArray();

                res.json(blogsByDate);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Failed to retrieve blogs.' });
            }
        });


        // API ENDPOINT TO READ ALL BLOGS 
        app.get("/allBlogs", verifyToken, async (req, res) => {
            const result = await blogsCollection.find().toArray();
            res.send(result);
        });

        // API TO GET SELECTIVE DATA FROM ALL BLOGS 
        app.get("/blogs", async (req, res) => {
            try {
                const projection = {
                    title: 1,
                    photoUrl: 1,
                    shortDescription: 1,
                    categoryName: 1
                };

                const searchTitle = req.query.title;
                const searchCategory = req.query.categoryName;

                const query = {};

                if (searchTitle) {
                    query.title = { $regex: searchTitle, $options: "i" };
                }

                if (searchCategory) {
                    query.categoryName = searchCategory;
                }

                const result = await blogsCollection.find(query).project(projection).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to retrieve blogs." });
            }
        });

        // API TO GET SINGLE DATA BY ID FOR BLOG DETAILS 
        app.get("/blogDetails/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            };
            const result = await blogsCollection.findOne(query);
            // console.log(result);
            res.send(result);
        });

        // API TO GET DATA TO UPDATE BLOGS 
        app.get("/updateBlog/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            };
            const result = await blogsCollection.findOne(query);
            console.log(result);
            res.send(result);
        });

        // PATCH DATA TO UPDATE BLOG
        app.patch('/updateBlog/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedBlogs = {
                $set: {
                    title: updateData.title,
                    categoryName: updateData.categoryName,
                    photoUrl: updateData.photoUrl,
                    shortDescription: updateData.shortDescription,
                    longDescription: updateData.longDescription
                },
            };
            const result = await blogsCollection.updateOne(filter, updatedBlogs, options);
            res.send(result);
        });

        // API TO POST WISHLIST DATA 
        app.post("/wishlist", async (req, res) => {
            const wishlist = req.body;

            const existingBlog = await wishlistCollection.findOne({
                currentUserEmail: wishlist.currentUserEmail,
                previousId: wishlist.previousId
            });

            if (existingBlog) {
                return res.send({ success: false, message: "Blog Exists in Wishlist" });
            }

            // Add the blog to the wishlist
            const result = await wishlistCollection.insertOne(wishlist);

            if (!result) {
                return res.status(500).json({ success: false, error: "Failed to add blog to the wishlist" });
            }

            res.status(201).json({ success: true, insertedId: result.insertedId });
        });


        //  API TO GET USER SPECIFIC WISHLIST DATA 
        app.get("/wishlist", verifyToken, async (req, res) => {
            const currentUserEmail = req.query.email;
            const userTokenEmail = req.user.email;
            if (currentUserEmail !== userTokenEmail) {
                return res.status(401).send({ message: 'Not Authorized' });
            }
            const result = await wishlistCollection.find({ currentUserEmail }).toArray();
            res.send(result);
        });

        // API TO DELETE WISHLIST ITEM BY ID 
        app.delete("/wishlist/:id", async (req, res) => {
            const id = req.params.id;
            // console.log("delete", id);
            const query = {
                _id: new ObjectId(id),
            };
            const result = await wishlistCollection.deleteOne(query);
            // console.log(result);
            res.send(result);
        });

        // API TO POST DATA TO COMMENTS COLLECTION 
        app.post("/comments", async (req, res) => {
            const comments = req.body;
            const result = await commentsCollection.insertOne(comments);
            // console.log(result);
            res.send(result);
        });

        // READ COMMENTS DATA BASED ON BLOGS 
        app.get("/comments", verifyToken, async (req, res) => {
            const blogId = req.query.blogId;
            const result = await commentsCollection.find({ commentedBlogId: blogId }).toArray();
            res.send(result);
        });

        // API ENDPOINT TO GET TOP 10 BLOGS BASED ON LENGTH 
        app.get("/topTenBlogs", async (req, res) => {
            const result = await blogsCollection
                .aggregate([
                    { $addFields: { longDescriptionLength: { $strLenCP: "$longDescription" } } },
                    { $sort: { longDescriptionLength: -1 } },
                    { $limit: 10 },
                    { $project: { title: 1, author_name: 1, userPhoto: 1, _id: 1 } }
                ])
                .toArray();

            res.send(result);
        });

        // JWT API ENDPOINTS
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log(user);

            const token = jwt.sign(user, process.env.SECRET_KEY, {
                expiresIn: '24h'
            });

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                })
                .send({ success: true })
        })

        // CLEAR COOKIES AFTER USER IS LOGGED OUT 
        app.post("/logout", (req, res) => {
            let user = req.body;
            res
                .clearCookie("token", {
                    maxAge: 0,
                    secure: true,
                    sameSite: 'none',
                })
                .send({ message: "success" })
        })


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