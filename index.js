import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";

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

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicTuitionQuery = { approvalStatus: "approved", isActive: true };

app.get("/", (req, res) => {
  res.send("MentorLagbe server is running");
});

app.get("/stats", async (req, res) => {
  const [tutorCount, studentCount, tuitionCount, subjects] = await Promise.all([
    users.countDocuments({ role: "tutor" }),
    users.countDocuments({ role: "student" }),
    tuitions.countDocuments(publicTuitionQuery),
    tuitions
      .aggregate([
        { $match: publicTuitionQuery },
        { $group: { _id: "$subject", count: { $sum: 1 } } },
        { $project: { _id: 0, subject: "$_id", count: 1 } },
        { $sort: { count: -1, subject: 1 } },
      ])
      .toArray(),
  ]);

  res.send({
    tutors: tutorCount,
    students: studentCount,
    tuitions: tuitionCount,
    subjects,
  });
});

app.get("/tuitions", async (req, res) => {
  const { search, subject, classLevel, mode } = req.query;
  const query = { ...publicTuitionQuery };

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ title: pattern }, { subject: pattern }];
  }
  if (subject) {
    query.subject = subject;
  }
  if (classLevel) {
    query.classLevel = classLevel;
  }
  if (mode) {
    query.mode = mode;
  }

  const result = await tuitions.find(query).sort({ createdAt: -1 }).toArray();
  res.send(result);
});

app.get("/tuitions/featured", async (req, res) => {
  const result = await tuitions
    .find(publicTuitionQuery)
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.send(result);
});

app.get("/tuitions/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Tuition not found" });
  }

  const tuition = await tuitions.findOne({
    _id: new ObjectId(id),
    approvalStatus: "approved",
  });

  if (!tuition) {
    return res.status(404).send({ message: "Tuition not found" });
  }

  const tutor = await users.findOne(
    { email: tuition.tutorEmail },
    { projection: { name: 1, email: 1, image: 1, bio: 1, phone: 1, plan: 1 } }
  );

  res.send({ ...tuition, tutor });
});

const isFilled = (value) => typeof value === "string" && value.trim() !== "";

app.post("/applications", verifyToken, verifyStudent, async (req, res) => {
  const { tuitionId, studentPhone, preferredSchedule, studentNote } = req.body;

  if (
    !ObjectId.isValid(tuitionId) ||
    !isFilled(studentPhone) ||
    !isFilled(preferredSchedule) ||
    !isFilled(studentNote)
  ) {
    return res.status(400).send({ message: "Please fill in all fields" });
  }

  const tuition = await tuitions.findOne({
    _id: new ObjectId(tuitionId),
    ...publicTuitionQuery,
  });

  if (!tuition) {
    return res.status(404).send({ message: "Tuition not found" });
  }

  const existing = await applications.findOne({
    tuitionId,
    studentEmail: req.user.email,
  });

  if (existing) {
    return res
      .status(409)
      .send({ message: "You have already applied for this tuition" });
  }

  const application = {
    tuitionId,
    tuitionTitle: tuition.title,
    subject: tuition.subject,
    monthlyFee: tuition.monthlyFee,
    tutorName: tuition.tutorName,
    tutorEmail: tuition.tutorEmail,
    studentName: req.user.name,
    studentEmail: req.user.email,
    studentPhone: studentPhone.trim(),
    preferredSchedule: preferredSchedule.trim(),
    studentNote: studentNote.trim(),
    status: "pending",
    appliedAt: new Date(),
  };

  const result = await applications.insertOne(application);
  res.status(201).send(result);
});

app.get("/applications/check/:tuitionId", verifyToken, async (req, res) => {
  const application = await applications.findOne(
    { tuitionId: req.params.tuitionId, studentEmail: req.user.email },
    { projection: { status: 1, appliedAt: 1 } }
  );

  res.send({
    applied: Boolean(application),
    status: application?.status ?? null,
    appliedAt: application?.appliedAt ?? null,
  });
});

app.get("/applications/me", verifyToken, verifyStudent, async (req, res) => {
  const result = await applications
    .find({ studentEmail: req.user.email })
    .sort({ appliedAt: -1 })
    .toArray();
  res.send(result);
});

app.delete("/applications/:id", verifyToken, verifyStudent, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).send({ message: "Application not found" });
  }

  const application = await applications.findOne({
    _id: new ObjectId(id),
    studentEmail: req.user.email,
  });

  if (!application) {
    return res.status(404).send({ message: "Application not found" });
  }

  if (application.status !== "pending") {
    return res
      .status(400)
      .send({ message: "Only pending applications can be cancelled" });
  }

  const result = await applications.deleteOne({ _id: application._id });
  res.send(result);
});

app.get("/stats/student", verifyToken, verifyStudent, async (req, res) => {
  const query = { studentEmail: req.user.email };
  const [total, accepted, pending] = await Promise.all([
    applications.countDocuments(query),
    applications.countDocuments({ ...query, status: "accepted" }),
    applications.countDocuments({ ...query, status: "pending" }),
  ]);

  res.send({ total, accepted, pending, plan: req.user.plan ?? "free" });
});

app.listen(port, () => {
  console.log(`MentorLagbe server is running on port ${port}`);
});

export default app;
