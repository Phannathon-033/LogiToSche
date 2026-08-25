import { Boxes, Sparkles } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  theme?: "dark" | "light";
  className?: string;
}

export function Logo({ size = "md", showText = true, theme = "dark", className = "" }: LogoProps) {
  const sizeMap = {
    sm: {
      box: "h-9 w-9 rounded-lg",
      icon: "h-5 w-5",
      title: "text-lg",
      subtitle: "text-[11px]",
      sparkle: "h-3 w-3 -top-1 -right-1",
    },
    md: {
      box: "h-11 w-11 rounded-xl",
      icon: "h-6 w-6",
      title: "text-xl",
      subtitle: "text-xs",
      sparkle: "h-3.5 w-3.5 -top-1 -right-1",
    },
    lg: {
      box: "h-14 w-14 rounded-2xl",
      icon: "h-8 w-8",
      title: "text-2xl sm:text-3xl",
      subtitle: "text-sm",
      sparkle: "h-4 w-4 -top-1.5 -right-1.5",
    },
  };

  const currentSize = sizeMap[size];

  const titleColor = theme === "dark" ? "text-navy" : "text-white";
  const subtitleColor = theme === "dark" ? "text-blue-700" : "text-sky-300";
  const boxBg =
    theme === "dark"
      ? "border-navy/20 bg-gradient-to-br from-navy to-slate-800 text-sky-400 shadow-md"
      : "border-white/40 bg-white/15 text-sky-300 backdrop-blur-md";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center border shrink-0 ${currentSize.box} ${boxBg}`}>
        <Boxes className={currentSize.icon} aria-hidden="true" />
        <Sparkles className={`absolute text-amber-300 ${currentSize.sparkle}`} aria-hidden="true" />
      </div>
      {showText && (
        <div className="leading-tight">
          <p className={`font-black tracking-tight ${currentSize.title} ${titleColor}`}>LogiAI</p>
          <p className={`font-extrabold uppercase tracking-wider ${currentSize.subtitle} ${subtitleColor}`}>Docs to JSON</p>
        </div>
      )}
    </div>
  );
}
