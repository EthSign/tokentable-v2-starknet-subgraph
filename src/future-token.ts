import { BigInt, log } from "@starknet-graph/graph-ts";
import { Transfer } from "../generated/TTFutureToken/TTFutureToken";
import { TTEvent, TokenTableUser } from "../generated/schema";
import { u256ToBigInt } from "./utils";

function findIndexWithMatching(actualId: BigInt, actualIds: BigInt[]): i32 {
  for (let i = 0; i < actualIds.length; i++) {
    if (actualIds[i] == actualId) {
      return i;
    }
  }
  return -1;
}

export function handleTransfer(event: Transfer): void {
  const from = event.data[0];
  const to = event.data[1];
  const actualId = u256ToBigInt(event.data[2], event.data[3]);
  if (from.toI32() != 0) {
    let fromUser = TokenTableUser.load(from)!;
    const indexToRemoveFromFrom = findIndexWithMatching(
      actualId,
      fromUser.actualIds!
    );
    let fromActualIds = fromUser.actualIds!;
    fromActualIds.splice(indexToRemoveFromFrom, 1);
    fromUser.actualIds = fromActualIds;
    fromUser.save();
  }
  let toUser = TokenTableUser.load(to);
  if (toUser == null) {
    toUser = new TokenTableUser(to);
    toUser.actualIds = [actualId];
  } else {
    let actualIds = toUser.actualIds!;
    actualIds.push(actualId);
    toUser.actualIds = actualIds;
  }
  toUser.save();

  let entity = new TTEvent(event.data[1]);
  entity.event = "FutureTokenTransferred";
  entity.from = from;
  entity.to = to;
  entity.actualId = actualId;
  entity.timestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
