#!/bin/bash
# detailed_scan.sh
# This script performs a detailed scan on a single target IP address to gather more information.
# It requires the target IP as its first argument.

# Check if an IP address was provided.
if [ -z "$1" ]; then
  echo "Usage: $0 <ip_address>"
  exit 1
fi

IP_ADDRESS=$1

echo "--- Starting detailed scan for $IP_ADDRESS ---"
# We use nmap with sudo for more advanced scanning capabilities.
#
# -sV: Probe open ports to determine service/version info.
# -O:  Enable OS detection. This is one of the most powerful features of nmap.
# -A:  Enable OS detection, version detection, script scanning, and traceroute. It's a comprehensive option.
# --osscan-guess: Guess OS more aggressively. Useful when detection is difficult.
#
# This scan can take a few minutes to complete.
sudo nmap -A --osscan-guess "$IP_ADDRESS"
echo "--- Detailed scan for $IP_ADDRESS complete ---"
