import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface PhonaraLogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  withWorld?: boolean;
  className?: string;
}

export default function PhonaraLogo({
  to = "/",
  size = "md",
  withWordmark = true,
  withWorld = false,
  className = "",
}: PhonaraLogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <Link to={to} className={`flex items-center gap-1.5 group ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="relative flex items-center"
      >
        <span className="text-4xl font-black tracking-[-3px] bg-gradient-to-br from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_#22d3ee]">
          PH
        </span>
        {withWorld && (
          <span className="absolute -top-1 -right-2 text-[9px] font-mono text-emerald-400 tracking-widest">WORLD</span>
        )}
      </motion.div>

      {withWordmark && (
        <div className={`font-black tracking-[4px] ${sizeClasses[size]} bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent`}>
          PHONARA
        </div>
      )}
    </Link>
  );
}