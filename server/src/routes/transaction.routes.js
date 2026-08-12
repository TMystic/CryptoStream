import { Router } from "express";
import { sponsorPurchase, sponsorUpload } from "../controllers/transaction.controller.js";

export const transactionRouter = Router();
transactionRouter.post("/upload", sponsorUpload);
transactionRouter.post("/purchase", sponsorPurchase);
