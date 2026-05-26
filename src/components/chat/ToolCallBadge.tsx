import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: "partial-call" | "call" | "result";
  args?: Record<string, unknown>;
}

interface ToolCallBadgeProps {
  tool: ToolInvocation;
}

function getFilename(path: unknown): string {
  if (typeof path !== "string") return "";
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolLabel(toolName: string, args?: Record<string, unknown>): string {
  const command = args?.command as string | undefined;
  const path = args?.path as string | undefined;
  const newPath = args?.new_path as string | undefined;
  const filename = path ? getFilename(path) : "";

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Viewing ${filename}`;
      case "undo_edit":
        return `Undoing edit to ${filename}`;
      default:
        return filename ? `Working on ${filename}` : "Working on files";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return `Renaming ${filename}${newPath ? ` to ${getFilename(newPath)}` : ""}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return filename ? `Managing ${filename}` : "Managing files";
    }
  }

  return toolName;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  const isDone = tool.state === "result";
  const label = getToolLabel(tool.toolName, tool.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
