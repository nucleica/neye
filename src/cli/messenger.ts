import { log } from "node:console";

export class Messenger {
  private conn!: WebSocket;
  #reconnectWaitTime = .4;

  pass: ((data: unknown) => void)[] = [];

  constructor(private url: string) {
    this.connect();
  }

  update(send: (data: unknown) => void) {
    this.pass.push(send);
  }

  connect() {
    const conn = new WebSocket(this.url);
    this.attach(conn);
    this.conn = conn;
    return conn;
  }

  attach(conn: WebSocket) {
    conn.onopen = () => {
      this.#reconnectWaitTime = .4;
      log("Connection established");
    };

    conn.onmessage = (event: MessageEvent<string>) => {
      try {
        const json = JSON.parse(event.data);
        if (typeof json.type === "string") {
          if (json.type.includes("socket-")) {
            // nothing
          } else {
            this.pass.forEach((send) => send(json));
          }
        } else {
          log(json);
        }
      } catch (err) {
        log(event.data);
      }
    };

    conn.onerror = (error) => {
      if (
        "message" in error &&
        !["Unexpected EOF", "os error 111"].some((ms) =>
          error.message.includes(ms)
        )
      ) {
        console.error("Network eye internal error");
        log(error.message);
      }
    };

    conn.onclose = () => {
      log(
        `Network eye unavailable, trying to reconnect in ${this.#reconnectWaitTime}s...`,
      );

      this.#reconnectWaitTime *= 2;

      setTimeout(() => {
        this.connect();
      }, 1000 * this.#reconnectWaitTime);
    };
  }
}
