import multer from 'multer';
import { Request, Response } from 'express';
import {
  getComplianceProgress,
  getDocumentService,
  getUserService,
  submitComplianceService,
  updateUserService,
  uploadDocumentsService,
} from './user.service';
import { updateUserSchema } from './user.validation';
import { DOCUMENT_TYPES, DocumentType } from './user.schema';
import { HttpError, toErrorResponse } from '../../utils/httpError';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: DOCUMENT_TYPES.length },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, `${file.originalname} must be a PDF, JPG or PNG`));
  },
}).fields(DOCUMENT_TYPES.map((name) => ({ name, maxCount: 1 })));

const parseUpload = (req: Request, res: Response) =>
  new Promise<void>((resolve, reject) =>
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 5MB or smaller' : err.message;
        reject(new HttpError(400, message));
      } else if (err) reject(err);
      else resolve();
    })
  );

/** Reads ?userId= and makes sure it belongs to the logged-in user. */
const getOwnUserId = (req: Request) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    throw new HttpError(400, 'Invalid or missing userId');
  }
  if (req.user?.userId !== userId) {
    throw new HttpError(403, 'You can only change your own account');
  }
  return userId;
};

const sendError = (res: Response, error: unknown) => {
  const { status, message } = toErrorResponse(error);
  if (status >= 500) console.error(error);
  res.status(status).json({ message });
};

const withProgress = (user: object) => ({
  ...user,
  complianceProgress: getComplianceProgress(user),
});

export const getUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing userId' });
    }

    const user = await getUserService(userId);

    return res.status(200).json({
      message: 'User fetched successfully',
      data: withProgress(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const userId = getOwnUserId(req);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? 'Invalid details',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const user = await updateUserService(userId, parsed.data);
    res.status(200).json({ message: 'User updated successfully', data: withProgress(user) });
  } catch (error) {
    sendError(res, error);
  }
};

export const uploadDocumentsController = async (req: Request, res: Response) => {
  try {
    const userId = getOwnUserId(req);
    await parseUpload(req, res);

    const fileFields = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const files: Partial<Record<DocumentType, Express.Multer.File>> = {};
    for (const type of DOCUMENT_TYPES) {
      if (fileFields[type]?.[0]) files[type] = fileFields[type][0];
    }
    if (!Object.keys(files).length) {
      return res.status(400).json({ message: 'Attach at least one document' });
    }

    const user = await uploadDocumentsService(userId, files);
    res.status(200).json({ message: 'Documents uploaded successfully', data: withProgress(user) });
  } catch (error) {
    sendError(res, error);
  }
};

export const getDocumentController = async (req: Request, res: Response) => {
  try {
    const userId = getOwnUserId(req);
    const { doc, stream } = await getDocumentService(userId, String(req.params.type));

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);
    stream.on('error', (error) => {
      if (!res.headersSent) sendError(res, error);
      else res.end();
    });
    stream.pipe(res);
  } catch (error) {
    sendError(res, error);
  }
};

export const submitComplianceController = async (req: Request, res: Response) => {
  try {
    const userId = getOwnUserId(req);
    const user = await submitComplianceService(userId);
    res.status(200).json({ message: 'Account verified', data: withProgress(user) });
  } catch (error) {
    sendError(res, error);
  }
};
