import { create } from 'zustand';

interface CarbonState {
  co2Kg: number | null;
  analogy: string;
  setCarbonResult: (co2Kg: number, analogy: string) => void;
  clearCarbonResult: () => void;
}

export const useCarbonStore = create<CarbonState>((set) => ({
  co2Kg: null,
  analogy: '',
  setCarbonResult: (co2Kg, analogy) => set({ co2Kg, analogy }),
  clearCarbonResult: () => set({ co2Kg: null, analogy: '' }),
}));
