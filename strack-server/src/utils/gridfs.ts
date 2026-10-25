import mongoose, { Types } from 'mongoose';

// Uploaded compliance files live in MongoDB GridFS, bucket "documents"
// (collections documents.files and documents.chunks).
const bucket = () => {
  if (!mongoose.connection.db) throw new Error('Database is not connected');
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documents' });
};

export const saveFile = (
  file: { buffer: Buffer; originalname: string; mimetype: string },
  metadata: Record<string, unknown>
) =>
  new Promise<Types.ObjectId>((resolve, reject) => {
    const stream = bucket().openUploadStream(file.originalname, {
      metadata: { ...metadata, mimeType: file.mimetype },
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id as Types.ObjectId));
    stream.end(file.buffer);
  });

export const deleteFile = async (fileId: Types.ObjectId) => {
  try {
    await bucket().delete(fileId);
  } catch {
    // Already gone; nothing to clean up.
  }
};

export const openFile = (fileId: Types.ObjectId) => bucket().openDownloadStream(fileId);
