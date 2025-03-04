import { Router } from 'express';
import { db } from '@db';
import { users, songs, userRewards } from '@db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.get("/register", async (req, res) => {
  try {
    const address = req.headers['x-wallet-address'] as string;

    if (!address) {
      return res.status(400).json({ 
        success: false,
        message: "Wallet address is required" 
      });
    }

    console.log('Checking registration for address:', address);

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.address, address.toLowerCase()))
      .limit(1);

    let user;

    if (existingUser.length > 0) {
      // Update last seen for returning user
      const [updatedUser] = await db
        .update(users)
        .set({ lastSeen: new Date() })
        .where(eq(users.address, address.toLowerCase()))
        .returning();
      user = updatedUser;
      console.log('Updated existing user:', user);
    } else {
      // Create new user
      const [newUser] = await db.insert(users)
        .values({ 
          address: address.toLowerCase(),
          lastSeen: new Date()
        })
        .returning();
      user = newUser;
      console.log('Created new user:', user);
    }

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    // Get global recent songs instead of user-specific
    const recentSongs = await db.query.songs.findMany({
      orderBy: desc(songs.createdAt),
      limit: 100,
    });

    console.log('Retrieved recent songs:', recentSongs.length);

    const response = {
      success: true,
      user,
      recentSongs
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error: any) {
    console.error('Error in user registration:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to register user", 
      error: error.message 
    });
  }
});

// User rewards tracking
router.post("/rewards/claim", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;
  const { type } = req.body;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Get or create user rewards
  let [userReward] = await db.query.userRewards.findMany({
    where: eq(userRewards.address, userAddress),
  });

  if (!userReward) {
    [userReward] = await db.insert(userRewards)
      .values({ address: userAddress })
      .returning();
  }

  // Check if reward already claimed
  const rewardField = `${type}RewardClaimed` as keyof typeof userReward;
  if (userReward[rewardField]) {
    return res.status(400).json({ message: "Reward already claimed" });
  }

  // Update reward status
  await db.update(userRewards)
    .set({ [rewardField]: true })
    .where(eq(userRewards.address, userAddress));

  res.json({ success: true });
});

export default router;
