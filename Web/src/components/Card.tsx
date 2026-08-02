import type { ReactNode } from "react";

interface CardProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function Card({ title, icon, actions, children, className = "", titleClassName = "" }: CardProps) {
  return (
    <section className={`min-w-0 rounded-lg bg-white p-4 shadow-panel ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`flex min-w-0 items-center gap-2 text-base font-extrabold text-navy ${titleClassName}`}>
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
