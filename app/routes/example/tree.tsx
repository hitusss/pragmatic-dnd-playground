import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachInstruction,
  extractInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";

import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

import { faker } from "@faker-js/faker";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "~/components/ui/button";
import {
  DropIndicator,
  GroupDropIndicator,
} from "~/components/ui/drop-indicator-tree";
import { cn } from "~/lib/utils";

function generateTree(maxDepth: number = 3): ITree {
  const nodes: Record<string, ITreeNode> = {};
  const rootIds: string[] = [];

  function generateNode(depth: number, path: number[]): ITreeNode {
    const id = faker.string.uuid();
    const content = `Node ${path.join(".")}`;
    const children: string[] = [];

    if (depth < maxDepth) {
      const numChildren = faker.number.int({ min: 0, max: 8 });
      for (let i = 0; i < numChildren; i++) {
        const childPath = [...path, i + 1];
        const child = generateNode(depth + 1, childPath);
        nodes[child.id] = child;
        nodes[child.id].parentId = id;
        children.push(child.id);
      }
    }

    return {
      id,
      content,
      children,
      isOpen: faker.datatype.boolean(),
      parentId: null,
    };
  }

  for (let i = 0; i < faker.number.int({ min: 4, max: 12 }); i++) {
    const root = generateNode(0, [i + 1]);
    nodes[root.id] = root;
    rootIds.push(root.id);
  }

  return { nodes, rootIds };
}

const INITIAL_TREE: ITree = generateTree();

const TREE_NODE_KEY = Symbol("treeNode");

interface ITreeNode {
  id: string;
  content: string;
  children: ITreeNode["id"][];
  isOpen: boolean;
  parentId: string | null;
}

interface ITree {
  nodes: Record<ITreeNode["id"], ITreeNode>;
  rootIds: ITreeNode["id"][];
}

interface ITreeNodeData extends Record<string | symbol, unknown> {
  [TREE_NODE_KEY]: true;
  node: ITreeNode;
}

type TTreeNodeState =
  | { type: "idle" }
  | { type: "dragging" }
  | { type: "dragging-over"; instruction: Instruction | null };

type TTreeNodeGroupState = { type: "idle" } | { type: "dragging-over" };

function getTreeNodeData({ node }: { node: ITreeNode }): ITreeNodeData {
  return {
    [TREE_NODE_KEY]: true,
    node,
  };
}

function isTreeNodeData(
  data: Record<string | symbol, unknown>,
): data is ITreeNodeData {
  return data[TREE_NODE_KEY] === true;
}

function delay({
  waitMs: timeMs,
  fn,
}: {
  waitMs: number;
  fn: () => void;
}): () => void {
  let timeoutId: number | null = window.setTimeout(() => {
    timeoutId = null;
    fn();
  }, timeMs);
  return function cancel() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}

const TreeContext = createContext<
  | {
      data: ITree;
      setData: React.Dispatch<React.SetStateAction<ITree>>;
    }
  | undefined
>(undefined);

function useTreeContext() {
  const context = use(TreeContext);
  if (!context)
    throw new Error("useTreeContext must be used within a TreeProvider");
  return context;
}

function TreeNode({ node }: { node: ITreeNode }) {
  const { data, setData } = useTreeContext();
  const [state, setState] = useState<TTreeNodeState>({
    type: "idle",
  });
  const [groupState, setGroupState] = useState<TTreeNodeGroupState>({
    type: "idle",
  });

  const ref = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const cancelExpandRef = useRef<(() => void) | null>(null);

  const toggleOpen = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [node.id]: {
            ...prev.nodes[node.id],
            isOpen: !prev.nodes[node.id].isOpen,
          },
        },
      };
    });
  }, [node.id, setData]);

  const cancelExpand = useCallback(() => {
    cancelExpandRef.current?.();
    cancelExpandRef.current = null;
  }, []);

  useEffect(() => {
    const element = ref.current;
    const dragHandle = dragHandleRef.current;
    if (!element || !dragHandle) return;

    const data = getTreeNodeData({ node });

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
          return isTreeNodeData(source.data);
        },
        getData({ input }) {
          return attachInstruction(data, {
            element,
            input,
            operations: {
              combine: "available",
              "reorder-before": "available",
              "reorder-after":
                node.isOpen && node.children.length
                  ? "not-available"
                  : "available",
            },
            axis: "vertical",
          });
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const instruction = extractInstruction(self.data);
          if (
            instruction?.operation === "combine" &&
            node.children.length &&
            !node.isOpen &&
            !cancelExpandRef.current
          ) {
            cancelExpandRef.current = delay({
              waitMs: 500,
              fn: () => toggleOpen(),
            });
          }
          if (instruction?.operation !== "combine" && cancelExpandRef.current) {
            cancelExpand();
          }
          setState({ type: "dragging-over", instruction });
        },
        onDrag({ self }) {
          const instruction = extractInstruction(self.data);
          if (
            instruction?.operation === "combine" &&
            node.children.length &&
            !node.isOpen &&
            !cancelExpandRef.current
          ) {
            cancelExpandRef.current = delay({
              waitMs: 500,
              fn: () => toggleOpen(),
            });
          }
          if (instruction?.operation !== "combine" && cancelExpandRef.current) {
            cancelExpand();
          }
          setState({ type: "dragging-over", instruction });
        },
        onDragLeave() {
          setState({ type: "dragging" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      }),
    );
  }, [cancelExpand, node, toggleOpen]);

  useEffect(() => {
    const element = groupRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      canDrop({ source }) {
        return isTreeNodeData(source.data) && source.data.id !== node.id;
      },
      getData() {
        return { type: "group" };
      },
      getIsSticky() {
        return false;
      },

      onDragEnter({ location, self }) {
        const [innerMost] = location.current.dropTargets.filter(
          (dropTarget) => dropTarget.data.type === "group",
        );

        setGroupState({
          type: innerMost?.element === self.element ? "dragging-over" : "idle",
        });
      },
      onDrag({ location, self }) {
        const [innerMost] = location.current.dropTargets.filter(
          (dropTarget) => dropTarget.data.type === "group",
        );

        setGroupState({
          type: innerMost?.element === self.element ? "dragging-over" : "idle",
        });
      },
      onDragLeave() {
        setGroupState({
          type: "idle",
        });
      },
      onDrop() {
        setGroupState({
          type: "idle",
        });
      },
    });
  }, [node.id]);

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            "bg-card text-card-foreground flex items-center gap-2 rounded-md border p-2 shadow",
            state.type === "dragging" && "opacity-50",
          )}
        >
          <div className="inline-flex items-center gap-2">
            {node.children.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={toggleOpen}
              >
                <div>
                  {node.isOpen ? <ChevronDown /> : <ChevronRight />}
                  <span className="sr-only">
                    Toggle:
                    {node.content}
                  </span>
                </div>
              </Button>
            )}
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
                  {node.content}
                </span>
              </div>
            </Button>
            <p>{node.content}</p>
          </div>
        </div>
        {state.type === "dragging-over" && state.instruction !== null ? (
          <DropIndicator instruction={state.instruction} gap={8} />
        ) : null}
      </div>

      {node.children.length > 0 && node.isOpen && (
        <GroupDropIndicator
          ref={groupRef}
          className="ml-4 flex flex-col gap-2 p-2"
          isActive={groupState.type === "dragging-over"}
        >
          {node.children.map((childId) => {
            const childNode = data?.nodes[childId];
            if (!childNode) return null;
            return <TreeNode key={childId} node={childNode} />;
          })}
        </GroupDropIndicator>
      )}
    </div>
  );
}

