import { Server } from "./server.ts";

import { commandSync, log, readConfig } from "@nucleic/sna";

export interface NetworkDevice {
  host: string;
  vendor: string;
  mac: string;
  ip: string;
}

export interface TimedNetworkDevice extends NetworkDevice {
  lastSeen: number;
}

export class Neye {
  routerIP = commandSync("./bin/scan_router.sh").trim();
  server = new Server();

  network = new Map<string, TimedNetworkDevice>();
  devices = new Map<string, NetworkDevice>();

  constructor() {
    this.server.serve(9430);

    setInterval(() => {
      this.scan();
    }, 1000 * 60 * 5); // every 5 minutes

    const conf = readConfig();
    log("<(o)>", `v${conf?.version ?? "error"}`);
    this.scan();
  }

  scan(): NetworkDevice[] {
    const map = this.map();

    for (const old of this.network.values()) {
      if (!map.find((dev) => dev.ip === old.ip)) {
        log(`Device gone: ${old.host} (${old.ip})`);
        this.network.delete(old.ip);
      }
    }

    for (const dev of map) {
      const active = this.network.get(dev.ip);

      if (active) {
        log(
          `Active for ${
            Math.round((Date.now() - active.lastSeen) / 1000)
          }s: ${dev.host} (${dev.ip})`,
        );
      } else {
        this.network.set(dev.ip, { ...dev, lastSeen: Date.now() });
        log(`New device found: ${dev.host} (${dev.ip})`);
      }
    }

    return [...this.network.values()];
  }

  map(): NetworkDevice[] {
    const result = commandSync("./bin/scan.sh", [`${this.routerIP}/24`]).trim();
    return result.split("\n").map((line) => JSON.parse(line));
  }
}
