type UndoAction = { label: string; undo: () => void }
const stack: UndoAction[] = []
export function pushUndo(action: UndoAction) { stack.push(action) }
export function popUndo(): UndoAction | null { return stack.pop() ?? null }
