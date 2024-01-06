const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let escrow, realEstate, seller, inspector, lender;

  beforeEach(async () => {
    // Fake 20 metamask account
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    // Deploy Real Estate
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();

    /**
     * Mint
     * the mint function is creating a new token on the "RealEstate" contract,
     * and the ownership of the minted token is assigned to the "seller" address.
     * The associated metadata for the token is stored on IPFS.
     */
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    // This line waits for the transaction to be mined and confirmed on the Ethereum blockchain
    await transaction.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );

    /**
     * Approve property
     * the approve function is commonly used in the context of the ERC-721 or ERC-20 token standards.
     * It is used to grant another address the permission to transfer a
     * specified amount of tokens on behalf of the owner.
     *
     * The "Escrow" contract has the permission to transfer 1 token from the "realEstate" contract
     * after approved from the seller
     */
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();

    /**
     * List property
     * the list function allows the "seller" to list an NFT for sale through the "Escrow" contract.
     * The buyer's address is part of the listing information, but it doesn't imply that a
     * specific buyer has already made the transaction.
     */
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe("Deployment", () => {
    it("Returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("Returns seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });

    it("Returns inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });

    it("Returns lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("listing", () => {
    it("Updates as lisetd", async () => {
      // isListed is a variable in sol, it is a function in test to call it
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });

    it("Updates ownership", async () => {
      const result = await realEstate.ownerOf(1);
      expect(result).to.be.equal(escrow.address);
    });

    it("Return buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });

    it("Return purchase price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });

    it("Return escrrow amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("deposits", () => {
    it("Updates contract balance", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("inspection", () => {
    it("Updates inspection status", async () => {
      const transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();
      const result = await escrow.inspectionPassed(1);
      expect(result).to.be.equal(true);
    });
  });

  describe("Approval", () => {
    it("Updates approval status", async () => {
      const buyerTransaction = await escrow.connect(buyer).approveSale(1);
      const sellTransaction = await escrow.connect(seller).approveSale(1);
      const lenderTransaction = await escrow.connect(lender).approveSale(1);

      await buyerTransaction.wait();
      await sellTransaction.wait();
      await lenderTransaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("Sale", async () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      transaction = await escrow.connect(seller).finalizeSale(1);
      await transaction.wait();
    });

    it("Updates ownership", async () => {
      //  ownerOf is a standard function defined in the ERC-721 interface
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });

    it("Updates balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
