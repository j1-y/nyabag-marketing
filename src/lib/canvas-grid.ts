export const SNAP_SIZE = 16;

export function snapToGrid(value: number, snapSize = SNAP_SIZE) {
  return Math.round(value / snapSize) * snapSize;
}

export function maybeSnap(value: number, shouldSnap: boolean) {
  return shouldSnap ? snapToGrid(value) : value;
}
