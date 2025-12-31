import { createHash } from "node:crypto";
import os from "node:os";

import { PostHog } from "posthog-node";
import { ElectronStoreKey } from "@/constant/store-key";
import { MainTools } from "@/main/utils/tools";
import Store from "./store";

function getFingerprintId() {
  const data = [
    os.type(),
    os.arch(),
    os.platform(),
    os.cpus()?.[0]?.model ?? "",
    os.totalmem().toString(),
    os.hostname(),
  ].join("|");

  const hash = createHash("sha256").update(data).digest("hex");

  return hash;
}

const client = new PostHog("phc_aodDuvhJwPkG0xLyzFvaQZZbXkxnhQi77owcG8CzS", {
  host: "https://us.i.posthog.com",
});

export function initStatistics() {
  if (MainTools.isDev) return;
  let EquipmentId = "";
  if (Store.hasKey(ElectronStoreKey.EquipmentId)) {
    EquipmentId = Store.getValue(ElectronStoreKey.EquipmentId);
  } else {
    EquipmentId = getFingerprintId();
    Store.setValue(ElectronStoreKey.EquipmentId, EquipmentId);
  }
  client.capture({
    distinctId: EquipmentId,
    event: "ilatex_open",
    properties: {
      id: EquipmentId,
      platform: os.platform ?? process.platform,
      type: os.type(),
      arch: os.arch(),
      cpus: os.cpus()?.[0]?.model ?? "",
      totalmem: os.totalmem().toString(),
      hostname: os.hostname(),
      timestamp: Date.now(),
    },
  });
}
