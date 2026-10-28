import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  BellRing,
  ChevronDown,
  ChevronLeft,
  Copy,
  GripVertical,
  MessageSquare,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  Redo2,
  Search,
  Share2,
  Trash2,
  Undo2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import {
  deleteList,
  duplicateList,
  LIST_COLORS,
  saveList,
  uid,
  useLists,
  type TodoItem,
  type TodoList,
} from "@/lib/store";
import { colorBg } from "@/lib/colors";

export const Route = createFileRoute("/list/$id")({
  head: () => ({
    meta: [
      { title: "List — Lists" },
      { name: "description", content: "View and edit your todo list." },
      { property: "og:title", content: "List — Lists" },
      { property: "og:description", content: "View and edit your todo list." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
  const { id } = Route.useParams();
  const lists = useLists();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const list = lists.find((l) => l.id === id);

  if (!mounted) return <div className="min-h-screen bg-list-sage" />;
  if (!list)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-xl">This list doesn't exist anymore.</p>
        <Link to="/" className="rounded-full bg-primary px-5 py-2 text-primary-foreground">
          Back to lists
        </Link>
      </div>
    );
  return <Editor key={list.id} list={list} />;
}

function Editor({ list }: { list: TodoList }) {
  const navigate = useNavigate();
  const [past, setPast] = useState<TodoList[]>([]);
  const [future, setFuture] = useState<TodoList[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [viewComment, setViewComment] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [invite, setInvite] = useState(false);
  const [find, setFind] = useState<string | null>(null);
  const [openCollapsed, setOpenCollapsed] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const focusRef = useRef<string | null>(null);

  const update = (fn: (l: TodoList) => TodoList) => {
    setPast((p) => [...p.slice(-50), list]);
    setFuture([]);
    saveList(fn(structuredClone(list)));
  };
  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [list, ...f]);
    saveList(prev);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, list]);
    saveList(next);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (focusRef.current) {
      document.getElementById(`item-${focusRef.current}`)?.focus();
      focusRef.current = null;
    }
  });

  const setItem = (itemId: string, patch: Partial<TodoItem>) =>
    update((l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));

  const addItem = (afterId?: string) => {
    const item: TodoItem = { id: uid(), text: "", done: false };
    focusRef.current = item.id;
    update((l) => {
      const items = [...l.items];
      const idx = afterId ? items.findIndex((i) => i.id === afterId) + 1 : items.length;
      items.splice(idx, 0, item);
      return { ...l, items };
    });
  };

  const removeItem = (itemId: string) =>
    update((l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));

  const onItemKey = (e: KeyboardEvent<HTMLInputElement>, item: TodoItem, prevId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(item.id);
    } else if (e.key === "Backspace" && item.text === "") {
      e.preventDefault();
      if (prevId) focusRef.current = prevId;
      removeItem(item.id);
    }
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    update((l) => {
      const items = [...l.items];
      const from = items.findIndex((i) => i.id === dragId);
      const moved = items.splice(from, 1)[0]!;
      items.splice(items.findIndex((i) => i.id === targetId), 0, moved);
      return { ...l, items };
    });
    setDragId(null);
  };

  const goBack = () => {
    const empty = !list.title.trim() && !list.section.trim() && list.items.every((i) => !i.text.trim());
    if (empty) deleteList(list.id);
    navigate({ to: "/" });
  };

  const send = async () => {
    const text = [
      list.title || "Untitled list",
      ...list.items.filter((i) => i.text).map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`),
    ].join("\n");
    setSheet(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: list.title, text });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(text);
    flash("List copied to clipboard");
  };

  const open = list.items.filter((i) => !i.done);
  const done = list.items.filter((i) => i.done && i.text);
  const matches = (t: string) => !!find && t.toLowerCase().includes(find.toLowerCase());

  return (
    <div className={`${colorBg[list.color]} min-h-screen transition-colors`}>
      <div className="mx-auto max-w-2xl pb-36">
        <header className="flex items-center gap-3 px-4 pt-6 pb-4">
          <button aria-label="Back" onClick={goBack} className="p-2">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <input
            value={list.title}
            onChange={(e) => update((l) => ({ ...l, title: e.target.value }))}
            placeholder="List title"
            className="flex-1 bg-transparent text-2xl outline-none placeholder:text-foreground/70"
          />
          {list.contributors.length > 0 && (
            <div className="flex -space-x-2">
              {list.contributors.slice(0, 3).map((c) => (
                <span
                  key={c}
                  title={c}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-avatar text-xs font-medium uppercase"
                >
                  {c[0]}
                </span>
              ))}
            </div>
          )}
        </header>

        {find !== null && (
          <div className="mx-6 mb-2 flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
            <Search className="h-4 w-4" />
            <input
              autoFocus
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Find in list"
              className="flex-1 bg-transparent outline-none"
            />
            <button aria-label="Close search" onClick={() => setFind(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="px-6">
          <div className="flex items-center justify-between py-4">
            <input
              value={list.section}
              onChange={(e) => update((l) => ({ ...l, section: e.target.value }))}
              placeholder="Title"
              className="flex-1 bg-transparent text-2xl outline-none placeholder:text-foreground/70"
            />
            <button aria-label="Collapse" onClick={() => setOpenCollapsed((c) => !c)} className="p-2">
              <ChevronDown className={`h-5 w-5 transition-transform ${openCollapsed ? "-rotate-90" : ""}`} />
            </button>
          </div>

          {!openCollapsed && (
            <ul>
              {open.map((item, idx) => (
                <li
                  key={item.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(item.id)}
                  className={`relative ${dragId === item.id ? "opacity-40" : ""}`}
                >
                  <div
                    className={`group flex items-center gap-4 rounded-lg py-2 ${matches(item.text) ? "bg-secondary/60" : ""} ${item.snoozed ? "opacity-60" : ""}`}
                  >
                    <span
                      draggable
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => setDragId(null)}
                      className="cursor-grab p-1"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-6 w-6" />
                    </span>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => setItem(item.id, { done: true })}
                      aria-label={`Check ${item.text}`}
                      className="h-5 w-5 cursor-pointer accent-primary"
                    />
                    <input
                      id={`item-${item.id}`}
                      value={item.text}
                      onChange={(e) => setItem(item.id, { text: e.target.value })}
                      onKeyDown={(e) => onItemKey(e, item, open[idx - 1]?.id)}
                      placeholder="List item"
                      className="ml-2 flex-1 bg-transparent outline-none placeholder:text-foreground/60"
                    />
                    {item.important && <AlertCircle className="h-4 w-4 text-destructive" aria-label="Important" />}
                    {item.snoozed && <BellRing className="h-4 w-4" aria-label="Snoozed" />}
                    {item.comment && (
                      <button
                        aria-label="View comment"
                        onClick={() => setViewComment(viewComment === item.id ? null : item.id)}
                        className="p-1"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      aria-label="More"
                      onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}
                      className="p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  {menuFor === item.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                      <div className="absolute right-0 top-11 z-30 w-52 rounded-xl bg-popover py-2 text-popover-foreground shadow-xl">
                        <MenuBtn icon={<MessageSquare className="h-5 w-5" />} onClick={() => { setCommentFor(item.id); setMenuFor(null); }}>
                          {item.comment ? "Edit comment" : "Add comment"}
                        </MenuBtn>
                        <div className="mx-3 my-1 border-t" />
                        <p className="flex items-center justify-between px-4 py-2 text-sm">
                          Custom tags <Pencil className="h-4 w-4" />
                        </p>
                        <MenuBtn active={item.important} icon={<AlertCircle className="h-5 w-5" />} onClick={() => { setItem(item.id, { important: !item.important }); setMenuFor(null); }}>
                          Important
                        </MenuBtn>
                        <MenuBtn active={item.snoozed} icon={<BellRing className="h-5 w-5" />} onClick={() => { setItem(item.id, { snoozed: !item.snoozed }); setMenuFor(null); }}>
                          Snooze
                        </MenuBtn>
                        <div className="mx-3 my-1 border-t" />
                        <MenuBtn icon={<Trash2 className="h-5 w-5" />} onClick={() => { removeItem(item.id); setMenuFor(null); }}>
                          Delete
                        </MenuBtn>
                      </div>
                    </>
                  )}

                  {viewComment === item.id && item.comment && commentFor !== item.id && (
                    <button
                      onClick={() => { setCommentFor(item.id); setViewComment(null); }}
                      className="ml-14 mb-2 flex w-[calc(100%-3.5rem)] items-center gap-3 rounded-2xl bg-popover p-3 text-left shadow-md"
                      aria-label="Edit comment"
                    >
                      <Avatar />
                      <span className="rounded-2xl bg-bubble px-4 py-2">{item.comment}</span>
                    </button>
                  )}

                  {commentFor === item.id && (
                    <CommentEditor
                      initial={item.comment ?? ""}
                      onCancel={() => setCommentFor(null)}
                      onSave={(c) => {
                        setItem(item.id, { comment: c.trim() || undefined });
                        setCommentFor(null);
                        if (c.trim()) setViewComment(item.id);
                      }}
                    />
                  )}
                </li>
              ))}
              <li>
                <button onClick={() => addItem()} className="ml-12 flex items-center gap-2 py-3 text-foreground/80">
                  <Plus className="h-5 w-5" /> List item
                </button>
              </li>
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section className="mt-6 px-6">
            <div className="flex items-center justify-between py-4">
              <h2 className="text-2xl">Checked items</h2>
              <button aria-label="Collapse checked" onClick={() => setDoneCollapsed((c) => !c)} className="p-2">
                <ChevronDown className={`h-5 w-5 transition-transform ${doneCollapsed ? "-rotate-90" : ""}`} />
              </button>
            </div>
            {!doneCollapsed && (
              <ul>
                {done.map((item) => (
                  <li key={item.id} className={`group flex items-center gap-6 rounded-lg py-3 pl-11 ${matches(item.text) ? "bg-secondary/60" : ""}`}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() => setItem(item.id, { done: false })}
                      aria-label={`Uncheck ${item.text}`}
                      className="h-5 w-5 cursor-pointer accent-foreground"
                    />
                    <span className="flex-1 line-through">{item.text}</span>
                    <button aria-label="Delete" onClick={() => removeItem(item.id)} className="p-1 opacity-0 group-hover:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Toolbar */}
      <div className={`${colorBg[list.color]} fixed inset-x-0 bottom-0 z-10`}>
        <div className="relative mx-auto flex max-w-2xl items-center gap-4 px-6 py-5">
          <ToolBtn label="Add item" onClick={() => addItem()}><Plus className="h-6 w-6" /></ToolBtn>
          <ToolBtn label="Change color" onClick={() => setShowPalette((s) => !s)}><Palette className="h-5 w-5" /></ToolBtn>
          <div className="flex-1" />
          <ToolBtn label="Undo" disabled={!past.length} onClick={undo}><Undo2 className="h-5 w-5" /></ToolBtn>
          <ToolBtn label="Redo" disabled={!future.length} onClick={redo}><Redo2 className="h-5 w-5" /></ToolBtn>
          <button aria-label="More options" onClick={() => setSheet(true)} className="ml-4 flex h-10 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MoreVertical className="h-5 w-5" />
          </button>

          {showPalette && (
            <div className="absolute bottom-20 left-6 flex gap-2 rounded-2xl bg-popover p-3 shadow-xl">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Color ${c}`}
                  onClick={() => { update((l) => ({ ...l, color: c })); setShowPalette(false); }}
                  className={`${colorBg[c]} h-9 w-9 rounded-full border-2 ${list.color === c ? "border-foreground" : "border-transparent"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30" onClick={() => setSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl animate-in slide-in-from-bottom rounded-t-3xl bg-popover px-3 pb-6 pt-3 text-popover-foreground">
            <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-muted-foreground" />
            <SheetBtn icon={<Search className="h-5 w-5" />} onClick={() => { setFind(""); setSheet(false); }}>Find in note</SheetBtn>
            <SheetBtn icon={<Copy className="h-5 w-5" />} onClick={() => { const c = duplicateList(list); setSheet(false); navigate({ to: "/list/$id", params: { id: c.id } }); }}>Make a copy</SheetBtn>
            <SheetBtn icon={<Share2 className="h-5 w-5" />} onClick={send}>Send</SheetBtn>
            <SheetBtn icon={<UserPlus className="h-5 w-5" />} onClick={() => { setInvite(true); setSheet(false); }}>Invite contributor</SheetBtn>
            <SheetBtn icon={<Trash2 className="h-5 w-5" />} onClick={() => { deleteList(list.id); navigate({ to: "/" }); }}>Delete</SheetBtn>
          </div>
        </div>
      )}

      {invite && (
        <InviteDialog
          contributors={list.contributors}
          onClose={() => setInvite(false)}
          onAdd={(email) => { update((l) => ({ ...l, contributors: [...l.contributors, email] })); flash(`Invited ${email}`); }}
          onRemove={(email) => update((l) => ({ ...l, contributors: l.contributors.filter((c) => c !== email) }))}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Avatar() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-avatar">
      <User className="h-6 w-6 text-primary" />
    </span>
  );
}

function CommentEditor({ initial, onSave, onCancel }: { initial: string; onSave: (c: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="mb-2 ml-4 rounded-2xl bg-popover p-3 shadow-xl">
      <div className="flex items-center gap-3">
        <Avatar />
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(text); if (e.key === "Escape") onCancel(); }}
          placeholder="Add a comment"
          className="flex-1 rounded-2xl bg-bubble px-4 py-2 outline-none"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-5 py-3 text-sm font-medium hover:bg-accent">Cancel</button>
        <button onClick={() => onSave(text)} className="rounded-full bg-muted px-7 py-3 font-medium hover:bg-accent">Save</button>
      </div>
    </div>
  );
}

function InviteDialog({ contributors, onAdd, onRemove, onClose }: { contributors: string[]; onAdd: (e: string) => void; onRemove: (e: string) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const valid = /^\S+@\S+\.\S+$/.test(email) && !contributors.includes(email);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-popover p-6 text-popover-foreground shadow-xl">
        <h2 className="mb-4 text-xl font-medium">Invite contributor</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) { onAdd(email); setEmail(""); } }}
          className="flex gap-2"
        >
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="flex-1 rounded-full bg-secondary px-4 py-2 outline-none"
          />
          <button disabled={!valid} className="rounded-full bg-primary px-4 py-2 text-primary-foreground disabled:opacity-40">Add</button>
        </form>
        <ul className="mt-4 space-y-2">
          {contributors.map((c) => (
            <li key={c} className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-avatar text-xs uppercase">{c[0]}</span>
              <span className="flex-1 truncate">{c}</span>
              <button aria-label={`Remove ${c}`} onClick={() => onRemove(c)}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-full px-5 py-2 font-medium hover:bg-accent">Done</button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean | undefined; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50">
      {children}
    </button>
  );
}

function MenuBtn({ icon, onClick, active, children }: { icon: React.ReactNode; onClick: () => void; active?: boolean | undefined; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent ${active ? "bg-accent" : ""}`}>
      {icon} {children}
    </button>
  );
}

function SheetBtn({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-left hover:bg-accent">
      {icon} {children}
    </button>
  );
}
