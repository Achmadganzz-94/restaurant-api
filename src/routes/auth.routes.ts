import { Router } from "express";
import { register, login, getAllStaff, updateStaff, deleteStaff  } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/staff", getAllStaff);
router.put("/staff/:id", updateStaff);
router.delete("/staff/:id", deleteStaff);

export default router;
