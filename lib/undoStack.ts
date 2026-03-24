type UndoAction = { label: string; undo: () => void }
const stack: UndoAction[] = []
const MAX = 50
const subscribers = new Set<() => void>()

function notify() { subscribers.forEach(fn => fn()) }

export function pushUndo(action: UndoAction) {
  stack.push(action)
  if (stack.length > MAX) stack.shift()
  notify()
}

export function popUndo(): UndoAction | null {
  const action = stack.pop() ?? null
  notify()
  return action
}

export function peekUndo(): UndoAction | null {
  return stack[stack.length - 1] ?? null
}

export function subscribeUndo(fn: () => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
