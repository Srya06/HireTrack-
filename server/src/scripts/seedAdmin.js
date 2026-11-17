import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/user.model.js';
import { ROLES, USER_STATUSES } from '../utils/constants.js';
import { env } from '../config/env.js';

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hiretrack.edu').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@HireTrack2026!';
    const adminName = process.env.ADMIN_NAME || 'Placement Admin';

    console.log(`[Seed] Checking for existing admin: ${adminEmail}`);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`[Seed] Admin already exists with email: ${adminEmail} (Role: ${existingAdmin.role})`);
      await disconnectDB();
      process.exit(0);
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });

    console.log(`[Seed] Admin user created successfully:`);
    console.log(`       ID:    ${adminUser._id}`);
    console.log(`       Email: ${adminUser.email}`);
    console.log(`       Role:  ${adminUser.role}`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding admin:', error);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
};

seedAdmin();
