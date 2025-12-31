import { create } from "zustand";
import { IPCClient } from "@/render/store/ipc";
import type { FileType, FolderType, ProjectType } from "@/types/index";

interface State {
  projects: ProjectType[];
  currentProject: ProjectType | null;
  setCurrentProject: (data: ProjectType | null) => void;
  setProjects: () => void;
  createProject: (name: string) => Promise<any>;
  reloadProjects: () => Promise<any>;
  tree: FolderType[] & FileType[];
}

export const useProjectStore = create<State>((set) => {
  async function onInit() {
    const list = await IPCClient.reloadProjects();
    list?.length > 0 && onInitTree(list[0].name);
    set({
      currentProject: list?.length > 0 ? list[0] : null,
      projects: list,
    });
  }

  async function onInitTree(name: string) {
    IPCClient.projectDirectory({ name }).then((res) => {
      set({
        tree: res?.tree,
      });
    });
  }
  onInit();

  return {
    tree: [],
    currentProject: null,
    projects: [],
    setCurrentProject: (data) => {
      data?.name && onInitTree(data?.name);
      set({
        currentProject: data,
      });
    },
    setProjects: () =>
      set({
        projects: [],
      }),
    createProject: (name: string) => {
      return IPCClient.createProject({
        name,
      });
    },
    reloadProjects: async () => {
      return onInit();
    },
  };
});
