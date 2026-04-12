'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomButton from '@/lib/components/CustomButton';
import { FileUp, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

interface DocumentUpload {
  id: string;
  label: string;
  description: string;
  file: File | null;
}

const BusinessDocuments = () => {
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    {
      id: 'cac',
      label: 'CAC Certificate',
      description: 'Certificate of incorporation from CAC',
      file: null,
    },
    {
      id: 'memorandum',
      label: 'Memorandum of Association',
      description: 'Upload your memorandum and articles of association',
      file: null,
    },
    {
      id: 'utility',
      label: 'Utility Bill',
      description: 'Recent utility bill (not older than 3 months)',
      file: null,
    },
    {
      id: 'id',
      label: 'Valid ID',
      description: "Director's valid government-issued ID",
      file: null,
    },
  ]);

  const handleFileChange = (docId: string, file: File | null) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, file } : doc))
    );
  };

  const removeFile = (docId: string) => {
    handleFileChange(docId, null);
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
        {documents.map((doc) => (
          <div key={doc.id} className="border border-[#E1E4EA] rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-[#0E121B]">{doc.label}</p>
                <p className="text-xs text-[#99A0AE]">{doc.description}</p>
              </div>
              {doc.file && (
                <CheckCircle2 className="w-5 h-5 text-[#036B26] shrink-0" />
              )}
            </div>

            {doc.file ? (
              <div className="mt-3 flex items-center justify-between bg-[#F7F9FC] rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="w-4 h-4 text-[#525866] shrink-0" />
                  <span className="text-sm text-[#0E121B] truncate">{doc.file.name}</span>
                  <span className="text-xs text-[#99A0AE] shrink-0">
                    ({(doc.file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(doc.id)}
                  className="p-1 rounded hover:bg-[#E1E4EA] shrink-0"
                >
                  <X className="w-4 h-4 text-[#525866]" />
                </button>
              </div>
            ) : (
              <label className="mt-3 flex flex-col items-center justify-center border-2 border-dashed border-[#E1E4EA] rounded-lg p-6 cursor-pointer hover:border-[#020C14] transition-colors">
                <FileUp className="w-8 h-8 text-[#E1E4EA] mb-2" />
                <p className="text-sm text-[#525866]">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-[#99A0AE] mt-1">PDF, JPG, PNG (max 5MB)</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleFileChange(doc.id, file);
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <CustomButton text="Save & Continue" />
    </section>
  );
};

export default BusinessDocuments;
