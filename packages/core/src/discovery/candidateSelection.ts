export function roundRobin<T>(groups: T[][], limit: number): T[] {
  const selected: T[] = [];
  let index = 0;

  while (selected.length < limit && groups.some((group) => index < group.length)) {
    for (const group of groups) {
      const item = group[index];
      if (item !== undefined) {
        selected.push(item);
        if (selected.length >= limit) {
          break;
        }
      }
    }
    index += 1;
  }

  return selected;
}
