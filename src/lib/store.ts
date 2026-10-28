import { useSyncExternalStore } from "react";

export type ListColor = "sage" | "violet" | "peach" | "stone" | "sky" | "rose";
export const LIST_COLORS: ListColor[] = ["sage", "violet", "peach", "stone", "sky", "rose"];

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  comment?: string;
  important?: boolean;
  snoozed?: boolean;
}

export interface TodoList {
  id: string;
  title: string;
  section: string;
  color: ListColor;
  items: TodoItem[];
  contributors: string[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "todo-lists-v1";
let lists: TodoList[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: TodoList[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    lists = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    lists = [];
  }
}

function emit() {
  localStorage.setItem(KEY, JSON.stringify(lists));
  listeners.forEach((l) => l());
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function useLists(): TodoList[] {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return lists;
    },
    () => EMPTY,
  );
}

export function createList(): TodoList {
  load();
  const now = Date.now();
  const list: TodoList = {
    id: uid(),
    title: "",
    section: "",
    color: "sage",
    items: [{ id: uid(), text: "", done: false }],
    contributors: [],
    createdAt: now,
    updatedAt: now,
  };
  lists = [list, ...lists];
  emit();
  return list;
}

export function saveList(list: TodoList) {
  load();
  const next = { ...list, updatedAt: Date.now() };
  lists = lists.some((l) => l.id === list.id)
    ? lists.map((l) => (l.id === list.id ? next : l))
    : [next, ...lists];
  emit();
}

export function duplicateList(list: TodoList): TodoList {
  const copy: TodoList = {
    ...structuredClone(list),
    id: uid(),
    title: `${list.title || "Untitled"} (copy)`,
    createdAt: Date.now(),
  };
  saveList(copy);
  return copy;
}

export function deleteList(id: string) {
  load();
  lists = lists.filter((l) => l.id !== id);
  emit();
}
