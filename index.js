const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 4000;

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

//send mail
const sendMail = (emailAddress) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.TRANSPORTER_EMAIL,
      pass: process.env.TRANSPORTER_PASS,
    },
  });

  //verify transport
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  const mailBody = {
    from: `"FundingTrail" <${process.env.TRANSPORTER_EMAIL}>`,
    to: emailAddress,
    subject: "Payment Successful! ✔",
    html: "<b>Thank you for your payment. Your transaction was successful.</b>",
  };
  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email Send:" + info.response);
    }
  });
};

const tazapayApiKey = process.env.TAZAPAY_API_KEY;
const tazapaySecret = process.env.TAZAPAY_SECRET;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vrdje6l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const programsCollection = client.db("FundingTrail").collection("funding");
    const usersCollection = client.db("FundingTrail").collection("users");
    const CheckoutCollection = client.db("FundingTrail").collection("checkout");

    // get data
    app.get("/programs", async (req, res) => {
      const programType = req.query.type;
      const programPrice = parseInt(req.query.price);
      const query = {};
      if (programType) query.type = programType;
      if (programPrice) query.price = programPrice;
      const result = await programsCollection.find(query).toArray();
      res.send(result);
    });

    //save user
    app.post("/users", async (req, res) => {
      const userData = req.body;
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    //delete program
    app.delete("/program/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await programsCollection.deleteOne(query);
      res.send(result);
    });

    //update programs
    app.put("/programs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedProgram = req.body;
      const updateDoc = {
        $set: {
          type: updatedProgram.type,
          name: updatedProgram.name,
          challenge: updatedProgram.challenge,
          FundedTrader: updatedProgram.FundingTrail,
          Verification: updatedProgram.Verification,
          price: updatedProgram.price,
        },
      };
      const result = await programsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //get user by email
    app.get("/getUser/:email", async (req, res) => {
      const email = req.params.email;
      let query = {};
      if (email !== undefined) {
        query = { email: email };
      }
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post("/payment", async (req, res) => {
      const checkoutData = req.body;
      sendMail(checkoutData.email);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
