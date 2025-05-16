import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { de, faker } from "@faker-js/faker";
import { GripVertical } from "lucide-react";

import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import {
  monitorForElements,
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";

import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { DropIndicator } from "~/components/ui/drop-indicator";

const INITIAL_COLUMS: IBoard["columns"] = Array.from(
  { length: faker.number.int({ min: 4, max: 12 }) },
  (_, index) => {
    const id = faker.string.uuid();
    return {
      id,
      title: `Column ${index + 1}`,
      itemIds: Array.from(
        { length: faker.number.int({ min: 6, max: 24 }) },
        () => faker.string.uuid(),
      ),
    };
  },
).reduce<IBoard["columns"]>((acc, column) => {
  acc[column.id] = column;
  return acc;
}, {});
const INITIAL_TASKS: IBoard["tasks"] = Object.values(INITIAL_COLUMS).reduce<
  IBoard["tasks"]
>((acc, column) => {
  column.itemIds.forEach((taskId) => {
    acc[taskId] = {
      id: taskId,
      content: faker.word.words({ count: { min: 2, max: 6 } }),
      columnId: column.id,
    };
  });
  return acc;
}, {});
const INITIAL_BORAD: IBoard = {
  columns: INITIAL_COLUMS,
  tasks: INITIAL_TASKS,
  columnOrder: Object.keys(INITIAL_COLUMS),
};

const COLUMN_KEY = Symbol("column");
const TASK_KEY = Symbol("task");

interface ITask {
  id: string;
  content: string;
  columnId: IColumn["id"];
}

interface IColumn {
  id: string;
  title: string;
  itemIds: ITask["id"][];
}

interface IBoard {
  columns: Record<IColumn["id"], IColumn>;
  tasks: Record<ITask["id"], ITask>;
  columnOrder: IColumn["id"][];
}

interface ITaskData extends Record<string | symbol, unknown> {
  [TASK_KEY]: true;
  task: ITask;
}

interface IColumnData extends Record<string | symbol, unknown> {
  [COLUMN_KEY]: true;
  column: IColumn;
}

type TTaskState =
  | { type: "idle" }
  | { type: "dragging" }
  | { type: "dragging-over"; closestEdge: Edge | null };

type TColumnState =
  | { type: "idle" }
  | { type: "dragging" }
  | { type: "dragging-over"; closestEdge: Edge | null }
  | { type: "dragging-task-over" };

function getTaskData({ task }: { task: ITask }): ITaskData {
  return {
    [TASK_KEY]: true,
    task,
  };
}

function isTaskData(data: Record<string | symbol, unknown>): data is ITaskData {
  return data[TASK_KEY] === true;
}

function getColumnData({ column }: { column: IColumn }): IColumnData {
  return {
    [COLUMN_KEY]: true,
    column,
  };
}

function isColumnData(
  data: Record<string | symbol, unknown>,
): data is IColumnData {
  return data[COLUMN_KEY] === true;
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
              <span className="sr-only">Reorder: {task.content}</span>
            </div>
          </Button>
          <p>{task.content}</p>
        </div>
      </div>
      {state.type === "dragging-over" && state.closestEdge !== null ? (
        <DropIndicator edge={state.closestEdge} gap={8} />
      ) : null}
    </div>
  );
}

