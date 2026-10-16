const editableRoles = new Set(["buyer", "seller", "coordinator"]);

export function mergeUserRoles(selected: string[], existing: string[] = []) {
  return [
    ...new Set([
      "buyer",
      ...selected.filter((role) => editableRoles.has(role)),
      ...existing.filter((role) => !editableRoles.has(role)),
    ]),
  ];
}

export function coordinatorRoleChange(previous: string[], next: string[]) {
  const before = previous.includes("coordinator");
  const after = next.includes("coordinator");
  return before === after ? null : after ? "granted" : "removed";
}
