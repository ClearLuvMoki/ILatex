import { create } from "zustand";
import { ProjectType } from "@/types/index";

interface BaseState {
  open: boolean;
}

interface State {
  projectState: BaseState & {
    data: ProjectType | null;
  };
  setProjectState: (isOpen: boolean, data: ProjectType | null) => void;
}

export const useDialogStore = create<State>((set) => {
  return {
    projectState: {
      open: false,
      data: null,
    },
    setProjectState: (isOpen, data) => {
      set({
        projectState: {
          open: isOpen,
          data,
        },
      });
    },
  };
});
