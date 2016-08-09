#!/bin/bash

################################################################################
#
# We just use docker and forget about dependencies and whatsoever
#
# Remember to login first!
#
################################################################################

: ${1?"Usage: $0 <macrophage-number> <location>"}
: ${2?"Usage: $0 <macrophage-number> <location>"}

MACROPHAGE_NUM=$1
LOCATION=$2

PARAM_VM_SIZE="Standard_D2_v2"
PARAM_DISK_SIZE=90
PARAM_IMAGE_URN="credativ:Debian:8:8.0.201606280"

AZURE_CMD="azure"

$AZURE_CMD config mode arm

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

################################################################################
#
# PUBLIC IP
#
################################################################################

$AZURE_CMD network public-ip create \
    --name "macrophage"$MACROPHAGE_NUM"-pip" \
    --resource-group "eth-macrophage" \
    --location ${LOCATION} \
    --allocation-method "Dynamic" \
    --domain-name-label "macrophage"$MACROPHAGE_NUM


################################################################################
#
# NIC CARD
#
################################################################################

$AZURE_CMD network nic create \
    --name "macrophage"$MACROPHAGE_NUM"-nic" \
    --resource-group "eth-macrophage" \
    --location ${LOCATION} \
    --subnet-vnet-name "macrophage"$MACROPHAGE_NUM"-vnet" \
    --subnet-name "macrophage"$MACROPHAGE_NUM"-sn" \
    --public-ip-name "macrophage"$MACROPHAGE_NUM"-pip"

################################################################################
#
# MACHINE
#
################################################################################

$AZURE_CMD vm create \
    --name "macrophage"$MACROPHAGE_NUM"-vm" \
    --resource-group "eth-macrophage" \
    --location ${LOCATION} \
    --vnet-name "macrophage"$MACROPHAGE_NUM"-vnet" \
    --vnet-subnet-name "macrophage"$MACROPHAGE_NUM"-sn" \
    --nic-names "macrophage"$MACROPHAGE_NUM"-nic" \
    --ssh-publickey-file "$HOME/.ssh/id_rsa.pub" \
    --vm-size "$PARAM_VM_SIZE" \
    --storage-account-name "macrophage"$MACROPHAGE_NUM \
    --os-disk-vhd "macrophage"$MACROPHAGE_NUM"-vhd.vhd" \
    --os-type "Linux" \
    --admin-username "firescar96" \
    --image-urn "$PARAM_IMAGE_URN"

################################################################################
#
# RESIZE OS DISK
#
################################################################################

$AZURE_CMD vm deallocate \
    --resource-group "eth-macrophage" \
    --name "macrophage"$MACROPHAGE_NUM"-vm"

$AZURE_CMD resource set \
    --resource-group "eth-macrophage" \
    --name "macrophage"$MACROPHAGE_NUM"-vm" \
    --resource-type Microsoft.Compute/VirtualMachines \
    --properties "{ \"storageProfile\":{\"osDisk\":{\"diskSizeGB\": ${PARAM_DISK_SIZE}}}}" \
    --api-version "2015-06-15"

$AZURE_CMD vm start \
    --resource-group "eth-macrophage" \
    --name "macrophage"$MACROPHAGE_NUM"-vm"