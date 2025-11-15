import {app} from "electron"

export abstract class MainTools {
    static isDev = !app.isPackaged
}