const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying StreamingService with account: ${deployer.address}`);

  const recipient = process.env.RECIPIENT_ADDRESS || deployer.address;

  const StreamingService = await ethers.getContractFactory("StreamingService");
  const contract = await StreamingService.deploy(recipient);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`StreamingService deployed to: ${address}`);
  console.log(`Recipient (funds destination): ${recipient}`);
  console.log(`\nSet VITE_CONTRACT_ADDRESS=${address} in .env to point the frontend at it.`);

  return address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
