import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.faculty.deleteMany();
  await prisma.facility.deleteMany();

  // Seed facilities with images
  const facilitiesData = [
    {
      name: "ICT Enabled Classrooms",
      description: "State-of-the-art classrooms equipped with modern ICT facilities for interactive learning",
      icon: "Monitor",
      images: ["puppeteer_assets/facilities_2.jpg", "puppeteer_assets/facilities_3.jpg", "puppeteer_assets/facilities_4.jpg"],
      orderIndex: 1
    },
    {
      name: "24 X 7 Library",
      description: "Round-the-clock library access with extensive collection of books, journals and digital resources",
      icon: "BookOpen",
      images: ["puppeteer_assets/facilities_5.jpg", "puppeteer_assets/facilities_7.jpg", "puppeteer_assets/facilities_10.jpg", "puppeteer_assets/facilities_11.jpg", "puppeteer_assets/facilities_12.jpg", "puppeteer_assets/facilities_19.jpg"],
      orderIndex: 2
    },
    {
      name: "Physics Lab",
      description: "Well-equipped physics laboratory for practical experiments and research",
      icon: "Atom",
      images: ["puppeteer_assets/facilities_20.jpg", "puppeteer_assets/facilities_23.jpg", "puppeteer_assets/facilities_24.jpg", "puppeteer_assets/facilities_25.jpg", "puppeteer_assets/facilities_27.jpg", "puppeteer_assets/facilities_29.jpg", "puppeteer_assets/facilities_30.jpg", "puppeteer_assets/facilities_31.jpg"],
      orderIndex: 3
    },
    {
      name: "Chemistry Lab",
      description: "Modern chemistry laboratory with latest equipment and safety measures",
      icon: "FlaskConical",
      images: ["puppeteer_assets/facilities_32.jpg", "puppeteer_assets/facilities_35.jpg", "puppeteer_assets/facilities_40.jpg"],
      orderIndex: 4
    },
    {
      name: "Language Lab",
      description: "Advanced language laboratory for communication skills development",
      icon: "Languages",
      images: ["puppeteer_assets/facilities_41.jpg", "puppeteer_assets/facilities_45.jpg", "puppeteer_assets/facilities_51.jpg", "puppeteer_assets/facilities_54.jpg"],
      orderIndex: 5
    },
    {
      name: "Computer Lab",
      description: "High-end computing facility with latest software and hardware",
      icon: "Laptop",
      images: ["puppeteer_assets/home_6.jpg", "puppeteer_assets/home_7.jpg", "puppeteer_assets/home_8.jpg"],
      orderIndex: 6
    },
    {
      name: "Sports Room",
      description: "Indoor sports facility for students' physical fitness",
      icon: "Trophy",
      images: ["puppeteer_assets/home_9.jpg", "puppeteer_assets/home_10.jpg", "puppeteer_assets/home_11.jpg", "puppeteer_assets/home_12.jpg", "puppeteer_assets/home_13.jpg", "puppeteer_assets/home_14.jpg"],
      orderIndex: 7
    },
    {
      name: "Gymnasium",
      description: "Fully equipped gymnasium for fitness and wellness",
      icon: "Dumbbell",
      images: ["puppeteer_assets/home_15.jpg", "puppeteer_assets/home_16.jpg", "puppeteer_assets/home_17.jpg", "puppeteer_assets/home_18.jpg", "puppeteer_assets/home_19.jpg", "puppeteer_assets/home_20.jpg", "puppeteer_assets/home_21.jpg"],
      orderIndex: 8
    },
    {
      name: "Innovation Lab",
      description: "Dedicated space for innovation and entrepreneurship activities",
      icon: "Lightbulb",
      images: ["puppeteer_assets/home_22.jpg", "puppeteer_assets/home_23.jpg", "puppeteer_assets/photo-gallery_2.jpg", "puppeteer_assets/photo-gallery_3.jpg", "puppeteer_assets/photo-gallery_4.jpg", "puppeteer_assets/photo-gallery_5.jpg"],
      orderIndex: 9
    },
    {
      name: "Engineering Drawing Lab",
      description: "Laboratory for engineering drawing and graphics",
      icon: "PenTool",
      images: ["puppeteer_assets/photo-gallery_6.jpg", "puppeteer_assets/photo-gallery_7.jpg", "puppeteer_assets/photo-gallery_8.jpg", "puppeteer_assets/photo-gallery_9.jpg"],
      orderIndex: 10
    },
    {
      name: "Basic Electrical Lab",
      description: "Laboratory for basic electrical engineering experiments",
      icon: "Zap",
      images: ["puppeteer_assets/photo-gallery_10.jpg", "puppeteer_assets/photo-gallery_11.jpg", "puppeteer_assets/photo-gallery_12.jpg", "puppeteer_assets/photo-gallery_13.jpg"],
      orderIndex: 11
    },
    {
      name: "Workshop",
      description: "Hands-on workshop facility for practical training",
      icon: "Wrench",
      images: ["puppeteer_assets/photo-gallery_14.jpg", "puppeteer_assets/photo-gallery_15.jpg", "puppeteer_assets/photo-gallery_16.jpg"],
      orderIndex: 12
    }
  ];

  for (const facility of facilitiesData) {
    await prisma.facility.create({
      data: facility
    });
  }

  // Seed faculty data
  const facultyData = [
    {
      name: "Prof. Dr. Prabir Kumar Das",
      designation: "Associate Professor and Head of the Department",
      qualification: "Ph.D",
      experience: "21 years",
      researchArea: "Nanoscience",
      email: "prabir.das@iem.edu.in",
      imageUrl: "https://lh3.googleusercontent.com/sitesv/AAzXCkeMX72wlDCEW7vRHPKsOtP3o1lD5iVYX7bsaLcAUBrQEBls1gEk2LquVk3sEKghYfK7VUZpEBqIqsymeTMA8eUaHK7B-NfusnmIqifSa6zy6ZlyUbRRyfCqchi-ePdtnI7QOzOFNY4-JEOWKyD9TgAU9t7j6YAlHE-iyPJ6qTznw2arbaLlRrG5ajNpSuuUKy-bJ9EkPsntgBzLPqy9qMHm4-lOY0L1inXwtAg=w1280",
      isHod: true,
      orderIndex: 1
    },
    {
      name: "Prof. Dr. Samapika Das Biswas",
      designation: "Associate Professor and Assistant Head of the Department",
      qualification: "Ph.D",
      experience: "17 years",
      researchArea: "Psychology, Communicating English",
      email: "samapika.dasbiswas@iem.edu.in",
      imageUrl: "puppeteer_assets/samapika.jpg",
      orderIndex: 2
    },
    {
      name: "Prof. Dr. Tina De (Basu)",
      designation: "Associate Professor and Assistant Head of the Department",
      qualification: "Ph.D",
      experience: "10 years",
      researchArea: "Material Science, inorganic synthesis, environmental toxicity",
      email: "tina.de@iem.edu.in",
      imageUrl: "puppeteer_assets/tina.jpg",
      orderIndex: 3
    },
    {
      name: "Prof. Dr. Kamakhya Prasad Ghatak",
      designation: "Senior Professor and Research Director",
      qualification: "D. Engg (First Recipient from J.U. in 1991)",
      experience: "43 years",
      researchArea: "Nanotechnology",
      email: "kamakhyaghatakcu@gmail.com",
      imageUrl: "puppeteer_assets/Kamakhya.jpg",
      orderIndex: 4
    },
    {
      name: "Prof. Arun Kumar Chatterjee",
      designation: "Assistant Professor and Proctor",
      qualification: "B.Tech",
      experience: "39 years",
      researchArea: "",
      email: "arun.chatterjee@iem.edu.in",
      imageUrl: "puppeteer_assets/Arun.jpg",
      orderIndex: 5
    },
    {
      name: "Prof. Dr. Saswati Barman",
      designation: "Research Professor",
      qualification: "Ph.D",
      experience: "28 years",
      researchArea: "Condensed Matter Physics, Micromagnetic simulation, Magnetism, Semiconductors",
      email: "saswati.barman@iem.edu.in",
      imageUrl: "puppeteer_assets/Saswati.jpg",
      orderIndex: 6
    },
    {
      name: "Prof. Dr. Sharmistha Ghosh",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "22 years",
      researchArea: "Computational Fluid Dynamics, Fuzzy Database",
      email: "sharmistha.ghosh@iem.edu.in",
      imageUrl: "puppeteer_assets/Sharmistha.jpg",
      orderIndex: 7
    },
    {
      name: "Prof. Dr. Biswadip Basu Mallik",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "23 years",
      researchArea: "Computational Fluid Dynamics, Mathematical Modelling, Optimization, Data Science, Machine Learning",
      email: "biswadip.basumallik@iem.edu.in",
      imageUrl: "puppeteer_assets/Biswadip.jpg",
      orderIndex: 8
    },
    {
      name: "Prof. Dr. Pratap Mukherjee",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "18 years",
      researchArea: "Conducting Polymer, Nano Bio Composites, Environmental Pollution, Heavy Metal's Toxicity",
      email: "pratap.mukherjee@iem.edu.in",
      imageUrl: "puppeteer_assets/Pratap.jpg",
      orderIndex: 9
    },
    {
      name: "Prof. Dr. Ruchira Mukherjee",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "15 years",
      researchArea: "Structural Biology and bioinformatics",
      email: "ruchira.mukherjee@iem.edu.in",
      imageUrl: "puppeteer_assets/Ruchira.jpg",
      orderIndex: 10
    },
    {
      name: "Prof. Riya Barui",
      designation: "Assistant Professor",
      qualification: "M.A. (English), Ph.D (Registered)",
      experience: "6 years",
      researchArea: "English Literature - Challenges of Learning English as a Second Language(ESL), Post-War Literature, Shakespeare's contribution to English Literature, Post-Colonial Studies",
      email: "riya.barui@iem.edu.in",
      imageUrl: "puppeteer_assets/Riya.jpg",
      orderIndex: 11
    },
    {
      name: "Prof. Dr. Kakoli Dutta",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "7 years",
      researchArea: "Biosensors, material science, electrochemistry",
      email: "kakoli.dutta@iem.edu.in",
      imageUrl: "puppeteer_assets/Kakoli.jpg",
      orderIndex: 12
    },
    {
      name: "Prof. Dr. Subarna Datta",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "2 years",
      researchArea: "Experimental and theoretical condensed matter physics and material science",
      email: "subarna.datta@iem.edu.in",
      imageUrl: "puppeteer_assets/Subarna.jpg",
      orderIndex: 13
    },
    {
      name: "Prof. Dr. Soumyadipta Pal",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "9 years",
      researchArea: "Condensed Matter Physics and Material Science",
      email: "soumyadipta.pal@iem.edu.in",
      imageUrl: "puppeteer_assets/Soumyadipta.jpg",
      orderIndex: 14
    },
    {
      name: "Prof. Santanu Das",
      designation: "Assistant Professor",
      qualification: "M.Sc. (Mathematics), Ph.D (Registered)",
      experience: "9 years",
      researchArea: "Cosmology and Dynamical system analysis",
      email: "santanu.das@iem.edu.in",
      imageUrl: "puppeteer_assets/Santanu.jpg",
      orderIndex: 15
    },
    {
      name: "Prof. Dr. Arnab Basu",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "8 years",
      researchArea: "Theoretical Condensed Matter Physics",
      email: "arnab.basu@iem.edu.in",
      imageUrl: "puppeteer_assets/Arnab.jpg",
      orderIndex: 16
    },
    {
      name: "Prof. Dr. Ranabir Banik",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "5 years",
      researchArea: "Nuclear Structure Physics, Gamma Ray Spectroscopy, Semiconductor detectors",
      email: "ranabir.banik@iem.edu.in",
      imageUrl: "puppeteer_assets/ranabir.jpg",
      orderIndex: 17
    },
    {
      name: "Prof. Dr. Chandan Adhikari",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "5 years",
      researchArea: "Application of Nanomaterials for Environmental and Biomedical applications",
      email: "chandan.adhikari@iem.edu.in",
      imageUrl: "puppeteer_assets/Chandan.jpg",
      orderIndex: 18
    },
    {
      name: "Prof. Dr. Subhamoy Banerjee",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "3 years",
      researchArea: "Bioinformatics, Nanotechnology",
      email: "subhamoy.banerjee@iem.edu.in",
      imageUrl: "puppeteer_assets/Subhamoy.jpg",
      orderIndex: 19
    },
    {
      name: "Prof. Dr. Anubhab Ray",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "3 years",
      researchArea: "Banach space geometry, Functional analysis",
      email: "anubhab.ray@iem.edu.in",
      imageUrl: "puppeteer_assets/Anubhab.jpg",
      orderIndex: 20
    },
    {
      name: "Prof. Dr. Jeet Sen",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "3 years",
      researchArea: "Banach space geometry, functional analysis",
      email: "jeet.sen@iem.edu.in",
      imageUrl: "puppeteer_assets/jeet.jpg",
      orderIndex: 21
    },
    {
      name: "Prof. Dr. Animesh Kundu",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "3 years",
      researchArea: "Synthetic Inorganic Chemistry and Catalysis",
      email: "animesh.kundu@iem.edu.in",
      imageUrl: "puppeteer_assets/Animesh.jpg",
      orderIndex: 22
    },
    {
      name: "Prof. Dr. Satavisha Dey",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "10 years",
      researchArea: "Complex and Bicomplex analysis, algebra",
      email: "satavisha.dey@iem.edu.in",
      imageUrl: "puppeteer_assets/Satavisha.jpg",
      orderIndex: 23
    },
    {
      name: "Prof. Mrittika Ghosh",
      designation: "Assistant Professor",
      qualification: "M.Phil, Ph.D (Registered)",
      experience: "11 years",
      researchArea: "Literature and Language Studies",
      email: "mrittika.ghosh@iem.edu.in",
      imageUrl: "puppeteer_assets/Mrittika.jpg",
      orderIndex: 24
    },
    {
      name: "Prof. Dr. Emona Datta",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "4 years",
      researchArea: "Advanced CMOS device and circuit, RRAM",
      email: "emona.datta@iem.edu.in",
      imageUrl: "puppeteer_assets/Emona.jpg",
      orderIndex: 25
    },
    {
      name: "Prof. Susmita Bhakat",
      designation: "Assistant Professor",
      qualification: "M.A, B.Ed, Ph.D (Registered)",
      experience: "11 years",
      researchArea: "Post-Modern Literature, Indian Scriptures and Religious Texts, Women's studies, Gender Studies",
      email: "susmita.bhakat@iem.edu.in",
      imageUrl: "puppeteer_assets/Susmita.jpg",
      orderIndex: 26
    },
    {
      name: "Prof. Dr. Bonani Chakrabarty",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "7 years",
      researchArea: "Performance Studies, Indian Writing in English, Post-Colonial Literature, Linguistics and Language Studies",
      email: "bonani.chakrabarty@iem.edu.in",
      imageUrl: "puppeteer_assets/Bonani.jpg",
      orderIndex: 27
    },
    {
      name: "Prof. Deboleena Chakraborty",
      designation: "Assistant Professor",
      qualification: "M.A, M.Phil",
      experience: "3 years",
      researchArea: "Performance Studies, Marginality Studies, Linguistics, 19th Century Bengal, Religious Studies, Translation studies",
      email: "deboleena.chakraborty@iem.edu.in",
      imageUrl: "puppeteer_assets/Deboleena.jpg",
      orderIndex: 28
    },
    {
      name: "Mr. Abhijit Kargupta",
      designation: "Senior Scientific Assistant",
      qualification: "M.Sc., Ph.D (Registered)",
      experience: "22 years",
      researchArea: "Development of Graphene based nanostructures for application in food quality control",
      email: "abhijit.kargupta@iem.edu.in",
      imageUrl: "puppeteer_assets/Abhijit.jpg",
      orderIndex: 29
    },
    {
      name: "Prof. Dibakar Roy Choudhury",
      designation: "Assistant Professor, Faculty Head, IIC and IEDC",
      qualification: "M.Sc. (Biochemistry), Ph.D (Registered)",
      experience: "6 years",
      researchArea: "Bioinformatics",
      email: "dibakar.roychoudhury@iem.edu.in",
      imageUrl: "puppeteer_assets/Dibakar.jpg",
      orderIndex: 30
    },
    {
      name: "Prof. Dr. Debasmita Bhattacharya",
      designation: "Professor",
      qualification: "Ph.D",
      experience: "15 years",
      researchArea: "Stem Cells, Mitochondrial Biology, Muscle Physiology, Cellular and Molecular Biology, Exercise Physiology, Microbiology",
      email: "debasmita.bhattacharya@iem.edu.in",
      imageUrl: "puppeteer_assets/Debasmita.jpg",
      orderIndex: 31
    },
    {
      name: "Prof. Dr. Ayan Paul",
      designation: "Assistant Professor",
      qualification: "Ph.D",
      experience: "2 years",
      researchArea: "Statistical Ecology",
      email: "ayan.paul@iem.edu.in",
      imageUrl: "puppeteer_assets/Ayan.jpg",
      orderIndex: 32
    },
    {
      name: "Prof. Dr. Swarup Bhowmik",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "2 years",
      researchArea: "Geometric Group Theory",
      email: "Swarup.Bhowmik@iem.edu.in",
      imageUrl: "https://lh3.googleusercontent.com/sitesv/AAzXCkeOxnYUv_cw_VA3-zPaprM9hN0ucdVGQX4WtcFgHaMy8ipBDvPNWu584oz12wkOLIfb0q1LtL4Tq6L43GIKEgjEwpQ76BbTWw1KD_eHR4WHbd8Dvd98GKXe4Pj0jWMOsnhlHoaEBVjprpDWv_Cbtx1SDWCjBYC4F5fDALHV0b2lEwxrkQNf5zHaBGZi3BqYVn9DDs3K3ppfoeWulWFDe8cVYpyjq3LDDHJ-91w=w1280",
      orderIndex: 33
    },
    {
      name: "Prof. Dr. Saikat Chakraborty",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "7 years",
      researchArea: "Nuclear Physics",
      email: "saikat@iem.edu.in",
      imageUrl: "https://lh3.googleusercontent.com/sitesv/AAzXCkdF_BzkkBijLdjKLKv4nTU1qrlp6nX7xlkgrD6flhzpT4YSsEFrsGdWuHCf6Bhz831mEvhXeqPhtMNJ15Am-cZRIk2KTK8YYFhPMUGtvsw-JRT8EyAsDYKGiUb0X3z5lemaE0nMKZPfXNNpSE9yC-zqv9JGy_8Xgx57kz9V4mSQRX5yf6oBNSkcOnnx4R4ix8_c5EuIPxC5GToLqlttnJlEOaVR6KAUHttG=w1280",
      orderIndex: 34
    },
    {
      name: "Prof. Dr. Anjali Rai",
      designation: "Associate Professor",
      qualification: "Ph.D",
      experience: "2 years",
      researchArea: "VLSI circuit testing, Nanoelectronics, Quantum Dots, Solar Cells",
      email: "anjali.rai@iem.edu.in",
      imageUrl: "puppeteer_assets/Anjali.jpg",
      orderIndex: 35
    }
  ];

  for (const faculty of facultyData) {
    await prisma.faculty.create({
      data: faculty
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
