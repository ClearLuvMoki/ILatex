import { create } from "zustand";
import { ProjectType } from "@/types/index";
import { IPCClient } from "@/render/store/ipc";

interface State {
  projects: ProjectType[];
  currentProject: ProjectType | null;
  setCurrentProject: (data: ProjectType | null) => void;
  setProjects: () => void;
  createProject: (name: string) => Promise<any>;
  reloadProjects: () => Promise<any>;
}

export const useProjectStore = create<State>((set) => {
  async function onInit() {
    const list = await IPCClient.reloadProjects();
    set({
      currentProject: list?.length > 0 ? list[0] : null,
      projects: list,
    });
  }
  onInit();

  return {
    currentProject: null,
    projects: [],
    setCurrentProject: (data) =>
      set({
        currentProject: data,
      }),
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
