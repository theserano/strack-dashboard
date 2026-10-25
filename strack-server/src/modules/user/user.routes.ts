import { Router } from 'express';
import {
  getDocumentController,
  getUserController,
  submitComplianceController,
  updateUserController,
  uploadDocumentsController,
} from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Mounted at /strack-api/user
const router = Router();

router.get('/', authMiddleware(getUserController)); // GET   /user?userId=
router.patch('/', authMiddleware(updateUserController)); // PATCH /user?userId=          (JSON)
router.post('/documents', authMiddleware(uploadDocumentsController)); // POST /user/documents?userId= (multipart)
router.get('/documents/:type', authMiddleware(getDocumentController)); // GET  /user/documents/cac?userId=
router.post('/compliance/submit', authMiddleware(submitComplianceController)); // POST /user/compliance/submit?userId=

export default router;
