import { Router } from "express";

import {
  createCustomer,
  getAllCustomers,
  getCustomerOrders,
} from "../controllers/customerController";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/", createCustomer);

router.get("/", getAllCustomers);

router.get("/:id/orders", getCustomerOrders);

export default router;
