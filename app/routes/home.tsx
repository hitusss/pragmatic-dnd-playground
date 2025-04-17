import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <main className="grid place-content-center p-12 lg:p-24">
      <h1>Pragmatic Drag and Drop Playground</h1>
      <nav className="mt-16 px-8">
        <h2>Examples:</h2>
        <ul className="grid gap-2">
          <li>
            <Button
              variant="link"
              size="lg"
              asChild
              className="text-lg font-bold"
            >
              <Link to="">Example 1</Link>
            </Button>
          </li>
        </ul>
      </nav>
    </main>
  );
}
