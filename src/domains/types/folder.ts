import type { FileType } from "./file";

export interface FolderType {
  name: string;
  parentPath: string;
  children: FolderType[] | FileType[];
}
