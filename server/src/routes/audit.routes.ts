import { Router } from "express";
import {
  createAudit,
  getAudit,
  getAudits,
} from "../controllers/audit.controller";

const router = Router();

router.post("/audit", createAudit);
router.get("/audits", getAudits);
router.get("/audits/:id", getAudit);

export default router;
