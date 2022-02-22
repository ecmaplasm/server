/**
 * Create a promise that never resolves.
 */
function never(): Promise<never> {
  return new Promise(() => {});
}

export { never };
