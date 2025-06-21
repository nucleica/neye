import { Server } from "@nucleic/venous";

import { commandSync, log, readConfig } from "@nucleic/sna";
import { Database } from "@nucleic/mem";

export interface NetworkDevice {
  host: string;
  vendor: string;
  mac: string;
  ip: string;

  id?: number;
}

export interface TimedNetworkDevice extends NetworkDevice {
  lastSeen: number;
}

export interface DeviceActivity {
  deviceID: number;
  seen: number;
  gone: number;

  id?: number;
}

export class Neye {
  routerIP = commandSync("./bin/scan_router.sh").trim();
  server = new Server();

  mem = new Database({
    path: "store/main.db",
    models: {
      device: {
        mac: { type: "TEXT", notNull: true, unique: true },
        ip: { type: "TEXT" },
        host: { type: "TEXT" },
        vendor: { type: "TEXT" },
      },
      device_activity: {
        deviceID: { type: "INTEGER", notNull: true },
        seen: { type: "INTEGER", notNull: true },
        gone: { type: "INTEGER" },
      },
    },
  });

  constructor(port: number) {
    this.server.serve(port);

    this.server.addRoute({
      handler: () =>
        this.server.respond(
          this.mem.models.get("device")?.select().filter((d) =>
            d.ip !== "192.168.1.1"
          ),
        ),
      path: "/device",
    });

    this.server.addRoute({
      handler: ({ deviceID }: { deviceID: number }) => {
        const res = this.mem.models.get("device_activity")
          ?.where({ deviceID }, {
            descending: true,
            orderBy: "id",
            limit: 1,
          });

        return this.server.respond(res);
      },
      path: "/device-activity",
    });

    const conf = readConfig();
    log("<(o)>", `v${conf?.version ?? "error"}`);
    const a = this.mem.table("device_activity");
    a?.where({ gone: null }, {}).forEach((act) => {
      const ati = act as unknown as DeviceActivity;

      ati.id && a.remove(ati.id);
    });

    setInterval(() => this.scan(), 60000 * 4);
  }

  scan() {
    const model = this.mem.table("device");
    const map = this.map();

    for (const found of map) {
      const existing = model?.where({ mac: found.mac }, {}) as
        | NetworkDevice[]
        | undefined;

      if (existing && existing[0]) {
        if (found.ip !== existing[0].ip) {
          log(
            `${existing[0].host} ip changed from ${
              existing[0].ip
            } to ${found.ip}`,
          );
        } else {
          existing[0].id && this.markActivity(existing[0].id);
        }
      } else {
        try {
          const { mac, ip, host, vendor } = found;
          const res = model?.add([
            mac.trim(),
            ip.trim(),
            host.trim(),
            vendor.trim(),
          ]);

          const id = res?.lastInsertRowid as number;

          this.server.ws.update("device-update", { ...found, id });

          id && this.markActivity(id);

          log(`New device found: ${found.host} (${found.ip})`);
        } catch (err) {
          log(found.host, found.ip, err);
        }
      }
    }

    const olds = model?.select() as NetworkDevice[] | undefined;

    if (olds) {
      for (
        const old of olds.filter(({ mac }) => !map.find((f) => f.mac === mac))
      ) {
        old.id && this.markActivity(old.id, true);
      }
    }
  }

  markActivity(deviceID: number, gone = false) {
    const atv = this.mem.table("device_activity");

    if (!atv) {
      throw new Error('Table "device_activity" not found');
    }

    const oldAct = atv.where({ deviceID, gone: null }, {});
    const device = this.mem.table("device")?.selectByID(deviceID) as
      | NetworkDevice
      | undefined;

    const devName = `${device?.host.replace(".home", "")} (${device?.ip})`;

    if (gone) {
      if (oldAct && oldAct[0]) {
        const gone = Date.now();
        const activity = oldAct[0] as unknown as DeviceActivity;
        const id = activity.id;

        id && atv.update(id, { gone });

        this.server.ws.update("device-activity-update", { ...activity, gone });

        log(
          time(),
          `${devName} gone after ${
            Math.floor((gone - activity.seen) / 60000)
          } minutes`,
        );
      } else {
        // missing
      }
    } else if (oldAct && oldAct[0]) {
      // log(`device ${deviceID} seen again`);
    } else {
      log(time(), `${devName} connected`);
      const seen = Date.now();

      atv.add([deviceID, seen]);
      // TODO need to add id
      this.server.ws.update("device-activity-update", { deviceID, seen });
    }
  }

  map(ip = `${this.routerIP}/24`): NetworkDevice[] {
    const result = commandSync("./bin/scan.sh", [ip]).trim();
    if (!result) {
      log("Scan detected nothing");
      return [];
    }

    return result.split("\n").map((line) => JSON.parse(line));
  }
}

export function time() {
  const d = new Date();
  return `[${d.toLocaleTimeString()}]`;
}