function Column({
  column,
  children,
}: {
  column: IColumn;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<TColumnState>({
    type: "idle",
  });
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const innerElement = innerRef.current;
    const dragHandle = dragHandleRef.current;
    const scrollable = scrollableRef.current;
    if (!element || !innerElement || !dragHandle || !scrollable) return;

    const data = getColumnData({ column });

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData() {
          return data;
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
          return isColumnData(source.data);
        },
        getData({ input }) {
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ["left", "right"],
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
      dropTargetForElements({
        element: innerElement,
        canDrop({ source }) {
          return isTaskData(source.data);
        },
        getData() {
          return data;
        },
        getIsSticky() {
          return true;
        },
        onDragEnter() {
          setState({ type: "dragging-task-over" });
        },
        onDragLeave() {
          setState({ type: "idle" });
        },
        onDragStart() {
          setState({ type: "dragging-task-over" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      }),
      autoScrollForElements({
        element: scrollable,
        getAllowedAxis: () => "vertical",
        canScroll: ({ source }) => isTaskData(source.data),
      }),
    );
  }, []);

  return (
    <div ref={ref} className="relative flex">
      <div
        ref={innerRef}
        className={cn(
          "bg-accent flex max-w-md min-w-sm flex-1 flex-col gap-2 rounded-md border p-2 shadow",
          state.type === "dragging" && "opacity-50",
          state.type === "dragging-task-over" && "bg-input",
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
              <span className="sr-only">Reorder: {column.title}</span>
            </div>
          </Button>
          <p>{column.title}</p>
        </div>
        <div
          ref={scrollableRef}
          className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
        >
          {children}
        </div>
      </div>
      {state.type === "dragging-over" && state.closestEdge !== null ? (
        <DropIndicator edge={state.closestEdge} gap={8} />
      ) : null}
    </div>
  );
}

export default function BoeadExample() {
  const [data, setData] = useState<IBoard>();
  const ref = useRef<HTMLDivElement>(null);

  const reorderColumn = useCallback(
    ({
      startIndex,
      finishIndex,
    }: {
      startIndex: number;
      finishIndex: number;
    }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columnOrder: reorder({
            list: prev.columnOrder,
            startIndex,
            finishIndex,
          }),
        };
      });
    },
    [],
  );

  const reorderTask = useCallback(
    ({
      columnId,
      startIndex,
      finishIndex,
    }: {
      columnId: string;
      startIndex: number;
      finishIndex: number;
    }) => {
      setData((prev) => {
        if (!prev) return prev;
        const sourceColumn = { ...prev.columns[columnId] };
        const updatedItems = reorder({
          list: sourceColumn.itemIds,
          startIndex,
          finishIndex,
        });

        return {
          ...prev,
          columns: {
            ...prev.columns,
            [columnId]: {
              ...sourceColumn,
              itemIds: updatedItems,
            },
          },
        };
      });
    },
    [],
  );

  const moveTask = useCallback(
    ({
      startColumnId,
      finishColumnId,
      itemIndexInStartColumn,
      itemIndexInFinishColumn,
    }: {
      startColumnId: string;
      finishColumnId: string;
      itemIndexInStartColumn: number;
      itemIndexInFinishColumn: number;
    }) => {
      if (startColumnId === finishColumnId) {
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        const sourceColumn = { ...prev.columns[startColumnId] };
        const destinationColumn = { ...prev.columns[finishColumnId] };

        const item = sourceColumn.itemIds[itemIndexInStartColumn];
        const updatedSourceItems = sourceColumn.itemIds.filter(
          (_, index) => index !== itemIndexInStartColumn,
        );
        const updatedDestinationItems = [
          ...destinationColumn.itemIds.slice(0, itemIndexInFinishColumn),
          item,
          ...destinationColumn.itemIds.slice(itemIndexInFinishColumn),
        ];

        return {
          ...prev,
          columns: {
            ...prev.columns,
            [startColumnId]: {
              ...sourceColumn,
              itemIds: updatedSourceItems,
            },
            [finishColumnId]: {
              ...destinationColumn,
              itemIds: updatedDestinationItems,
            },
          },
          tasks: {
            ...prev.tasks,
            [item]: {
              ...prev.tasks[item],
              columnId: finishColumnId,
            },
          },
        };
      });
    },
    [],
  );

  useEffect(() => {
    setData(INITIAL_BORAD);
  }, []);

  useEffect(() => {
    if (!data) return;

    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return isColumnData(source.data) || isTaskData(source.data);
        },
        onDrop({ location, source }) {
          if (location.current.dropTargets.length <= 0) {
            return;
          }

          // Column
          if (isColumnData(source.data)) {
            const target = location.current.dropTargets[0];
            if (!isColumnData(target.data)) {
              return;
            }

            const startIndex = data?.columnOrder.indexOf(source.data.column.id);
            const indexOfTarget = data?.columnOrder.indexOf(
              target.data.column.id,
            );
            if (!startIndex || !indexOfTarget) {
              return;
            }

            const closestEdgeOfTarget: Edge | null = extractClosestEdge(
              target.data,
            );
            const finishIndex = getReorderDestinationIndex({
              startIndex,
              indexOfTarget,
              closestEdgeOfTarget,
              axis: "horizontal",
            });

            reorderColumn({
              startIndex,
              finishIndex,
            });
          }

          // Task
          if (isTaskData(source.data)) {
            const sourceColumn = data.columns[source.data.task.columnId];
            const itemIndex = sourceColumn.itemIds.lastIndexOf(
              source.data.task.id,
            );
            // Dropping on Column
            if (location.current.dropTargets.length === 1) {
              const [targetColumn] = location.current.dropTargets;
              if (!isColumnData(targetColumn.data)) return;
              const targetColumnId = targetColumn.data.column.id;
              const destinationColumn = data.columns[targetColumnId];

              if (sourceColumn.id === destinationColumn.id) {
                reorderTask({
                  columnId: sourceColumn.id,
                  startIndex: itemIndex,
                  finishIndex: sourceColumn.itemIds.length,
                });
                return;
              }

              moveTask({
                itemIndexInStartColumn: itemIndex,
                itemIndexInFinishColumn: destinationColumn.itemIds.length,
                startColumnId: sourceColumn.id,
                finishColumnId: destinationColumn.id,
              });
              return;
            }

            // Dropping on Task
            if (location.current.dropTargets.length === 2) {
              const [targetTask, targetColumn] = location.current.dropTargets;
              if (
                !isTaskData(targetTask.data) ||
                !isColumnData(targetColumn.data)
              ) {
                return;
              }
              const targetColumnId = targetColumn.data.column.id;
              const destinationColumn = data.columns[targetColumnId];

              const indexOfTarget = destinationColumn.itemIds.lastIndexOf(
                targetTask.data.task.id,
              );
              const closestEdgeOfTarget = extractClosestEdge(targetTask.data);

              if (sourceColumn === destinationColumn) {
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget,
                  closestEdgeOfTarget,
                  axis: "vertical",
                });
                reorderTask({
                  columnId: sourceColumn.id,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                });
                return;
              }

              const destinationIndex =
                closestEdgeOfTarget === "bottom"
                  ? indexOfTarget + 1
                  : indexOfTarget;
              moveTask({
                itemIndexInStartColumn: itemIndex,
                startColumnId: sourceColumn.id,
                finishColumnId: destinationColumn.id,
                itemIndexInFinishColumn: destinationIndex,
              });
              return;
            }
          }
        },
      }),
    );
  }, [data]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return combine(
      autoScrollForElements({
        element,
        getAllowedAxis: () => "horizontal",
        canScroll: ({ source }) =>
          isColumnData(source.data) || isTaskData(source.data),
      }),
    );
  }, []);

  return (
    <main className="flex h-full w-full flex-col items-center gap-8">
      <h1>Board Example</h1>
      <div
        ref={ref}
        className="flex max-w-full flex-1 gap-2 overflow-x-auto p-2"
      >
        {data?.columnOrder.map((columnId) => {
          const column = data.columns[columnId];
          const tasks = column.itemIds.map((taskId) => data.tasks[taskId]);
          return (
            <Column key={column.id} column={column}>
              {tasks.map((task) => (
                <Task key={task.id} task={task} />
              ))}
            </Column>
          );
        })}
      </div>
    </main>
  );
}
