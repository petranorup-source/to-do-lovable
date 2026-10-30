import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, LayoutGrid, Menu, Plus, Rows3, Square, CheckSquare } from "lucide-react";
import { createList, useLists } from "@/lib/store";
import { colorBg } from "@/lib/colors";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My lists — Lists" },
      { name: "description", content: "All your todo lists in one place. Search, sort and create new lists." },
      { property: "og:title", content: "My lists — Lists" },
      { property: "og:description", content: "All your todo lists in one place. Search, sort and create new lists." },
    ],
  }),
  component: Home,
});

type Sort = "updated" | "title";

function Home() {
  const lists = useLists();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [grid, setGrid] = useState(false);
  const [sort, setSort] = useState<Sort>("updated");

  const shown = useMemo(() => {
    const term = q.toLowerCase();
    const f = lists.filter(
      !term
        ? Boolean
        : (l) =>
            l.title.toLowerCase().includes(term) ||
            l.items.some((i) => i.text.toLowerCase().includes(term)),
    );
    return [...f].sort((a, b) =>
      sort === "title" ? (a.title || "").localeCompare(b.title || "") : b.updatedAt - a.updatedAt,
    );
  }, [lists, q, sort]);

  const add = () => {
    const l = createList();
    navigate({ to: "/list/$id", params: { id: l.id } });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background py-4">
        <button aria-label="Menu" className="p-2">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-5 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-foreground"
          />
          <button aria-label="Toggle layout" onClick={() => setGrid((g) => !g)} className="p-1">
            {grid ? <Rows3 className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
          </button>
          <button
            aria-label={`Sort by ${sort === "updated" ? "title" : "last edited"}`}
            title={sort === "updated" ? "Sorted by last edited" : "Sorted by title"}
            onClick={() => setSort((s) => (s === "updated" ? "title" : "updated"))}
            className="p-1"
          >
            <ArrowUpDown className="h-5 w-5" />
          </button>
        </div>
      </header>

      {lists.length === 0 ? (
        <>
          {/* 1. Auto Layout frame with 92px padding above and below */}
          <div className="flex flex-col items-center justify-center py-[92px]">
            <p className="text-center text-2xl font-normal">Lists you add appear here</p>
          </div>

          {/* 2. Divider line above the SVGs */}
          <div className="-mx-4 border-t border-border" />

          {/* 3. Figma Vector Ghost Lists below the divider with mt-12 gap */}
          <div className={grid ? "mt-12 grid grid-cols-2 gap-3" : "mt-12 flex flex-col gap-3"}>
            <button
              type="button"
              onClick={add}
              className="block w-full cursor-pointer text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
              title="Create new list"
            >
              <img
                src="/empty-list-1.svg"
                alt="Empty list placeholder"
                className="w-full rounded-2xl opacity-80 transition-opacity hover:opacity-100"
              />
            </button>
            <button
              type="button"
              onClick={add}
              className="block w-full cursor-pointer text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
              title="Create new list"
            >
              <img
                src="/empty-lists-2.svg"
                alt="Empty list placeholder"
                className="w-full rounded-2xl opacity-80 transition-opacity hover:opacity-100"
              />
            </button>
            <button
              type="button"
              onClick={add}
              className="block w-full cursor-pointer text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
              title="Create new list"
            >
              <img
                src="/empty-list-3.svg"
                alt="Empty list placeholder"
                className="w-full rounded-2xl opacity-80 transition-opacity hover:opacity-100"
              />
            </button>
          </div>
        </>
      ) : shown.length === 0 ? (
        <p className="py-24 text-center text-lg text-muted-foreground">No lists match “{q}”</p>
      ) : null}

      <div className={grid ? "mt-4 grid grid-cols-2 gap-3" : "mt-4 flex flex-col gap-3"}>
        {shown.map((l) => {
          const open = l.items.filter((i) => !i.done && i.text);
          const done = l.items.filter((i) => i.done && i.text);
          return (
            <Link
              key={l.id}
              to="/list/$id"
              params={{ id: l.id }}
              className={`${colorBg[l.color]} block rounded-2xl p-5 transition-transform hover:scale-[1.01]`}
            >
              <h2 className="mb-2 text-lg font-medium">{l.title || "Untitled list"}</h2>
              <ul className="space-y-1">
                {open.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-center gap-2">
                    <Square className="h-4 w-4 shrink-0" /> <span className="truncate">{i.text}</span>
                  </li>
                ))}
              </ul>
              {done.length > 0 && (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckSquare className="h-4 w-4" /> {done.length} checked
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <button
        onClick={add}
        aria-label="New list"
        className="fixed bottom-8 right-[max(1.5rem,calc(50%-20rem))] flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
