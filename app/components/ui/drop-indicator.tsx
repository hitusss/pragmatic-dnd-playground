import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { cn } from "~/lib/utils";

type Orientation = "horizontal" | "vertical";

const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: "horizontal",
  bottom: "horizontal",
  left: "vertical",
  right: "vertical",
};

export function DropIndicator({
  edge,
  thickness = 2,
  gap = 8,
}: {
  edge: Edge;
  thickness?: number;
  gap?: number;
}) {
  return (
    <div
      style={
        {
          "--drop-indicator-line-thickness": `${thickness}px`,
          "--drop-indicator-line-offset": `calc(-0.5 * (${gap}px + ${thickness}px))`,
          "--drop-indicator-terminal-size": `${thickness * 3}px`,
          "--drop-indicator-terminal-radius": `calc(var(--drop-indicator-terminal-size) / 2)`,
          "--drop-indicator-offset-terminal": `calc((var(--drop-indicator-line-thickness) - var(--drop-indicator-terminal-size)) / 2)`,
        } as React.CSSProperties
      }
      className={cn(
        `bg-blue-700 before:bg-blue-700`,
        `pointer-events-none absolute z-10 rounded-xl`,
        `before:absolute before:size-(--drop-indicator-terminal-size) before:rounded-full before:content-['']`,
        {
          /* Orientation */
          "right-0 -left-(--drop-indicator-terminal-radius) h-(--drop-indicator-line-thickness) before:-left-(--drop-indicator-terminal-radius)":
            edgeToOrientationMap[edge] === "horizontal",
          "-top-(--drop-indicator-terminal-radius) bottom-0 w-(--drop-indicator-line-thickness) before:-top-(--drop-indicator-terminal-radius)":
            edgeToOrientationMap[edge] === "vertical",
          /* Edge */
          "top-(--drop-indicator-line-offset) before:top-(--drop-indicator-offset-terminal)":
            edge === "top",
          "right-(--drop-indicator-line-offset) before:right-(--drop-indicator-offset-terminal)":
            edge === "right",
          "bottom-(--drop-indicator-line-offset) before:bottom-(--drop-indicator-offset-terminal)":
            edge === "bottom",
          "left-(--drop-indicator-line-offset) before:left-(--drop-indicator-offset-terminal)":
            edge === "left",
        },
      )}
    />
  );
}
