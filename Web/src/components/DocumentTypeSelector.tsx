import { documentTypes } from "../data/mockData";
import type { DocumentType } from "../types";

interface DocumentTypeSelectorProps {
  selected: DocumentType;
  onChange: (type: DocumentType) => void;
}

export function DocumentTypeSelector({ selected, onChange }: DocumentTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="ประเภทเอกสาร">
      {documentTypes.map((type) => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={selected === type}
          onClick={() => onChange(type)}
          className={`min-w-28 rounded px-4 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            selected === type ? "bg-primary text-white" : "bg-blue-50 text-navy hover:bg-blue-100"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
