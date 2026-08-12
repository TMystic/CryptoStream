const { expect } = require("chai");
const { ethers } = require("hardhat");

const CREDIT_PRICE = ethers.parseEther("0.001");
const CREDITS_PER_UNIT = 1000n;
const VIDEO_COST = 100n;

describe("StreamingService", function () {
  let streaming, owner, creator, buyer, other, recipient;

  beforeEach(async function () {
    [owner, creator, buyer, other, recipient] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("StreamingService");
    streaming = await factory.deploy(recipient.address);
    await streaming.waitForDeployment();
  });

  describe("constructor", function () {
    it("sets the recipient and initialises ownership", async function () {
      expect(await streaming.recipient()).to.equal(recipient.address);
      expect(await streaming.owner()).to.equal(owner.address);
    });
  });

  describe("buyCredits", function () {
    it("reverts when sending less than the minimum", async function () {
      await expect(
        streaming.connect(buyer).buyCredits({ value: ethers.parseEther("0.0009") })
      ).to.be.revertedWithCustomError(streaming, "InvalidAmount");
    });

    it("mints credits and forwards funds to the recipient", async function () {
      const amount = ethers.parseEther("0.002"); // 2 units
      await expect(() =>
        streaming.connect(buyer).buyCredits({ value: amount })
      ).to.changeEtherBalance(recipient, amount);

      const balance = await streaming.balances(buyer.address);
      expect(balance).to.equal(2n * CREDITS_PER_UNIT);
    });

    it("emits CreditsPurchased", async function () {
      const amount = CREDIT_PRICE;
      await expect(streaming.connect(buyer).buyCredits({ value: amount }))
        .to.emit(streaming, "CreditsPurchased")
        .withArgs(buyer.address, amount, CREDITS_PER_UNIT);
    });
  });

  describe("uploadVideo", function () {
    beforeEach(async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
    });

    it("registers a video and grants the uploader access", async function () {
      await streaming.connect(creator).uploadVideo("My Video", "A description");

      expect(await streaming.videoCount()).to.equal(1);

      const video = await streaming.videos(1);
      expect(video.title).to.equal("My Video");
      expect(video.description).to.equal("A description");
      expect(video.uploader).to.equal(creator.address);

      const access = await streaming.getAccessList(1);
      expect(access).to.include(creator.address);

      const owned = await streaming.getVideosByAddress(creator.address);
      expect(owned).to.deep.equal([1n]);
    });

    it("emits VideoUploaded", async function () {
      await expect(streaming.connect(creator).uploadVideo("T", "D"))
        .to.emit(streaming, "VideoUploaded")
        .withArgs(1, "T", "D", creator.address);
    });
  });

  describe("buyVideo", function () {
    beforeEach(async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      await streaming.connect(creator).uploadVideo("Tutorial", "Learn stuff");
    });

    it("reverts for a non-existent video", async function () {
      await expect(streaming.connect(buyer).buyVideo(99)).to.be.revertedWithCustomError(
        streaming,
        "VideoDoesNotExist"
      );
    });

    it("reverts when the caller already has access", async function () {
      await expect(streaming.connect(creator).buyVideo(1)).to.be.revertedWithCustomError(
        streaming,
        "AlreadyHasAccess"
      );
    });

    it("reverts with insufficient credits", async function () {
      await expect(streaming.connect(buyer).buyVideo(1)).to.be.revertedWithCustomError(
        streaming,
        "InsufficientCredits"
      );
    });

    it("spends credits and grants access", async function () {
      await streaming.connect(buyer).buyCredits({ value: CREDIT_PRICE });

      await expect(streaming.connect(buyer).buyVideo(1))
        .to.emit(streaming, "VideoPurchased")
        .withArgs(1, buyer.address);

      const balance = await streaming.balances(buyer.address);
      expect(balance).to.equal(CREDITS_PER_UNIT - VIDEO_COST);

      const access = await streaming.getAccessList(1);
      expect(access).to.include(buyer.address);

      const purchased = await streaming.getVideosByAddress(buyer.address);
      expect(purchased).to.deep.equal([1n]);
    });
  });

  describe("getVideo", function () {
    it("returns metadata only for addresses with access", async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      await streaming.connect(creator).uploadVideo("Exclusive", "Secret content");
      await streaming.connect(buyer).buyCredits({ value: CREDIT_PRICE });
      await streaming.connect(buyer).buyVideo(1);

      const video = await streaming.connect(buyer).getVideo(1);
      expect(video.title).to.equal("Exclusive");
      expect(video.description).to.equal("Secret content");

      await expect(streaming.connect(other).getVideo(1))
        .to.be.revertedWithCustomError(streaming, "AccessDenied")
        .withArgs(1, other.address);
    });

    it("reverts for a non-existent video", async function () {
      await expect(streaming.getVideo(0)).to.be.revertedWithCustomError(
        streaming,
        "VideoDoesNotExist"
      );
    });
  });

  describe("hasVideoAccess", function () {
    it("returns access without exposing the complete access list", async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      await streaming.connect(creator).uploadVideo("Exclusive", "Members only");
      expect(await streaming.hasVideoAccess(1, creator.address)).to.equal(true);
      expect(await streaming.hasVideoAccess(1, other.address)).to.equal(false);
      expect(await streaming.hasVideoAccess(999, other.address)).to.equal(false);
    });
  });

  describe("sponsored actions", function () {
    it("lets a relayer upload while charging the creator credits", async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      const nonce = await streaming.nonces(creator.address);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const digest = await streaming.uploadAuthorizationHash(
        creator.address, "Sponsored", "No user gas", nonce, deadline
      );
      const signature = await creator.signMessage(ethers.getBytes(digest));

      await expect(
        streaming.connect(other).sponsoredUploadVideo(
          creator.address, "Sponsored", "No user gas", deadline, signature
        )
      ).to.emit(streaming, "VideoUploaded").withArgs(1, "Sponsored", "No user gas", creator.address);

      expect(await streaming.balances(creator.address)).to.equal(CREDITS_PER_UNIT - VIDEO_COST);
      expect(await streaming.nonces(creator.address)).to.equal(1);
    });

    it("lets a relayer purchase while charging the buyer credits", async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      await streaming.connect(creator).uploadVideo("Paid", "Content");
      await streaming.connect(buyer).buyCredits({ value: CREDIT_PRICE });
      const nonce = await streaming.nonces(buyer.address);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const digest = await streaming.purchaseAuthorizationHash(buyer.address, 1, nonce, deadline);
      const signature = await buyer.signMessage(ethers.getBytes(digest));

      await expect(
        streaming.connect(other).sponsoredBuyVideo(buyer.address, 1, deadline, signature)
      ).to.emit(streaming, "VideoPurchased").withArgs(1, buyer.address);

      expect(await streaming.balances(buyer.address)).to.equal(CREDITS_PER_UNIT - VIDEO_COST);
      expect(await streaming.hasVideoAccess(1, buyer.address)).to.equal(true);
    });

    it("rejects an authorization replay", async function () {
      await streaming.connect(creator).buyCredits({ value: CREDIT_PRICE });
      const nonce = await streaming.nonces(creator.address);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const digest = await streaming.uploadAuthorizationHash(creator.address, "Once", "Only", nonce, deadline);
      const signature = await creator.signMessage(ethers.getBytes(digest));
      await streaming.connect(other).sponsoredUploadVideo(creator.address, "Once", "Only", deadline, signature);
      await expect(
        streaming.connect(other).sponsoredUploadVideo(creator.address, "Once", "Only", deadline, signature)
      ).to.be.revertedWithCustomError(streaming, "InvalidAuthorization");
    });
  });

  describe("ownership", function () {
    it("allows the owner to transfer ownership", async function () {
      await streaming.transferOwnership(other.address);
      expect(await streaming.owner()).to.equal(other.address);
    });

    it("prevents non-owners from transferring ownership", async function () {
      await expect(streaming.connect(buyer).transferOwnership(buyer.address)).to.be.revertedWithCustomError(
        streaming,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});
