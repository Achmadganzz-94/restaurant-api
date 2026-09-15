import { Router } from "express";
import { createPayment } from "../controllers/paymentController"; 
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/", createPayment);

export default router;
