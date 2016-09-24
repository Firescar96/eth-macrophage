#!/bin/bash

: ${1?"Usage: $0 <macrophage-number> <location>"}
: ${2?"Usage: $0 <macrophage-number> <location>"}

MACROPHAGE_NUM=$1
LOCATION=$2
VNET_PREFIX=10.254

AZURE_CMD="azure"
# CREATE RESOURCE GROUP
#  azure group create --name eth-macrophage --location ${LOCATION} || true

# Setup Virtual Network
  azure network vnet create --resource-group eth-macrophage --name macrophage${MACROPHAGE_NUM}-vnet -l ${LOCATION} -a ${VNET_PREFIX}.0.0/16 || true

# Setup Network Security Groups
  azure network nsg create --resource-group eth-macrophage --name macrophage${MACROPHAGE_NUM}-nsg --location ${LOCATION} || true

# Setup Subnet
  azure network vnet subnet create --resource-group eth-macrophage --vnet-name macrophage${MACROPHAGE_NUM}-vnet -a ${VNET_PREFIX}.${MACROPHAGE_NUM}.0/24 -o macrophage${MACROPHAGE_NUM}-nsg macrophage${MACROPHAGE_NUM}-sn || true@wanderer: