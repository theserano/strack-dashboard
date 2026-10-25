import { Types } from 'mongoose';
import { BaseUser, DOCUMENT_TYPES, DocumentType, StoredDocument, UserModel } from './user.schema';
import { BUSINESS_FIELDS, UpdateUserInput } from './user.validation';
import { HttpError } from '../../utils/httpError';
import { deleteFile, openFile, saveFile } from '../../utils/gridfs';
import { logActivity } from '../activity/activity.service';

const PERSONAL_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'dob', 'bvn'] as const;

const findUserDoc = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid userId');
  // findById returns the right discriminator (individual/business), so business fields save correctly.
  const user = await UserModel.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
};

const toSafeUser = (user: BaseUser) => {
  const { password: _password, ...rest } = user.toObject();
  return rest;
};

/** Which compliance steps are done, so the client and the submit check agree. */
export const getComplianceProgress = (userData: object) => {
  const user = userData as Record<string, unknown>;
  const filled = (fields: readonly string[]) => fields.every((f) => !!user[f]);
  const documents = (user.documents ?? {}) as Partial<Record<DocumentType, unknown>>;

  return {
    personalInformation: filled(PERSONAL_FIELDS),
    businessDetails: filled(BUSINESS_FIELDS),
    businessDocuments: DOCUMENT_TYPES.every((t) => !!documents[t]),
  };
};

const markInProgress = (user: BaseUser) => {
  if (user.complianceStatus === 'not_started' || user.complianceStatus === 'rejected') {
    user.complianceStatus = 'in_progress';
  }
};

const assertEditable = (user: BaseUser) => {
  if (user.complianceStatus === 'pending_review' || user.complianceStatus === 'approved') {
    throw new HttpError(409, 'Your details are under review or approved and can no longer be edited');
  }
};

export const getUserService = async (userId: string) => {
  const user = await UserModel.findById(userId).select('-password').lean();
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const updateUserService = async (userId: string, updates: UpdateUserInput) => {
  const user = await findUserDoc(userId);
  assertEditable(user);

  user.set({ ...updates, ...(updates.dob && { dob: new Date(updates.dob) }) });
  markInProgress(user);
  await user.save();
  await logActivity(userId, { action: 'update', entity: 'user', entityId: userId, description: 'Updated compliance details' });
  return toSafeUser(user);
};

export const uploadDocumentsService = async (
  userId: string,
  files: Partial<Record<DocumentType, Express.Multer.File>>
) => {
  const user = await findUserDoc(userId);
  assertEditable(user);

  const saved: Types.ObjectId[] = [];
  const replaced: Types.ObjectId[] = [];
  try {
    for (const [type, file] of Object.entries(files) as [DocumentType, Express.Multer.File][]) {
      const fileId = await saveFile(file, { userId, type });
      saved.push(fileId);

      const previous = user.documents?.[type]?.fileId;
      if (previous) replaced.push(previous);

      const doc: StoredDocument = {
        fileId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      };
      user.set(`documents.${type}`, doc);
    }
    markInProgress(user);
    await user.save();
  } catch (error) {
    // Don't leave orphaned files behind if anything failed.
    await Promise.all(saved.map(deleteFile));
    throw error;
  }

  // Only remove the old files once the new ones are linked to the user.
  await Promise.all(replaced.map(deleteFile));
  await logActivity(userId, { action: 'update', entity: 'user', entityId: userId, description: 'Uploaded compliance documents' });
  return toSafeUser(user);
};

export const getDocumentService = async (userId: string, type: string) => {
  if (!DOCUMENT_TYPES.includes(type as DocumentType)) throw new HttpError(400, 'Unknown document type');
  const user = await findUserDoc(userId);
  const doc = user.documents?.[type as DocumentType];
  if (!doc) throw new HttpError(404, 'Document not uploaded');
  return { doc, stream: openFile(doc.fileId) };
};

export const submitComplianceService = async (userId: string) => {
  const user = await findUserDoc(userId);
  assertEditable(user);

  const progress = getComplianceProgress(user.toObject());
  const missing = Object.entries(progress)
    .filter(([, done]) => done === false)
    .map(([step]) => step);
  if (missing.length) {
    throw new HttpError(400, `Complete these steps first: ${missing.join(', ')}`);
  }

  // No manual review step yet: a complete submission is verified straight away.
  user.complianceStatus = 'approved';
  user.verified = true;
  await user.save();
  await logActivity(userId, { action: 'update', entity: 'user', entityId: userId, description: 'Submitted compliance for verification' });
  return toSafeUser(user);
};
