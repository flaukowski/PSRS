pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/mimcsponge.circom";
include "circomlib/gates.circom";

// Neo-specific signals for dimensional portal
template NeoDimensionalPortal() {
    // Public inputs
    signal input portalTimestamp;
    signal input dimensionId;
    signal input publicAddress;
    signal input neoFSObjectId;
    signal input neoFSContainerId;

    // Private inputs
    signal private input userPrivateKey;
    signal private input harmonicAlignment;
    signal private input entropyFactor;
    signal private input dimensionalNonce;
    signal private input neoFSBearerToken;

    // Neo-specific signals
    signal private input neoFSStorageGroup;
    signal private input neoFSDataSize;
    signal private input neoFSRepFactor;

    // Outputs
    signal output portalSignature;
    signal output validityProof;
    signal output harmonicProof;
    signal output neoFSAccessProof;

    // Neo storage proof computation
    component neoProof = MiMCSponge(5);
    neoProof.ins[0] <== neoFSObjectId;
    neoProof.ins[1] <== neoFSContainerId;
    neoProof.ins[2] <== neoFSStorageGroup;
    neoProof.ins[3] <== neoFSDataSize;
    neoProof.ins[4] <== neoFSRepFactor;
    neoProof.k <== neoFSBearerToken;

    // Compute dimensional alignment score
    component mimcAlignment = MiMCSponge(2);
    mimcAlignment.ins[0] <== harmonicAlignment;
    mimcAlignment.ins[1] <== entropyFactor;
    mimcAlignment.k <== dimensionalNonce;

    // Generate portal signature using Poseidon hash
    component portalHash = Poseidon(7);
    portalHash.inputs[0] <== portalTimestamp;
    portalHash.inputs[1] <== dimensionId;
    portalHash.inputs[2] <== publicAddress;
    portalHash.inputs[3] <== userPrivateKey;
    portalHash.inputs[4] <== mimcAlignment.outs[0];
    portalHash.inputs[5] <== neoProof.outs[0];
    portalHash.inputs[6] <== neoFSObjectId;

    // Assign outputs
    portalSignature <== portalHash.out;
    validityProof <== portalHash.out;
    harmonicProof <== mimcAlignment.outs[0];
    neoFSAccessProof <== neoProof.outs[0];
}

component main = NeoDimensionalPortal();