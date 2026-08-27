import logoImg from "../assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  theme?: "dark" | "light";
  className?: string;
}

export function Logo({ size = "md", showText = true, theme = "dark", className = "" }: LogoProps) {
  const sizeMap = {
    sm: {
      img: "h-9 w-9",
      title: "text-lg",
      subtitle: "text-[10px]",
    },
    md: {
      img: "h-11 w-11",
      title: "text-xl",
      subtitle: "text-xs",
    },
    lg: {
      img: "h-14 w-14",
      title: "text-2xl sm:text-3xl",
      subtitle: "text-sm",
    },
    xl: {
      img: "h-20 w-20",
      title: "text-3xl sm:text-4xl",
      subtitle: "text-base",
    },
  };

  const currentSize = sizeMap[size];

  const titleColor = theme === "dark" ? "text-slate-900" : "text-white";
  const subtitleColor = theme === "dark" ? "text-blue-600" : "text-sky-300";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoImg}
        alt="LogiAI Official Logo"
        className={`object-contain shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105 ${currentSize.img}`}
      />
      {showText && (
        <div className="leading-tight">
          <p className={`font-black tracking-tight ${currentSize.title} ${titleColor}`}>
            LOGIAI
          </p>
          <p className={`font-extrabold uppercase tracking-wider ${currentSize.subtitle} ${subtitleColor}`}>
            Docs to JSON
          </p>
        </div>
      )}
    </div>
  );
}
