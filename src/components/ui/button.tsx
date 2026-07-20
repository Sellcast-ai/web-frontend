import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 disabled:shadow-none active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border border-brand-800/40 bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-button hover:from-brand-500 hover:to-brand-600 hover:-translate-y-0.5",
        solid:
          "bg-ink text-background hover:bg-ink-soft hover:-translate-y-0.5 shadow-soft",
        outline:
          "border border-border-strong bg-card text-ink hover:border-brand-400 hover:text-brand-700 shadow-soft",
        ghost: "text-ink hover:bg-muted",
        soft: "bg-accent text-accent-foreground hover:brightness-95",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.ComponentProps<typeof Link>, keyof ButtonBaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if ("href" in props && props.href !== undefined) {
    return <Link className={classes} {...props} />;
  }

  return <button className={classes} {...(props as ButtonAsButton)} />;
}

export { buttonVariants };
