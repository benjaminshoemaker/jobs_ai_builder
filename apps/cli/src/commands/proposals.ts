import type { Command } from "commander";

import {
  decideProposal,
  getProposal,
  listProposals,
  type ProposalDecision,
} from "../../../../packages/core/src/index.js";

export function registerProposalsCommand(program: Command): void {
  const proposals = program.command("proposals").description("Review proposed logic changes");

  proposals
    .command("list")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (options: { dataDir: string }) => {
      const records = await listProposals(options.dataDir);
      if (records.length === 0) {
        console.log("No proposals found.");
        return;
      }
      for (const proposal of records) {
        console.log(`${proposal.id}\t${proposal.status}\t${proposal.kind}\t${proposal.summary}`);
      }
    });

  proposals
    .command("show <id>")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (id: string, options: { dataDir: string }) => {
      const proposal = await getProposal(options.dataDir, id);
      console.log(`${proposal.id}: ${proposal.summary}`);
      console.log(`Status: ${proposal.status}`);
      console.log(`Kind: ${proposal.kind}`);
      console.log(`Targets: ${proposal.targets.map((target) => `${target.type}:${target.id}`).join(", ")}`);
      console.log(`Evidence: ${proposal.evidence.join("; ")}`);
      console.log(`Proposed change: ${JSON.stringify(proposal.proposedChange)}`);
    });

  for (const decision of ["approve", "reject", "defer"] as const) {
    proposals
      .command(`${decision} <id>`)
      .option("--data-dir <dir>", "runtime data directory", "data")
      .action(async (id: string, options: { dataDir: string }) => {
        const proposal = await decideProposal(options.dataDir, id, decisionToStatus(decision), new Date().toISOString());
        console.log(`${proposal.id} ${proposal.status}.`);
      });
  }
}

function decisionToStatus(decision: "approve" | "reject" | "defer"): ProposalDecision {
  if (decision === "approve") return "approved";
  if (decision === "reject") return "rejected";
  return "deferred";
}
