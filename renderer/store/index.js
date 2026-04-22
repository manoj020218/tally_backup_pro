import { create } from "zustand";
import { createAppSlices } from "./slices";

export const useAppStore = create((set) => ({
  ...createAppSlices(set)
}));

export default useAppStore;
