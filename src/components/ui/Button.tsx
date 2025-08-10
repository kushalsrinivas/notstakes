interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  children,
  className = "",
  isLoading = false,
  variant = "primary",
  ...props
}: ButtonProps) {
  const base =
    "w-full max-w-xs mx-auto block py-3 px-6 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<typeof variant, string> = {
    primary:
      "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground border-border hover:from-primary/95 hover:to-primary",
    secondary:
      "bg-secondary/70 text-secondary-foreground border-border backdrop-blur-sm hover:bg-secondary/80",
    ghost:
      "bg-transparent text-foreground border-transparent hover:bg-accent/30",
  } as const;
  return (
    <button
      className={[base, variants[variant], className].join(" ")}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary-foreground/70 border-t-transparent rounded-full" />
        </div>
      ) : (
        children
      )}
    </button>
  );
}
