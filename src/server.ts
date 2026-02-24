import express from "express";
import cors from 'cors';

import router from "./router";
import connectDB from "./config/db";
import { corsConfig } from "./config/cors";

connectDB();

const app = express();

//CORS
app.use(cors(corsConfig))

//Enable Data from forms
app.use(express.json())

//Router
app.use('/', router)

export default app;