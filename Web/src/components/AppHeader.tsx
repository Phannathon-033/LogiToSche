import { Bell, Box, ChevronDown, CircleHelp, Search } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 h-[72px] bg-navy text-white shadow-sm">
      <div className="flex h-full items-center gap-4 px-4 lg:px-6">
        <div className="flex min-w-[178px] items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/55 bg-white/10">
            <Box className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-2xl font-extrabold tracking-normal">LogiAI</p>
            <p className="text-sm font-semibold text-white/85">Docs to JSON</p>
          </div>
        </div>

        <div className="hidden h-11 w-px bg-white/30 lg:block" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold leading-6 sm:text-2xl">ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema</h1>
          <p className="hidden truncate text-sm font-medium text-white/85 sm:block">OCR + SLM เพื่ออ่าน เข้าใจ และแปลงเอกสารเป็น JSON Schema</p>
        </div>

        <label className="hidden h-11 w-[360px] max-w-[28vw] items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 xl:flex">
          <Search className="h-5 w-5 text-white/90" aria-hidden="true" />
          <span className="sr-only">ค้นหาเอกสาร งาน หรือฟิลด์</span>
          <input className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/75 focus:outline-none" placeholder="ค้นหาเอกสาร, งาน, หรือฟิลด์..." />
          <kbd className="rounded border border-white/25 bg-white/10 px-2 py-1 text-xs text-white/85">Ctrl + K</kbd>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="relative rounded-full p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="การแจ้งเตือน">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-error text-xs font-bold">5</span>
          </button>
          <button type="button" className="rounded-full p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="ช่วยเหลือ">
            <CircleHelp className="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" className="hidden items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:flex" aria-label="เมนูผู้ใช้">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-navy">
              <span className="text-sm font-bold">ส</span>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-navy bg-success" />
            </span>
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-sm font-bold">สมชาย วงศ์สวัสดิ์</span>
              <span className="block text-xs text-white/80">ผู้ดูแลระบบ</span>
            </span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
