import logger from "electron-log/main";
import { logger as rslogger } from "rslog";
import { MainTools } from "@/main/utils/tools";

logger.initialize();
logger.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}";

const Logger = {
  info(...param: any) {
    !MainTools.isDev && logger.info(param);
    rslogger.info(param);
  },
  warn(...param: any) {
    !MainTools.isDev && logger.warn(param);
    rslogger.warn(param);
  },
  error(...param: any) {
    !MainTools.isDev && logger.error(param);
    rslogger.error(param);
  },
};

export default Logger;
