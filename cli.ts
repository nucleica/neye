const conn = new WebSocket("ws://localhost:9430");

conn.onopen = () => {
  console.log("Connection established");
};

conn.onmessage = (event) => {
  console.log("Message from server:", event.data);
};

conn.onerror = (error) => {
  console.error("WebSocket error:", error);
};

conn.onclose = () => {
  console.log("Connection closed");
};
