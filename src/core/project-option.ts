export interface ProjectOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export function getOptionLabel<Value extends string>(
  options: readonly ProjectOption<Value>[],
  value: Value,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
