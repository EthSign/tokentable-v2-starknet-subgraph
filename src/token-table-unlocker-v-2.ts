import { BigInt, Bytes, Felt } from "@starknet-graph/graph-ts";
import {
  Initialized as InitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PresetCreated,
  ActualCreated,
  TokensClaimed,
  TokensWithdrawn,
  ActualCancelled,
  CancelDisabled,
  HookDisabled,
  WithdrawDisabled,
  CreateDisabled,
  ClaimingDelegateSet,
} from "../generated/TTUnlocker/TTUnlocker";
import {
  Global,
  TTEvent,
  Initialized,
  TTUV2InstanceMetadata,
  Actual,
  OwnershipTransferred,
} from "../generated/schema";
import { u256ToBigInt } from "./utils";

const GLOBAL_ID = "GLOBAL_ID";
const METADATA_ID = "METADATA_ID";

function getProjectId(): string {
  return Global.load(GLOBAL_ID)!.projectId!;
}

function getAndIncrementGlobalCounter(): Bytes {
  let entity = Global.load(GLOBAL_ID);
  if (entity === null) {
    entity = new Global(GLOBAL_ID);
    entity.counter = 0;
  }
  entity.counter++;
  entity.save();
  return Bytes.fromI32(entity.counter);
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  const previousOwner = event.data[0]; // ContractAddress
  const newOwner = event.data[1]; // ContractAddress

  let entity = new OwnershipTransferred(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.previousOwner = previousOwner;
  entity.newOwner = newOwner;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleInitialized(event: InitializedEvent): void {
  const projectId = event.data[0]; // felt252

  let entity = new Initialized(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.projectId = projectId;
  entity.save();

  let metadata = new TTUV2InstanceMetadata(METADATA_ID);
  metadata.totalAmountClaimed = BigInt.fromI32(0);
  metadata.totalActualCancelledEventCount = 0;
  metadata.totalActualCreatedEventCount = 0;
  metadata.totalPresetCreatedEventCount = 0;
  metadata.totalTokensClaimedEventCount = 0;
  metadata.totalTokensWithdrawnEventCount = 0;
  metadata.totalClaimingDelegateSetEventCount = 0;
  metadata.totalCancelDisabledEventCount = 0;
  metadata.save();

  let global = Global.load(GLOBAL_ID)!;
  global.projectId = projectId.toString();
  global.save();
}

export function handlePresetCreated(event: PresetCreated): void {
  const from = event.data[0]; // ContractAddress
  const presetId = event.data[1].toHexString(); // felt252
  const recipientId = changetype<Felt>(event.data[2]).intoBigInt(); // u64

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "PresetCreated";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.presetId = presetId;
  entity.transactionHash = event.transaction.hash;
  entity.recipientId = recipientId;
  entity.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalPresetCreatedEventCount++;
  metadata.save();
}

export function handleActualCreated(event: ActualCreated): void {
  const from = event.data[0]; // ContractAddress
  const presetId = event.data[1].toHexString(); // felt252
  const actualId = u256ToBigInt(event.data[2], event.data[3]); // u256
  const recipient = event.data[4]; // ContractAddress
  const startTimestampAbsolute = changetype<Felt>(event.data[5]).intoBigInt(); // u64
  const amountSkipped = u256ToBigInt(event.data[6], event.data[7]); // u256
  const totalAmount = u256ToBigInt(event.data[8], event.data[9]); // u256
  const recipientId = changetype<Felt>(event.data[10]).intoBigInt(); // u64
  const batchId = changetype<Felt>(event.data[11]).intoBigInt(); // u64

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "ActualCreated";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.presetId = presetId;
  entity.actualId = actualId;
  entity.recipient = recipient;
  entity.recipientId = recipientId;
  entity.batchId = batchId;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let actual = new Actual(actualId.toHexString());
  actual.canceled = false;
  actual.presetId = presetId;
  actual.startTimestampAbsolute = startTimestampAbsolute;
  actual.amountClaimed = amountSkipped;
  actual.totalAmount = totalAmount;
  actual.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalActualCreatedEventCount++;
  metadata.save();
}

export function handleTokensClaimed(event: TokensClaimed): void {
  const actualId = u256ToBigInt(event.data[0], event.data[1]); // u256
  const caller = event.data[2]; // ContractAddress
  const to = event.data[3]; // ContractAddress
  const amount = u256ToBigInt(event.data[4], event.data[5]); // u256
  const feesCharged = u256ToBigInt(event.data[6], event.data[7]); // u256
  const recipientId = changetype<Felt>(event.data[8]).intoBigInt(); // u64

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "TokensClaimed";
  entity.from = caller;
  entity.timestamp = event.block.timestamp;
  entity.actualId = actualId;
  entity.caller = caller;
  entity.to = to;
  entity.amount = amount;
  entity.feesCharged = feesCharged;
  entity.transactionHash = event.transaction.hash;
  entity.recipientId = recipientId;
  entity.save();

  let actual = Actual.load(actualId.toHexString())!;
  actual.amountClaimed = actual.amountClaimed.plus(amount);
  actual.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalAmountClaimed = metadata.totalAmountClaimed.plus(amount);
  metadata.totalTokensClaimedEventCount++;
  metadata.save();
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  const by = event.data[0]; // ContractAddress
  const amount = u256ToBigInt(event.data[1], event.data[2]); // u256

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "TokensWithdrawn";
  entity.from = by;
  entity.by = by;
  entity.timestamp = event.block.timestamp;
  entity.amount = amount;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalTokensWithdrawnEventCount++;
  metadata.save();
}

export function handleActualCancelled(event: ActualCancelled): void {
  const from = event.data[0]; // ContractAddress
  const actualId = u256ToBigInt(event.data[1], event.data[2]); // u256
  const pendingAmountClaimable = u256ToBigInt(event.data[3], event.data[4]); // u256
  const didWipeClaimableBalance = event.data[5]; // bool
  const recipientId = changetype<Felt>(event.data[6]).intoBigInt(); // u64

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "ActualCancelled";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.actualId = actualId;
  entity.pendingAmountClaimable = pendingAmountClaimable;
  entity.didWipeClaimableBalance = didWipeClaimableBalance.toI32() == 1;
  entity.recipientId = recipientId;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let actual = Actual.load(actualId.toHexString())!;
  actual.canceled = true;
  actual.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalActualCancelledEventCount++;
  metadata.save();
}

export function handleCancelDisabled(event: CancelDisabled): void {
  const from = event.data[0]; // ContractAddress

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "CancelDisabled";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalCancelDisabledEventCount++;
  metadata.save();
}

export function handleHookDisabled(event: HookDisabled): void {
  const from = event.data[0]; // ContractAddress

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "HookDisabled";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleWithdrawDisabled(event: WithdrawDisabled): void {
  const from = event.data[0]; // ContractAddress

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "WithdrawDisabled";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleCreateDisabled(event: CreateDisabled): void {
  const from = event.data[0]; // ContractAddress

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "CreateDisabled";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleClaimingDelegateSet(event: ClaimingDelegateSet): void {
  const from = event.data[0]; // ContractAddress
  const delegate = event.data[1]; // ContractAddress

  let entity = new TTEvent(
    getAndIncrementGlobalCounter().concat(event.transaction.hash)
  );
  entity.projectId = getProjectId();
  entity.event = "ClaimingDelegateSet";
  entity.from = from;
  entity.timestamp = event.block.timestamp;
  entity.delegate = delegate;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let metadata = TTUV2InstanceMetadata.load(METADATA_ID)!;
  metadata.totalClaimingDelegateSetEventCount++;
  metadata.save();
}
