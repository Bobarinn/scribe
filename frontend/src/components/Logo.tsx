import React from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { VisuallyHidden } from "./ui/visually-hidden";
import { About } from "./About";

interface LogoProps {
  isCollapsed: boolean;
}

const Logo = React.forwardRef<HTMLButtonElement, LogoProps>(
  ({ isCollapsed }, ref) => {
    return (
      <Dialog aria-describedby={undefined}>
        {isCollapsed ? (
          <DialogTrigger asChild>
            <button
              ref={ref}
              type="button"
              className="flex items-center justify-center mb-2 cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
              aria-label="About Scribe"
            >
              <Image
                src="/logo-collapsed.png"
                alt="Scribe"
                width={40}
                height={40}
                className="object-contain rounded-[10px]"
                priority
              />
            </button>
          </DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <button
              ref={ref}
              type="button"
              className="w-full flex items-center justify-center gap-2 mb-2 cursor-pointer bg-transparent border-none p-2 rounded-xl hover:bg-brand-eraser/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="About Scribe"
            >
              {/* Coral pencil mark reads clearly on the white sidebar; the
                  wordmark uses the brand display font. */}
              <Image
                src="/logo-collapsed.png"
                alt=""
                width={32}
                height={32}
                className="object-contain rounded-[8px]"
                priority
              />
              <span className="font-display text-2xl font-bold text-foreground tracking-tight leading-none">
                Scribe
              </span>
            </button>
          </DialogTrigger>
        )}
        <DialogContent>
          <VisuallyHidden>
            <DialogTitle>About Scribe</DialogTitle>
          </VisuallyHidden>
          <About />
        </DialogContent>
      </Dialog>
    );
  },
);

Logo.displayName = "Logo";

export default Logo;
