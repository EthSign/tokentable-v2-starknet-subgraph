import { BigInt, Bytes, Felt } from "@starknet-graph/graph-ts";

export function u256ToBigInt(lower: Bytes, upper: Bytes): BigInt {
  return changetype<Felt>(upper)
    .intoBigInt()
    .leftShift(128)
    .bitOr(changetype<Felt>(lower).intoBigInt());
}
