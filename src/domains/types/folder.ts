export interface  FolderTypes {
    path: string;
    name: string;
    children: FolderTypes[] | FileType[]
}