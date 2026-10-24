/** State-machine definition validation; this does not execute a workflow. */
export function workflowDefinitionErrors(definition: {
  name?: unknown; model?: unknown; initialState?: unknown; states?: unknown; transitions?: unknown;
}): string[] {
  const errors: string[] = [];
  const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!text(definition.name, 100)) errors.push('Workflow name is required (up to 100 characters)');
  if (!text(definition.model, 100)) errors.push('Model is required (up to 100 characters)');
  const states = definition.states;
  const transitions = definition.transitions ?? [];
  if (!Array.isArray(states) || states.length === 0 || states.length > 500) {
    errors.push('Provide between 1 and 500 states');
    return errors;
  }
  if (!Array.isArray(transitions) || transitions.length > 2000) {
    errors.push('Transitions must be an array with at most 2000 entries');
    return errors;
  }
  const codes = new Set<string>();
  const starts: string[] = [];
  let ends = 0;
  for (const [index, state] of states.entries()) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) { errors.push(`State ${index + 1} must be an object`); continue; }
    if (!text(state.code, 50) || state.code !== state.code.trim()) errors.push(`State ${index + 1} needs a code of up to 50 characters without surrounding whitespace`);
    else if (codes.has(state.code)) errors.push(`Duplicate state code: ${state.code}`);
    else codes.add(state.code);
    for (const flag of ['is_start', 'is_end']) {
      if (state[flag] !== undefined && typeof state[flag] !== 'boolean') errors.push(`State ${index + 1}: ${flag} must be a boolean`);
    }
    if (state.is_start === true) starts.push(state.code);
    if (state.is_end === true) ends++;
  }
  if (starts.length !== 1) errors.push('Exactly one start state is required');
  if (ends === 0) errors.push('At least one end state is required');
  if (!text(definition.initialState, 50) || !codes.has(definition.initialState as string)) errors.push('Initial state must reference a defined state');
  else if (starts.length === 1 && definition.initialState !== starts[0]) errors.push('Initial state must match the start state');
  const transitionCodes = new Set<string>();
  for (const [index, transition] of transitions.entries()) {
    if (!transition || typeof transition !== 'object' || Array.isArray(transition)) { errors.push(`Transition ${index + 1} must be an object`); continue; }
    if (!text(transition.code, 100)) errors.push(`Transition ${index + 1} needs a code of up to 100 characters`);
    else if (transitionCodes.has(transition.code)) errors.push(`Duplicate transition code: ${transition.code}`);
    else transitionCodes.add(transition.code);
    if (!codes.has(transition.from_state)) errors.push(`Transition ${index + 1} references an unknown source state`);
    if (!codes.has(transition.to_state)) errors.push(`Transition ${index + 1} references an unknown destination state`);
  }
  return errors;
}
