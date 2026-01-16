import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/list-item";
import { cn } from "~/lib/utils";

function getEdgeFromInstruction(
  instruction: Instruction,
): "top" | "right" | "bottom" | "left" {
  switch (instruction.axis) {
    case "horizontal": {
      switch (instruction.operation) {
        case "reorder-before": {
          return "left";
        }
        case "reorder-after": {
          return "right";
        }
        default: {
          throw new Error(
            `Unknown operation for ${instruction.axis} axis: ${instruction.operation}`,
          );
        }
      }
    }

    case "vertical": {
      switch (instruction.operation) {
        case "reorder-before": {
          return "top";
        }
        case "reorder-after": {
          return "bottom";
        }
        default: {
          throw new Error(
            `Unknown operation for ${instruction.axis} axis: ${instruction.operation}`,
          );
        }
      }
    }

    default:
      throw new Error(`Unknown axis: ${instruction.axis}`);
  }
}

export function DropIndicator({
  instruction,
  thickness = 2,
  gap = 8,
}: {
  instruction: Instruction;
  thickness?: number;
  gap?: number;
}) {
  const style = {
    "--drop-indicator-line-thickness": `${thickness}px`,
    "--drop-indicator-line-offset": `calc(-0.5 * (${gap}px + ${thickness}px))`,
    "--drop-indicator-terminal-size": `${thickness * 3}px`,
    "--drop-indicator-terminal-radius": `calc(var(--drop-indicator-terminal-size) / 2)`,
    "--drop-indicator-offset-terminal": `calc((var(--drop-indicator-line-thickness) - var(--drop-indicator-terminal-size)) / 2)`,
  } as React.CSSProperties;

  if (instruction.operation === "combine") {
    return (
      <div
        style={style}
        className="border-primary pointer-events-none absolute inset-(--drop-indicator-line-offset) z-10 rounded-xl border-(length:--drop-indicator-line-thickness)"
      />
    );
  }

  return (
    <div
      style={style}
      className={cn(
        `bg-primary before:bg-primary`,
        `pointer-events-none absolute z-10 rounded-xl`,
        `before:absolute before:size-(--drop-indicator-terminal-size) before:rounded-full before:content-['']`,
        {
          /* Orientation */
          "right-0 -left-(--drop-indicator-terminal-radius) h-(--drop-indicator-line-thickness) before:-left-(--drop-indicator-terminal-radius)":
            instruction.axis === "vertical",
          "-top-(--drop-indicator-terminal-radius) bottom-0 w-(--drop-indicator-line-thickness) before:-top-(--drop-indicator-terminal-radius)":
            instruction.axis === "horizontal",
          /* Edge */
          "top-(--drop-indicator-line-offset) before:top-(--drop-indicator-offset-terminal)":
            getEdgeFromInstruction(instruction) === "top",
          "right-(--drop-indicator-line-offset) before:right-(--drop-indicator-offset-terminal)":
            getEdgeFromInstruction(instruction) === "right",
          "bottom-(--drop-indicator-line-offset) before:bottom-(--drop-indicator-offset-terminal)":
            getEdgeFromInstruction(instruction) === "bottom",
          "left-(--drop-indicator-line-offset) before:left-(--drop-indicator-offset-terminal)":
            getEdgeFromInstruction(instruction) === "left",
        },
      )}
    />
  );
}

export function GroupDropIndicator({
  ref,
  children,
  className,
  isActive,
  thickness = 2,
  gap = 2,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode[];
  className?: string;
  isActive: boolean;
  thickness?: number;
  gap?: number;
}) {
  return (
    <div
      ref={ref}
      style={
        {
          "--drop-indicator-line-thickness": `${thickness}px`,
          "--drop-indicator-line-offset": `calc(-0.5 * (${gap}px + ${thickness}px))`,
        } as React.CSSProperties
      }
      className={cn(className, {
        [`outline-primary rounded-xl outline-(length:--drop-indicator-line-thickness) outline-offset-(--drop-indicator-line-offset)`]:
          isActive,
      })}
    >
      {children}
    </div>
  );
}
