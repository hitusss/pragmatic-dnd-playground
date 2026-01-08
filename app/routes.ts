import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  ...prefix("example", [
    layout("routes/example/layout.tsx", [
      route("list", "routes/example/list.tsx"),
      route("board", "routes/example/board.tsx"),
      route("tree", "routes/example/tree.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