export default function TreeExample() {
  const [data, setData] = useState<ITree>(INITIAL_TREE);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;

    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return isTreeNodeData(source.data);
        },
        onDrop({ location, source }) {
          if (location.current.dropTargets.length <= 0) {
            return;
          }

          const target = location.current.dropTargets[0];
          if (!isTreeNodeData(source.data)) return;
          if (!isTreeNodeData(target.data)) return;

          const nodeId = source.data.node.id;
          const targetNodeId = target.data.node.id;

          if (nodeId === targetNodeId) return;

          const instruction = extractInstruction(target.data);
          if (!instruction) return;
          if (instruction.blocked) return;

          setData((prev) => {
            const updatedTree = { ...prev };
            const nodes = { ...updatedTree.nodes };
            const rootIds = [...updatedTree.rootIds];

            const currentParentId = nodes[nodeId].parentId;
            if (currentParentId) {
              nodes[currentParentId] = {
                ...nodes[currentParentId],
                children: nodes[currentParentId].children.filter(
                  (id) => id !== nodeId,
                ),
              };
            } else {
              updatedTree.rootIds = rootIds.filter((id) => id !== nodeId);
            }

            switch (instruction.operation) {
              case "combine": {
                nodes[targetNodeId] = {
                  ...nodes[targetNodeId],
                  children: [nodeId, ...nodes[targetNodeId].children],
                };
                nodes[nodeId] = {
                  ...nodes[nodeId],
                  parentId: targetNodeId,
                };
                break;
              }
              case "reorder-before": {
                const targetParentId = nodes[targetNodeId].parentId;
                if (targetParentId) {
                  const parent = nodes[targetParentId];
                  const index = parent.children.indexOf(targetNodeId);
                  nodes[targetParentId] = {
                    ...parent,
                    children: [
                      ...parent.children.slice(0, index),
                      nodeId,
                      ...parent.children.slice(index),
                    ],
                  };
                } else {
                  const index = rootIds.indexOf(targetNodeId);
                  updatedTree.rootIds = [
                    ...rootIds.slice(0, index),
                    nodeId,
                    ...rootIds.slice(index),
                  ];
                }
                nodes[nodeId] = {
                  ...nodes[nodeId],
                  parentId: targetParentId,
                };
                break;
              }
              case "reorder-after": {
                const targetParentId = nodes[targetNodeId].parentId;
                if (targetParentId) {
                  const parent = nodes[targetParentId];
                  const index = parent.children.indexOf(targetNodeId);
                  nodes[targetParentId] = {
                    ...parent,
                    children: [
                      ...parent.children.slice(0, index + 1),
                      nodeId,
                      ...parent.children.slice(index + 1),
                    ],
                  };
                } else {
                  const index = rootIds.indexOf(targetNodeId);
                  updatedTree.rootIds = [
                    ...rootIds.slice(0, index + 1),
                    nodeId,
                    ...rootIds.slice(index + 1),
                  ];
                }
                nodes[nodeId] = {
                  ...nodes[nodeId],
                  parentId: targetParentId,
                };
                break;
              }
              default: {
                throw new Error("Unknown operation");
              }
            }

            updatedTree.nodes = nodes;
            return updatedTree;
          });
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
        getAllowedAxis: () => "vertical",
        canScroll: ({ source }) => isTreeNodeData(source.data),
      }),
    );
  }, []);

  return (
    <TreeContext value={{ data, setData }}>
      <main className="flex h-full w-full flex-col items-center gap-8">
        <h1>Tree Example</h1>
        <div
          ref={ref}
          className="flex h-full w-full max-w-full flex-col gap-2 overflow-y-auto p-2"
        >
          {data?.rootIds.map((id) => (
            <TreeNode key={id} node={data.nodes[id]} />
          ))}
        </div>
      </main>
    </TreeContext>
  );
}
