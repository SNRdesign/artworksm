import React from "react";

interface SansicoLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const SansicoLogoIcon: React.FC<{ className?: string; iconSize?: string }> = ({
  className = "",
  iconSize = "w-6 h-6",
}) => {
  return (
    <div
      className={`bg-[#E30613] text-white p-2.5 rounded-[14px] shadow-sm flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${className}`}
    >
      <svg
        className={`${iconSize} text-white`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top layer diamond */}
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(255,255,255,0.15)" />
        {/* Middle layer */}
        <path d="M2 12l10 5 10-5" />
        {/* Bottom layer */}
        <path d="M2 17l10 5 10-5" />
      </svg>
    </div>
  );
};

export const SansicoLogo: React.FC<SansicoLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  const containerPadding = {
    sm: "p-1.5 rounded-lg",
    md: "p-2 rounded-xl",
    lg: "p-3 rounded-2xl",
  };

  const titleSizes = {
    sm: "text-xs font-bold",
    md: "text-base font-extrabold",
    lg: "text-xl font-black",
  };

  const subSizes = {
    sm: "text-[8px]",
    md: "text-[9px]",
    lg: "text-[11px]",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Red Squircle Logo Icon */}
      <div className={`bg-[#E30613] text-white ${containerPadding[size]} shadow-sm shrink-0 flex items-center justify-center`}>
        <svg
          className={`${iconSizes[size]} text-white`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top layer diamond with subtle white translucent fill */}
          <path d="M12 2.5L2.5 7.25L12 12L21.5 7.25L12 2.5Z" fill="rgba(255,255,255,0.2)" />
          {/* Middle layer */}
          <path d="M2.5 12L12 16.75L21.5 12" />
          {/* Bottom layer */}
          <path d="M2.5 16.75L12 21.5L21.5 16.75" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-display tracking-tight text-slate-900 leading-tight ${titleSizes[size]}`}>
            Artwork Approval System
          </h1>
          <p className={`text-slate-500 font-mono tracking-wider uppercase font-bold mt-0.5 ${subSizes[size]}`}>
            SANSICO MEDICA CO. • QUALITY ASSURANCE DIVISION
          </p>
        </div>
      )}
    </div>
  );
};

export default SansicoLogo;
