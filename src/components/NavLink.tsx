import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { prefetchHandlers } from "@/lib/route-prefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const prefetch = useMemo(() => {
      const path = typeof to === "string" ? to : (to as { pathname?: string })?.pathname;
      return path ? prefetchHandlers(path) : {};
    }, [to]);
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...prefetch}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
