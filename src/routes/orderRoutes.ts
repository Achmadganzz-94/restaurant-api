import { Router } from "express";
import {
  createOrder,
  getAllOrders,
  getOrderStatusHistory,
  updateOrderStatus,
} from "../controllers/orderController";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/", createOrder);
router.get("/", getAllOrders);
router.patch("/:id/status", updateOrderStatus);
router.get("/:id/history", getOrderStatusHistory);
export default router;
