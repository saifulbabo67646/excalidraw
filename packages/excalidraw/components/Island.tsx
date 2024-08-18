import "./Island.scss";

import React from "react";
import clsx from "clsx";

type IslandProps = {
  children: React.ReactNode;
  padding?: number;
  className?: string | boolean;
  style?: object;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
};

export const Island = React.forwardRef<HTMLDivElement, IslandProps>(
  ({ children, padding, className, style, onMouseOver, onMouseOut }, ref) => (
    <div
      className={clsx("Island", className)}
      style={{ "--padding": padding, ...style }}
      ref={ref}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {children}
    </div>
  ),
);
