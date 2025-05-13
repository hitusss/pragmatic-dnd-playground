import { ChevronDown } from "lucide-react";
import { Link, Outlet } from "react-router";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { exampleRoutes } from "~/constants";

export default function ExampleLayout() {
  return (
    <div className="grid h-dvh">
      <header className="bg-accent text-accent-foreground flex h-16 w-full items-center justify-between border-b-2 px-6">
        <span className="text-2xl font-bold">
          Pragmatic Drag and Drop Playground
        </span>
        <nav>
          <Button variant="link" asChild className="text-lg font-bold">
            <Link to="/">Home</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="link" className="text-lg font-bold">
                Examples
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {exampleRoutes.map((e) => (
                <DropdownMenuItem key={e.to} asChild>
                  <Link to={e.to}>{e.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </header>
      <div className="overflow-hidden p-12">
        <Outlet />
      </div>
    </div>
  );
}
