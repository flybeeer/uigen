import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/components/Card.jsx" })).toBe("Creating Card.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing Card.jsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit to App.jsx");
});

test("getToolLabel: str_replace_editor unknown command falls back to filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" })).toBe("Working on App.jsx");
});

test("getToolLabel: str_replace_editor no args", () => {
  expect(getToolLabel("str_replace_editor")).toBe("Working on files");
});

test("getToolLabel: file_manager rename with new_path", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming old.jsx to new.jsx");
});

test("getToolLabel: file_manager rename without new_path", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming old.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/components/Button.jsx" })).toBe("Deleting Button.jsx");
});

test("getToolLabel: unknown tool name returns tool name as-is", () => {
  expect(getToolLabel("some_other_tool")).toBe("some_other_tool");
});

test("getToolLabel: extracts filename from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Button.tsx" })).toBe("Creating Button.tsx");
});

// --- ToolCallBadge render tests ---

test("ToolCallBadge shows spinner when state is call", () => {
  render(
    <ToolCallBadge
      tool={{ toolName: "str_replace_editor", state: "call", args: { command: "create", path: "/App.jsx" } }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  // Spinner present (no green dot)
  expect(document.querySelector(".animate-spin")).toBeTruthy();
  expect(document.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows spinner when state is partial-call", () => {
  render(
    <ToolCallBadge
      tool={{ toolName: "str_replace_editor", state: "partial-call", args: { command: "create", path: "/App.jsx" } }}
    />
  );
  expect(document.querySelector(".animate-spin")).toBeTruthy();
});

test("ToolCallBadge shows green dot when state is result", () => {
  render(
    <ToolCallBadge
      tool={{ toolName: "str_replace_editor", state: "result", args: { command: "create", path: "/App.jsx" } }}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(document.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(document.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      tool={{ toolName: "file_manager", state: "result", args: { command: "delete", path: "/components/Old.jsx" } }}
    />
  );
  expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
});
