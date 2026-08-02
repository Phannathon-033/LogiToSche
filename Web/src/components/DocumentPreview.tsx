import { Maximize, Search, ZoomIn, ZoomOut } from "lucide-react";

interface DocumentPreviewProps {
  previewUrl: string | null;
  previewName: string;
  progress?: number;
  onToast: (message: string) => void;
}

export function DocumentPreview({ previewUrl, previewName, progress, onToast }: DocumentPreviewProps) {
  const isScanning = progress !== undefined && progress > 0 && progress < 100;

  return (
    <div className="mt-2 flex flex-col flex-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-navy">ตัวอย่างเอกสาร (Document Preview)</h3>
        <div className="flex items-center gap-1.5 text-primary">
          <IconButton label="ขยาย" icon={<ZoomIn className="h-4 w-4" />} onClick={() => onToast("ขยายตัวอย่างเอกสาร")} />
          <IconButton label="ย่อ" icon={<ZoomOut className="h-4 w-4" />} onClick={() => onToast("ย่อตัวอย่างเอกสาร")} />
          <IconButton label="เต็มจอ" icon={<Maximize className="h-4 w-4" />} onClick={() => onToast("เปิดโหมดเต็มจอ")} />
        </div>
      </div>
      <div className="min-h-[460px] flex-1 overflow-auto rounded-xl border border-line bg-slate-50/70 p-4 shadow-inner relative">
        <div className="relative mx-auto w-fit max-h-[520px]">
          {previewUrl ? (
            <img src={previewUrl} alt={`ตัวอย่างเอกสาร ${previewName}`} className="max-h-[520px] w-full rounded-lg object-contain shadow-xs" />
          ) : (
            <InvoiceMockup />
          )}

          {/* Scanning Animation Overlay */}
          {isScanning && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded-lg bg-blue-900/10 backdrop-blur-[1px]">
              {/* Scanning Line */}
              <div className="animate-scan-line absolute left-0 right-0 h-1 bg-primary shadow-[0_0_12px_2px_rgba(37,99,235,0.7)]" />
              {/* Magnifying Glass Indicator */}
              <div className="absolute inset-0 grid place-items-center opacity-90">
                <div className="flex animate-pulse-slow flex-col items-center gap-2 rounded-2xl bg-white/95 px-6 py-5 shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary">
                    <Search className="h-7 w-7 animate-bounce-slight" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-navy">กำลังสแกนและวิเคราะห์...</p>
                    <p className="text-xs font-bold text-primary">{progress}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded p-1.5 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={label}>
      {icon}
    </button>
  );
}

function InvoiceMockup() {
  return (
    <article className="rounded-sm bg-white p-3 text-[9px] leading-tight text-black ring-1 ring-slate-300">
      <div className="flex justify-between gap-4">
        <div>
          <h3 className="mb-3 text-2xl font-black tracking-normal">INVOICE</h3>
          <p className="font-bold">ABC Logistics Co., Ltd.</p>
          <p>88/9 Moo 4, Bangna-Trad Rd.</p>
          <p>Bang Phli, Samut Prakan 10540</p>
          <p>Thailand</p>
          <p>Tel: +66 2 123 4567</p>
        </div>
        <table className="h-fit w-[160px] border-collapse text-[9px]">
          <tbody>
            <InvoiceInfo label="Invoice No." value="INV-2024-001" />
            <InvoiceInfo label="Invoice Date" value="15/05/2024" />
            <InvoiceInfo label="Due Date" value="30/05/2024" />
          </tbody>
        </table>
      </div>
      <div className="my-3 border-t border-black" />
      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="font-bold">Bill To:</p>
          <p>XYZ Importer Co., Ltd.</p>
          <p>99/1 Sukhumvit Rd.</p>
          <p>Klongtoey, Bangkok 10110</p>
          <p>Thailand</p>
        </div>
        <div>
          <p className="font-bold">Ship To:</p>
          <p>XYZ Warehouse</p>
          <p>700/2 Amata City Chonburi</p>
          <p>Mueang Chonburi, Chonburi 20000</p>
          <p>Thailand</p>
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-[8px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black p-1 text-left">Description</th>
            <th className="border border-black p-1">Quantity</th>
            <th className="border border-black p-1">Unit Price</th>
            <th className="border border-black p-1 text-right">Amount (THB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1">Logistics Service</td>
            <td className="border border-black p-1 text-center">120</td>
            <td className="border border-black p-1 text-right">406.25</td>
            <td className="border border-black p-1 text-right">48,750.00</td>
          </tr>
        </tbody>
      </table>
      <div className="ml-auto mt-2 w-44 space-y-1 text-right text-[9px]">
        <p><b>Subtotal</b> 48,750.00</p>
        <p><b>VAT 7%</b> 3,412.50</p>
        <p><b>Total Amount</b> 52,162.50</p>
      </div>
    </article>
  );
}

function InvoiceInfo({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="border border-black p-1 text-left">{label}</th>
      <td className="border border-black p-1 text-right">{value}</td>
    </tr>
  );
}
