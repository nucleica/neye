export function myIP(): string {
  const ints = Deno.networkInterfaces().filter((i) =>
    i.mac !== "00:00:00:00:00:00" && i.mac !== "00:00:00:00:00:00:00"
  );

  const ipv4 = ints.filter((i) => i.family === "IPv4");

  if (ipv4.length > 1) {
    console.log(
      "Multiple IPv4 addresses found, using the first one:",
      ipv4[0].address,
    );
    return ipv4[0].address;
  } else if (ipv4.length > 0) {
    return ipv4[0].address;
  } else {
    throw new Error("No network interfaces found");
  }
}

export function networkIP() {
  const addr = myIP();
  return addr;
}
