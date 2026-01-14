import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";

import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { faker } from "@faker-js/faker";

import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Button } from "~/components/ui/button";
import { DropIndicator } from "~/components/ui/drop-indicator";
import { cn } from "~/lib/utils";

const INITIAL_TASKS = Array.from({
  length: faker.number.int({ min: 24, max: 36 }),
})
  .fill(null)
  .map((_, i) => ({
    id: String(i),
    content: faker.word.words({ count: { min: 2, max: 8 } }),
  }));

const TASK_KEY = Symbol("task");

interface ITask {
  id: string;
  content: string;
}

interface ITaskData extends Record<string | symbol, unknown> {
  [TASK_KEY]: true;
  task: ITask;
}

type TTaskState =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement }
  | { type: "dragging" }
  | { type: "dragging-over"; closestEdge: Edge | null };

function getTaskData({ task }: { task: ITask }): ITaskData {
  return {
    [TASK_KEY]: true,
    task,
  };
}

function isTaskData(data: Record<string | symbol, unknown>): data is ITaskData {
  return data[TASK_KEY] === true;
}

function Task({ task }: { task: ITask }) {
  const [state, setState] = useState<TTaskState>({
    type: "idle",
  });

  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    const dragHandle = dragHandleRef.current;
    if (!element || !dragHandle) return;

    const data = getTaskData({ task });

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData() {
          return data;
        },
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "8px",
            }),
            render({ container }) {
              setState({ type: "preview", container });
              return () => setState({ type: "dragging" });
            },
          });
        },
        onDragStart() {
          setState({ type: "dragging" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if (source.element === element) {
            return false;
          }
          return isTaskData(source.data);
        },
        getData({ input }) {
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: "dragging-over", closestEdge });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState((current) => {
            if (
              current.type === "dragging-over" &&
              current.closestEdge === closestEdge
            ) {
              return current;
            }
            return { type: "dragging-over", closestEdge };
          });
        },
        onDragLeave() {
          setState({ type: "idle" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      }),
    );
  }, [task]);

  return (
    <>
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            "bg-card text-card-foreground flex items-center gap-2 rounded-md border p-2 shadow",
            state.type === "dragging" && "opacity-50",
          )}
        >
          <div className="inline-flex items-center gap-2">
            <Button
              ref={dragHandleRef}
              variant="outline"
              size="icon"
              className="cursor-grab"
              type="button"
            >
              <div>
                <GripVertical />
                <span className="sr-only">
                  Reorder:
                  {task.content}
                </span>
              </div>
            </Button>
            <p>{task.content}</p>
          </div>
        </div>
        {state.type === "dragging-over" && state.closestEdge !== null ? (
          <DropIndicator edge={state.closestEdge} gap={8} />
        ) : null}
      </div>
      {state.type === "preview"
        ? createPortal(
            <div className="bg-card text-card-foreground rounded-md border p-2 shadow">
              {task.content}
            </div>,
            state.container,
          )
        : null}
    </>
  );
}

export default function ListExample() {
  const [tasks, setTasks] = useState<ITask[]>(INITIAL_TASKS);
  const ref = useRef<HTMLDivElement>(null);

  const reorderTask = useCallback(
    ({
      startIndex,
      indexOfTarget,
      closestEdgeOfTarget,
    }: {
      startIndex: number;
      indexOfTarget: number;
      closestEdgeOfTarget: Edge | null;
    }) => {
      const finishIndex = getReorderDestinationIndex({
        startIndex,
        closestEdgeOfTarget,
        indexOfTarget,
        axis: "vertical",
      });

      if (finishIndex === startIndex) {
        return;
      }

      setTasks((prev) => {
        return reorder({
          list: prev,
          startIndex,
          finishIndex,
        });
      });
    },
    [],
  );

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isTaskData(source.data);
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!isTaskData(sourceData) || !isTaskData(targetData)) {
          return;
        }

        const indexOfSource = tasks.findIndex(
          (task) => task.id === sourceData.task.id,
        );
        const indexOfTarget = tasks.findIndex(
          (task) => task.id === targetData.task.id,
        );

        if (indexOfTarget < 0 || indexOfSource < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);

        reorderTask({
          startIndex: indexOfSource,
          indexOfTarget,
          closestEdgeOfTarget,
        });
      },
    });
  }, [reorderTask, tasks]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const cleanup = autoScrollForElements({
      element,
      getAllowedAxis: () => "vertical",
    });
    return () => {
      cleanup();
    };
  });

  return (
    <main className="flex h-full w-full flex-col items-center gap-8">
      <h1>List Example</h1>
      <div
        ref={ref}
        className="bg-accent flex max-w-md flex-1 flex-col gap-2 overflow-auto rounded-md border p-2 shadow"
      >
        {tasks.map((t) => (
          <Task key={t.id} task={t} />
        ))}
      </div>
    </main>
  );
}
