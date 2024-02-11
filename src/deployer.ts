import { TokenTableSuiteDeployed as TokenTableSuiteDeployedEvent } from "../generated/TTDeployer/TTDeployer";
import { TokenTableSuiteDeployed } from "../generated/schema";

export function handleTokenTableSuiteDeployed(
  event: TokenTableSuiteDeployedEvent
): void {
  let entity = new TokenTableSuiteDeployed(event.data[1]); // projectId
  entity.from = event.data[0];
  entity.projectToken = event.data[2];
  entity.unlocker = event.data[3];
  entity.futureToken = event.data[4];
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
