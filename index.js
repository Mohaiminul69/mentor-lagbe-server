import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGODB_URI);

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
};

await connectToMongoDB();

const database = client.db(process.env.DB_NAME);
const users = database.collection("users");
const tuitions = database.collection("tuitions");
const applications = database.collection("applications");
const payments = database.collection("payments");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findOne({ email: decoded.email });

    if (!user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).send({ message: "Unauthorized" });
  }
};

const verifyRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).send({ message: "Forbidden" });
  }
  next();
};

const verifyStudent = verifyRole("student");
const verifyTutor = verifyRole("tutor");
const verifyAdmin = verifyRole("admin");

app.get("/", (req, res) => {
  res.send("MentorLagbe server is running");
});

app.listen(port, () => {
  console.log(`MentorLagbe server is running on port ${port}`);
});

export default app;
