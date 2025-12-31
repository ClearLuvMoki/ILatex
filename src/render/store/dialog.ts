import { create } from "zustand";
import type { FileType, FolderType, ProjectType } from "@/types/index";

interface BaseState {
  open: boolean;
}

interface State {
  projectState: BaseState & {
    data: ProjectType | null;
  };
  setProjectState: (isOpen: boolean, data: ProjectType | null) => void;
  folderState: BaseState & {
    data: Partial<FolderType> | null;
  };
  setFolderState: (isOpen: boolean, data: Partial<FolderType> | null) => void;
  fileState: BaseState & {
    data: Partial<FileType> | null;
  };
  setFileState: (isOpen: boolean, data: Partial<FileType> | null) => void;
}

export const useDialogStore = create<State>((set) => {
  return {
    projectState: {
      open: false,
      data: null,
    },
    folderState: {
      open: false,
      data: null,
    },
    fileState: {
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
    setFolderState: (isOpen, data) => {
      set({
        folderState: {
          open: isOpen,
          data,
        },
      });
    },
    setFileState: (isOpen, data) => {
      set({
        fileState: {
          open: isOpen,
          data,
        },
      });
    },
  };
});
