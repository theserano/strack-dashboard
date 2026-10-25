'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomButton from '@/lib/components/CustomButton';
import { useBreadcrumbStep } from '@/lib/components/BreadCrumbSelector';
import { DocumentType, uploadDocuments } from '@/lib/features/user/thunkActions';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { showToast } from '@/lib/utils/plainFunctions';
import { FileUp, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // must match the server limit
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const DOCUMENTS: { id: DocumentType; label: string; description: string }[] = [
  { id: 'cac', label: 'CAC Certificate', description: 'Certificate of incorporation from CAC' },
  {
    id: 'memorandum',
    label: 'Memorandum of Association',
    description: 'Upload your memorandum and articles of association',
  },
  { id: 'utility', label: 'Utility Bill', description: 'Recent utility bill (not older than 3 months)' },
  { id: 'validId', label: 'Valid ID', description: "Director's valid government-issued ID" },
];

const BusinessDocuments = () => {
  const dispatch = useAppDispatch();
  const { next } = useBreadcrumbStep();
  const { user, saving } = useAppSelector((state) => state.user);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const locked = user?.complianceStatus === 'pending_review' || user?.complianceStatus === 'approved';

  const handleFileChange = (docId: DocumentType, file: File | null) => {
    if (file && !ALLOWED_TYPES.includes(file.type)) {
      showToast({ message: 'Error', description: `${file.name} must be a PDF, JPG or PNG.` });
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      showToast({ message: 'Error', description: `${file.name} is larger than 5MB.` });
      return;
    }
    setFiles((prev) => {
      const updated = { ...prev };
      if (file) updated[docId] = file;
      else delete updated[docId];
      return updated;
    });
  };

  const missing = DOCUMENTS.filter((d) => !files[d.id] && !user?.documents?.[d.id]);

  const handleSave = async () => {
    if (missing.length) {
      showToast({
        message: 'Error',
        description: `Please upload: ${missing.map((d) => d.label).join(', ')}.`,
      });
      return;
    }
    // Everything is already uploaded and nothing new was picked.
    if (!Object.keys(files).length) {
      next();
      return;
    }
    if (!user?._id) {
      showToast({ message: 'Error', description: 'Your session has expired. Please log in again.' });
      return;
    }

    const result = await dispatch(uploadDocuments({ userId: user._id, files }));
    if (uploadDocuments.fulfilled.match(result)) {
      setFiles({});
      showToast({ message: 'Saved', description: 'Your documents have been uploaded.' });
      next();
    } else {
      showToast({ message: 'Error', description: String(result.payload ?? 'Upload failed.') });
    }
  };

  return (
    <section className="max-w-[600px] flex flex-col mt-8 gap-8">
      <header>
        <CustomHeading type="h1" value="Business Documents" className="text-center" />
        <CustomText
          type="sm"
          value="Upload the required documents for your business verification."
          className="text-center"
        />
      </header>

      <div className="flex flex-col gap-4">
        {DOCUMENTS.map((doc) => {
          const picked = files[doc.id];
          const uploaded = user?.documents?.[doc.id];
          const name = picked?.name ?? uploaded?.filename;
          const size = picked?.size ?? uploaded?.size;

          return (
            <div key={doc.id} className="border border-[#E1E4EA] rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-[#0E121B]">{doc.label}</p>
                  <p className="text-xs text-[#99A0AE]">{doc.description}</p>
                </div>
                {name && <CheckCircle2 className="w-5 h-5 text-[#036B26] shrink-0" />}
              </div>

              {name ? (
                <div className="mt-3 flex items-center justify-between bg-[#F7F9FC] rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileUp className="w-4 h-4 text-[#525866] shrink-0" />
                    <span className="text-sm text-[#0E121B] truncate">{name}</span>
                    {size !== undefined && (
                      <span className="text-xs text-[#99A0AE] shrink-0">
                        ({(size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                    {!picked && <span className="text-xs text-[#036B26] shrink-0">Uploaded</span>}
                  </div>
                  {!locked &&
                    (picked ? (
                      <button
                        type="button"
                        aria-label={`Remove ${doc.label}`}
                        onClick={() => handleFileChange(doc.id, null)}
                        className="p-1 rounded hover:bg-[#E1E4EA] shrink-0"
                      >
                        <X className="w-4 h-4 text-[#525866]" />
                      </button>
                    ) : (
                      <label className="text-xs font-medium text-[#0E121B] underline cursor-pointer shrink-0">
                        Replace
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                        />
                      </label>
                    ))}
                </div>
              ) : (
                <label className="mt-3 flex flex-col items-center justify-center border-2 border-dashed border-[#E1E4EA] rounded-lg p-6 cursor-pointer hover:border-[#020C14] transition-colors">
                  <FileUp className="w-8 h-8 text-[#E1E4EA] mb-2" />
                  <p className="text-sm text-[#525866]">Click to upload</p>
                  <p className="text-xs text-[#99A0AE] mt-1">PDF, JPG, PNG (max 5MB)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <CustomButton
        text={locked ? 'Submitted for review' : 'Save & Continue'}
        onClick={handleSave}
        isLoading={saving}
        disabled={saving || locked}
      />
    </section>
  );
};

export default BusinessDocuments;
