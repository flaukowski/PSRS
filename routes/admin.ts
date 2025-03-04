import { Router } from 'express';
import { db } from '@db';
import { users, userRewards } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Treasury Management
router.get("/treasury", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log('Checking admin access for:', userAddress);

  const user = await db.query.users.findFirst({
    where: eq(users.address, userAddress.toLowerCase()),
  });

  console.log('Found user:', user);

  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Get reward statistics
  const rewardedUsers = await db.query.userRewards.findMany();
  const totalRewards = rewardedUsers.reduce((total, user) => {
    return total + (user.uploadRewardClaimed ? 1 : 0) +
                  (user.playlistRewardClaimed ? 2 : 0) +
                  (user.nftRewardClaimed ? 3 : 0);
  }, 0);

  // Get current GAS recipient address from environment
  const gasRecipientAddress = process.env.GAS_RECIPIENT_ADDRESS || process.env.TREASURY_ADDRESS;

  res.json({
    address: gasRecipientAddress,
    totalRewards,
    rewardedUsers: rewardedUsers.length,
  });
});

// Add a route to set up initial admin
router.post("/setup", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if any admin exists
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.isAdmin, true),
  });

  if (existingAdmin) {
    return res.status(403).json({ message: "Admin already exists" });
  }

  // Set up first admin
  const updatedUser = await db
    .update(users)
    .set({ isAdmin: true })
    .where(eq(users.address, userAddress.toLowerCase()))
    .returning();

  console.log('Created initial admin:', updatedUser);

  res.json({ success: true });
});

router.post("/gas-recipient", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;
  const { address } = req.body;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log('Checking admin access for:', userAddress);

  const user = await db.query.users.findFirst({
    where: eq(users.address, userAddress.toLowerCase()),
  });

  console.log('Found user:', user);

  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  // Update GAS recipient address in environment
  process.env.GAS_RECIPIENT_ADDRESS = address;

  res.json({ success: true });
});

export default router;
