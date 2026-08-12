import { Router } from "express";
import { recoverUpload, sponsorPurchase, sponsorUpload } from "../controllers/transaction.controller.js";

export const transactionRouter = Router();
transactionRouter.post("/upload/recover", recoverUpload);
transactionRouter.post("/upload", sponsorUpload);
transactionRouter.post("/purchase", sponsorPurchase);
