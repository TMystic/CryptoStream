import { z } from "zod";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findUploadRegistration, relayPurchase, relayUpload } from "../services/blockchain.service.js";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const signature = z.string().regex(/^0x[a-fA-F0-9]+$/);

const uploadSchema = z.object({ body: z.object({
  uploader: address,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  deadline: z.coerce.number().int().positive(),
  signature,
}) });

const recoverUploadSchema = z.object({ body: z.object({
  uploader: address,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
}) });

export const recoverUpload = [
  validate(recoverUploadSchema),
  asyncHandler(async (req, res) => {
    const registration = await findUploadRegistration(req.body);
    res.json({ registration });
  }),
];

export const sponsorUpload = [
  validate(uploadSchema),
  asyncHandler(async (req, res) => res.status(201).json(await relayUpload(req.body))),
];

const purchaseSchema = z.object({ body: z.object({
  buyer: address,
  videoNumber: z.coerce.number().int().positive(),
  deadline: z.coerce.number().int().positive(),
  signature,
}) });

export const sponsorPurchase = [
  validate(purchaseSchema),
  asyncHandler(async (req, res) => res.status(201).json(await relayPurchase(req.body))),
];
