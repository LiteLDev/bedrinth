import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

    let variantStyles = "";
    switch (variant) {
      case "destructive":
        variantStyles = "bg-red-500 text-white hover:bg-red-600 shadow-sm";
        break;
      case "outline":
        variantStyles =
          "border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50";
        break;
      case "secondary":
        variantStyles =
          "bg-gray-100 text-gray-900 hover:bg-gray-100/80 shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80";
        break;
      case "ghost":
        variantStyles =
          "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50";
        break;
      case "link":
        variantStyles =
          "text-gray-900 underline-offset-4 hover:underline dark:text-gray-50";
        break;
      default:
        variantStyles =
          "bg-gray-900 text-gray-50 hover:bg-gray-900/90 shadow dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90";
        break;
    }

    let sizeStyles = "h-9 px-4 py-2";
    if (size === "sm") sizeStyles = "h-8 rounded-md px-3 text-xs";
    else if (size === "lg") sizeStyles = "h-10 rounded-md px-8";
    else if (size === "icon") sizeStyles = "h-9 w-9";

    const classes = cn(baseStyles, variantStyles, sizeStyles, className);

    if (asChild) {
      const child = React.Children.only(
        props.children,
      ) as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
      const { children, ...restProps } = props;
      // eslint-disable-next-line react-hooks/refs
      return React.cloneElement(child, {
        ...restProps,
        className: cn(classes, child.props.className),
        ref,
      } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });
    }

    return <button className={classes} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button };
