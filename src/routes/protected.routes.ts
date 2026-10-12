import { Router } from "express";
import { testProtected } from "../controllers/auth.controller.js";

const router = Router()

router.get('/profile', testProtected)

export default router;