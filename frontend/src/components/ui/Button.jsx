import { motion } from "framer-motion";
import { clsx } from "clsx";

const variants = {
  primary: "bg-brand hover:bg-brand-dark text-white shadow-glow hover:shadow-none",
  secondary: "bg-surface-2 hover:bg-surface-3 text-white border border-white/10",
  danger: "bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20",
  ghost: "hover:bg-surface-2 text-muted hover:text-white",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

export function Button({ children, variant = "primary", size = "md", loading = false, disabled = false, className, onClick, type = "button" }) {
  return (
    <motion.button
      type={type} whileTap={{ scale: 0.97 }} onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg font-medium",
        "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant], sizes[size], className,
      )}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}