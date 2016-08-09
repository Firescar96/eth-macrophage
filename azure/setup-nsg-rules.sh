#!/bin/bash

: ${1?"Usage: $0 <macrophage-number>"}

MACROPHAGE_NUM=$1
RESOURCE_GROUP_NAME="eth-macrophage"
NSG_NAME="macrophage"$MACROPHAGE_NUM"-nsg"


set -x
while read line;
do
  args=($line)
  RULE_NAME="${args[0]}"
  PROTOCOL=${args[1]}
  DIRECTION="${args[2]}"
  PRIORITY="${args[3]}"
  SOURCE_ADDRESS="${args[4]}"
  DEST_ADDRESS="${args[5]}"
  DEST_PORT="${args[6]}"
  ACTION="${args[7]}"

  azure network nsg rule create \
  --resource-group "${RESOURCE_GROUP_NAME}" \
  --nsg-name "${NSG_NAME}" \
  --name "${RULE_NAME}" \
  --access "${ACTION}" \
  --protocol ${PROTOCOL} \
  --direction "${DIRECTION}" \
  --priority "${PRIORITY}" \
  --source-address-prefix ${SOURCE_ADDRESS} \
  --source-port-range \* \
  --destination-address-prefix "${DEST_ADDRESS}" \
  --destination-port-range "${DEST_PORT}" || true
done < ./macrophage-nsg.rules