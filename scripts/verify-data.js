
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Testing connection to DATABASE_URL...');
    console.log(`URL: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')}`); // Mask password

    try {
        await prisma.$connect();
        console.log('Connected successfully!');

        // Query Department table
        console.log('\n--- Department ---');
        const departments = await prisma.department.findMany();
        console.log(`Found ${departments.length} departments.`);
        if (departments.length > 0) {
            console.log('Sample Department:', departments[0].name);
        }

        // Query Faculty table
        console.log('\n--- Faculty ---');
        const faculty = await prisma.faculty.findMany({ take: 3 });
        console.log(`Found ${faculty.length} faculty members (showing up to 3).`);
        faculty.forEach(f => console.log(`- ${f.name} (${f.designation})`));

        // Query Facilities table
        console.log('\n--- Facilities ---');
        const facilities = await prisma.facility.findMany({ take: 3 });
        console.log(`Found ${facilities.length} facilities (showing up to 3).`);
        facilities.forEach(f => console.log(`- ${f.name}`));

        // Query Admin table
        console.log('\n--- Admin ---');
        const accounts = await prisma.admin.findMany();
        console.log(`Found ${accounts.length} admin accounts.`);
        accounts.forEach(a => console.log(`- Username: ${a.username}`));

    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
