#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <subnet>"
  echo "Example: $0 192.168.1.0/24"
  exit 1
fi

SUBNET=$1

# -sn: Ping Scan - disables port scanning. This makes it much faster.
# -PR: ARP Ping - This is very effective for discovering hosts on a local Ethernet network.
#      It's often more reliable than ICMP pings, especially for devices that block them (like iPhones).
# -T4: Aggressive timing template. Makes the scan faster.

sudo nmap -sn -PR -PE -T3 "$SUBNET" | awk '
  # This block is executed when a line contains "Nmap scan report for".
  /Nmap scan report for/ {
    # Store the IP address. If the line contains a hostname in parentheses, store that too.
    # Otherwise, set the hostname to "(No hostname)".
    ip = $5;
    if ($6) {
      host = $5;
      ip = $6;
    } else {
      host = "(No hostname)";
    }
  }
  # This block is executed when a line contains "MAC Address:".
  /MAC Address:/ {
    # Extract the MAC address (field 3) and the vendor (the rest of the line).
    mac = $3;
    vendor = "";
    for (i=4; i<=NF; i++) {
      vendor = vendor " " $i;
    }

    gsub(/[()]/, "", vendor);
    gsub(/[()]/, "", ip);

    print "{ \"ip\": \"" ip "\", \"host\": \"" host "\", \"mac\": \"" mac "\", \"vendor\": \"" vendor "\" }";
  }
'
