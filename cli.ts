import { log } from "@nucleic/sna";
import { Messenger } from "./src/cli/messenger.ts";
import type { NetworkDevice } from "./src/neye.ts";
import { type DeviceActivity, time } from "@nucleic/neye";

export function getDevices(url: string): Promise<NetworkDevice[]> {
  return fetch(`http://${url}/device`)
    .then((res) => res.json());
}

export function getDeviceActivity(
  url: string,
  deviceID: number,
): Promise<DeviceActivity> {
  return fetch(`http://${url}/device-activity`, {
    body: JSON.stringify({ deviceID }),
    method: "POST",
  })
    .then((res) => res.json()).then((res) => res && res[0])
    .catch((er) => log(er));
}

export class Screen {
  #size = Deno.consoleSize();
  #messages: unknown[][] = [];
  header: unknown[] = [];

  log(...logs: unknown[]) {
    this.#messages.push(logs);
    this.render();
    // log(...args);
  }

  updateHeader(...vals: unknown[]) {
    this.header = [];
    this.header.push(...vals);
    this.render();
  }

  render() {
    console.clear();

    for (const line of this.header) {
      log(line);
    }

    log("\n-----------\n");

    for (const message of this.#messages.slice(-10)) {
      log(...message);
    }
  }
}

export class Neyecli {
  activity: Map<number, DeviceActivity> = new Map();
  devices: NetworkDevice[] = [];
  screen = new Screen();
  msg: Messenger;

  constructor(private hostUrl: string) {
    this.screen.updateHeader("<(o)>\n");

    setInterval(() => this.updateData(), 60000);

    this.msg = new Messenger(`ws://${this.hostUrl}`);

    this.msg.update((data: unknown) => {
      const update = data as {
        type: "device-activity-update";
        message: DeviceActivity;
      };

      if (update.type === "device-activity-update") {
        this.activity.set(update.message.deviceID, update.message);
        this.updateData();

        const device = this.devices.find(
          (d) => d.id === update.message.deviceID,
        );

        if (!update.message.gone) {
          const active = Math.round((Date.now() - update.message.seen) / 60000);

          this.screen.log(
            time(),
            `${device?.host.replace(".home", "")} ${
              active > 1 ? `is active for ${active}m` : "just connected"
            }`,
          );
        } else {
          const m = Math.round(
            (update.message.gone - update.message.seen) / 60000,
          );

          const timeActive = `${m > 60 ? m / 60 : m}${m > 60 ? "h" : "m"}`;

          this.screen.log(
            time(),
            `${
              device?.host.replace(".home", "")
            } is gone, was active for ${timeActive}`,
          );
        }
      } else {
        this.screen.log(data);
      }
    });

    this.loadDevices().then((devs) => {
      this.updateData();

      devs.forEach((dev) => {
        const id = dev.id;

        if (id) {
          getDeviceActivity(this.hostUrl, id).then((act) => {
            this.activity.set(id, act);
            this.updateData();
          });
        }
      });
      /* this.screen.updateHeader(
        "<(o)>\n\n",
        devs.map((d) => d.host).join(", "),
        "\n",
      ); */
    });
  }

  updateData() {
    const parseDevice = ({ host, id, vendor }: NetworkDevice) => {
      const niceName = host.replace(".home", "") +
        (!vendor.includes("Unknown") ? ` (${vendor.trim()})` : "");
      const act = id && this.activity.get(id);
      const seen: string = act ? parseTime(Date.now() - act.seen) : "";
      const gone: number = act ? act.gone : 0;

      return `\n${gone ? "-" : "*"} ${niceName} ${
        act
          ? (gone
            ? "last seen " + parseTime(Date.now() - gone) + " ago"
            : "active for " + seen)
          : "No activity"
      }`;
    };

    const parsedDevices = this.devices.map(parseDevice);

    this.screen.updateHeader(
      ...[
        "\n-- connected --",
        ...parsedDevices.filter((d) => d.startsWith("\n*")),
        "\n-- gone --",
        ...parsedDevices.filter((d) => d.startsWith("\n-")),
      ],
    );
  }

  async loadDevices() {
    return this.devices = await getDevices(this.hostUrl);
  }
}

new Neyecli("localhost:9430");

export function parseTime(timestamp: number): string {
  let value = timestamp;
  let unit = "ms";

  if (value > 1000) {
    value /= 1000;
    unit = "s";

    if (value > 60) {
      value /= 60;
      unit = "m";

      if (value > 60) {
        value /= 60;
        unit = "h";

        if (value > 24) {
          value /= 24;
          unit = "d";
        }
      }
    } else {
      return "just now";
    }
  }

  return Math.round(value) + unit;
}
