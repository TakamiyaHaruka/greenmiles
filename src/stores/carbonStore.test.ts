import { describe, it, expect, afterEach } from 'vitest';
import { useCarbonStore } from './carbonStore';

afterEach(() => {
  useCarbonStore.setState(useCarbonStore.getInitialState());
});

describe('useCarbonStore', () => {
  it('has correct initial state', () => {
    const state = useCarbonStore.getState();
    expect(state.co2Kg).toBeNull();
    expect(state.analogy).toBe('');
  });

  it('setCarbonResult sets both values', () => {
    useCarbonStore.getState().setCarbonResult(80.5, 'test analogy');
    const state = useCarbonStore.getState();
    expect(state.co2Kg).toBe(80.5);
    expect(state.analogy).toBe('test analogy');
  });

  it('clearCarbonResult resets to initial state', () => {
    useCarbonStore.getState().setCarbonResult(100, 'some analogy');
    useCarbonStore.getState().clearCarbonResult();
    const state = useCarbonStore.getState();
    expect(state.co2Kg).toBeNull();
    expect(state.analogy).toBe('');
  });
});
