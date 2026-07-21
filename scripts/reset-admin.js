import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
    const username = process.argv[2] || process.env.ADMIN_USERNAME;
    const password = process.argv[3] || process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        console.error('Usage: node scripts/reset-admin.js <username> <password>');
        console.error('(or set ADMIN_USERNAME / ADMIN_PASSWORD in .env)');
        process.exit(1);
    }
    if (password.length < 6) {
        console.error('Password must be at least 6 characters long.');
        process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.upsert({
        where: { username },
        update: { passwordHash },
        create: { username, passwordHash }
    });

    console.log(`Admin credentials set for "${admin.username}" (id ${admin.id}).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
