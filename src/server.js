import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';

dotenv.config();

const prisma = new PrismaClient();

// Email configuration
const emailUser = process.env.EMAIL_USER?.trim();
const emailPass = process.env.EMAIL_PASS?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim() || emailUser;
const adminCcEmail = process.env.ADMIN_MAIL2?.trim() || process.env.ADMIN_EMAIL2?.trim();

const transporter = emailUser && emailPass ? nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
}) : null;

if (!transporter) {
  console.warn('Email notifications disabled: EMAIL_USER/EMAIL_PASS missing');
}

async function sendEmail(mailOptions, emailType) {
  if (!transporter) {
    console.warn(`${emailType} skipped: mail transporter is not configured`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`${emailType} sent successfully`);
  } catch (error) {
    console.error(`Error sending ${emailType}:`, error);
  }
}

// Send login notification email
async function sendLoginEmail(username, ipAddress) {
  if (!adminEmail) {
    console.warn('Login notification skipped: ADMIN_EMAIL and EMAIL_USER are both missing');
    return;
  }

  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  const mailOptions = {
    from: emailUser,
    to: adminEmail,
    ...(adminCcEmail ? { cc: adminCcEmail } : {}),
    subject: 'Admin Login Alert - IEM BSH Website',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Admin Login Notification</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          An admin login was detected on your IEM BSH Department website.
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #4b5563;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Timestamp:</strong> ${timestamp}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>IP Address:</strong> ${ipAddress}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          If this wasn't you, please change your password immediately and contact the system administrator.
        </p>
      </div>
    `
  };

  await sendEmail(mailOptions, 'Login notification email');
}
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS === '*') ? true : process.env.CORS_ORIGINS.split(','),
  credentials: true
}));
app.use(express.json());
app.use('/puppeteer_assets', express.static(path.join(process.cwd(), '../puppeteer_assets')));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ========================
// PUBLIC API ROUTES
// ========================

// Health Check
app.get('/api', (req, res) => {
  res.json({ message: 'IEM BSH Department API', version: '1.0.0' });
});

// Department
app.get('/api/department', async (req, res) => {
  try {
    const department = await prisma.department.findFirst();
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Faculty
app.get('/api/faculty', async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/faculty/:id', async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accreditation
app.get('/api/accreditation', async (req, res) => {
  try {
    const accreditations = await prisma.accreditation.findMany();
    res.json(accreditations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advisory Board Members
app.get('/api/advisory-board', async (req, res) => {
  try {
    const members = await prisma.advisoryBoardMember.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// BoS Meetings
app.get('/api/bos-meetings', async (req, res) => {
  try {
    const meetings = await prisma.boSMeeting.findMany({
      orderBy: { meetingNumber: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Syllabi
app.get('/api/syllabi', async (req, res) => {
  try {
    const { year, category } = req.query;
    const where = {};
    if (year) where.year = year;
    if (category) where.category = category;

    const syllabi = await prisma.syllabus.findMany({ where });
    res.json(syllabi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Program Outcomes
app.get('/api/program-outcomes', async (req, res) => {
  try {
    const outcomes = await prisma.programOutcome.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.json(outcomes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Facilities
app.get('/api/facilities', async (req, res) => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notices
app.get('/api/notices', async (req, res) => {
  try {
    const { active } = req.query;
    const where = active === 'true' ? { isActive: true } : {};

    const notices = await prisma.notice.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Events
app.get('/api/events', async (req, res) => {
  try {
    const { category, year } = req.query;
    const where = {};
    if (category) where.category = category;
    if (year) where.year = year;

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Journals
app.get('/api/journals', async (req, res) => {
  try {
    const journals = await prisma.journal.findMany();
    res.json(journals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Conferences
app.get('/api/conferences', async (req, res) => {
  try {
    const conferences = await prisma.conference.findMany();
    res.json(conferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clubs
app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany();
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publications
app.get('/api/publications', async (req, res) => {
  try {
    const { type, year } = req.query;
    const where = {};
    if (type) where.publicationType = type;
    if (year) where.year = year;

    const publications = await prisma.publication.findMany({
      where,
      orderBy: { year: 'desc' }
    });
    res.json(publications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funded Projects
app.get('/api/funded-projects', async (req, res) => {
  try {
    const projects = await prisma.fundedProject.findMany();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patents
app.get('/api/patents', async (req, res) => {
  try {
    const patents = await prisma.patent.findMany();
    res.json(patents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Research Supervisors
app.get('/api/research-supervisors', async (req, res) => {
  try {
    const supervisors = await prisma.researchSupervisor.findMany({
      include: { phdStudents: true }
    });
    res.json(supervisors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PhD Students
app.get('/api/phd-students', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const students = await prisma.phdStudent.findMany({
      where,
      include: { supervisor: true }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MoUs
app.get('/api/mous', async (req, res) => {
  try {
    const mous = await prisma.moU.findMany();
    res.json(mous);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Consultancies
app.get('/api/consultancies', async (req, res) => {
  try {
    const consultancies = await prisma.consultancy.findMany();
    res.json(consultancies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Awards
app.get('/api/awards', async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const awards = await prisma.award.findMany({ where });
    res.json(awards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gallery
app.get('/api/gallery', async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact Info
app.get('/api/contact', async (req, res) => {
  try {
    const contact = await prisma.contactInfo.findFirst();
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// CONTACT REQUEST ENDPOINTS
// ========================

// Create contact request (Public)
app.post('/api/contact-requests', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    const contactRequest = await prisma.contactRequest.create({
      data: {
        name,
        email,
        subject: subject || 'No Subject',
        message,
        isRead: false
      }
    });
    
    res.status(201).json({ 
      message: 'Message sent successfully',
      contactRequest 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all contact requests (Admin only)
app.get('/api/contact-requests', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    
    if (status === 'unread') {
      where.isRead = false;
    } else if (status === 'read') {
      where.isRead = true;
    }
    
    const contactRequests = await prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(contactRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark contact request as read (Admin only)
app.patch('/api/contact-requests/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contactRequest = await prisma.contactRequest.update({
      where: { id: parseInt(id) },
      data: { isRead: true }
    });
    
    res.json({ 
      message: 'Marked as read',
      contactRequest 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact request (Admin only)
app.delete('/api/contact-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.contactRequest.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// BATCH DATA ENDPOINTS - Single DB Query Optimization
// ========================

// Essential Data - All critical data in ONE call
app.get('/api/batch/essential', async (req, res) => {
  try {
    const [
      department,
      faculty,
      events,
      notices,
      facilities,
      contact
    ] = await Promise.all([
      prisma.department.findFirst(),
      prisma.faculty.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.event.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.notice.findMany({ where: { isActive: true }, orderBy: { date: 'desc' } }),
      prisma.facility.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.contactInfo.findFirst()
    ]);

    res.json({
      department,
      faculty,
      events,
      notices,
      facilities,
      contact
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optional Data - Secondary data in ONE call
app.get('/api/batch/optional', async (req, res) => {
  try {
    const [
      accreditations,
      advisoryBoard,
      bosMeetings,
      syllabi,
      programOutcomes,
      journals,
      conferences,
      clubs,
      publications,
      fundedProjects,
      patents,
      researchSupervisors,
      phdStudents,
      mous,
      consultancies,
      awards,
      gallery
    ] = await Promise.all([
      prisma.accreditation.findMany(),
      prisma.advisoryBoardMember.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.boSMeeting.findMany({ orderBy: { meetingNumber: 'desc' } }),
      prisma.syllabus.findMany(),
      prisma.programOutcome.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.journal.findMany(),
      prisma.conference.findMany(),
      prisma.club.findMany(),
      prisma.publication.findMany({ orderBy: { year: 'desc' } }),
      prisma.fundedProject.findMany(),
      prisma.patent.findMany(),
      prisma.researchSupervisor.findMany({ include: { phdStudents: true } }),
      prisma.phdStudent.findMany({ include: { supervisor: true } }),
      prisma.moU.findMany(),
      prisma.consultancy.findMany(),
      prisma.award.findMany(),
      prisma.galleryImage.findMany({ orderBy: { date: 'desc' } })
    ]);

    res.json({
      accreditations,
      advisoryBoard,
      bosMeetings,
      syllabi,
      programOutcomes,
      journals,
      conferences,
      clubs,
      publications,
      fundedProjects,
      patents,
      researchSupervisors,
      phdStudents,
      mous,
      consultancies,
      awards,
      gallery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public Popup Route - Get Active Popup
app.get('/api/popup/active', async (req, res) => {
  try {
    const now = new Date();
    const popup = await prisma.popup.findFirst({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      }
    });
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// AUTH ROUTES
// ========================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` }
    );

    // Send login notification email
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await sendLoginEmail(admin.username, ipAddress);

    res.json({ token, username: admin.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password Route (Protected)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    // Get admin from database
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password length
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash: newPasswordHash }
    });

    // Send email notification
    if (!adminEmail) {
      console.warn('Password change email skipped: ADMIN_EMAIL and EMAIL_USER are both missing');
      return res.json({ message: 'Password changed successfully' });
    }

    const mailOptions = {
      from: emailUser,
      to: adminEmail,
      ...(adminCcEmail ? { cc: adminCcEmail } : {}),
      subject: 'Password Changed - IEM BSH Website',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Password Change Notification</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your admin password has been successfully changed.
          </p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #4b5563;"><strong>Username:</strong> ${admin.username}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' })}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            If you did not make this change, please contact the system administrator immediately.
          </p>
        </div>
      `
    };

    await sendEmail(mailOptions, 'Password change email');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// PROTECTED ADMIN ROUTES
// ========================

// ========================
// FILE UPLOAD
// ========================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), '../puppeteer_assets');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'upload-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

app.post('/api/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `puppeteer_assets/${req.file.filename}` });
});

// Helper function to create CRUD routes
const createCrudRoutes = (modelName, prismaModel, options = {}) => {
  const basePath = options.basePath || modelName.toLowerCase();

  // Create
  app.post(`/api/admin/${basePath}`, authenticateToken, async (req, res) => {
    try {
      const item = await prismaModel.create({ data: req.body });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update
  app.put(`/api/admin/${basePath}/:id`, authenticateToken, async (req, res) => {
    try {
      const item = await prismaModel.update({
        where: { id: parseInt(req.params.id) },
        data: req.body
      });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete
  app.delete(`/api/admin/${basePath}/:id`, authenticateToken, async (req, res) => {
    try {
      await prismaModel.delete({
        where: { id: parseInt(req.params.id) }
      });
      res.json({ message: `${modelName} deleted` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

// Create CRUD routes for all models
createCrudRoutes('Faculty', prisma.faculty, { basePath: 'faculty' });
createCrudRoutes('Notice', prisma.notice, { basePath: 'notices' });
createCrudRoutes('Event', prisma.event, { basePath: 'events' });
createCrudRoutes('Award', prisma.award, { basePath: 'awards' });
createCrudRoutes('GalleryImage', prisma.galleryImage, { basePath: 'gallery' });
createCrudRoutes('Journal', prisma.journal, { basePath: 'journals' });
createCrudRoutes('Conference', prisma.conference, { basePath: 'conferences' });
createCrudRoutes('Club', prisma.club, { basePath: 'clubs' });
createCrudRoutes('Publication', prisma.publication, { basePath: 'publications' });
createCrudRoutes('FundedProject', prisma.fundedProject, { basePath: 'funded-projects' });
createCrudRoutes('Patent', prisma.patent, { basePath: 'patents' });
createCrudRoutes('PhdStudent', prisma.phdStudent, { basePath: 'phd-students' });
createCrudRoutes('ResearchSupervisor', prisma.researchSupervisor, { basePath: 'research-supervisors' });
createCrudRoutes('MoU', prisma.moU, { basePath: 'mous' });
createCrudRoutes('Consultancy', prisma.consultancy, { basePath: 'consultancies' });
createCrudRoutes('Syllabus', prisma.syllabus, { basePath: 'syllabi' });
createCrudRoutes('ProgramOutcome', prisma.programOutcome, { basePath: 'program-outcomes' });
createCrudRoutes('Facility', prisma.facility, { basePath: 'facilities' });
createCrudRoutes('AdvisoryBoardMember', prisma.advisoryBoardMember, { basePath: 'advisory-board' });
createCrudRoutes('Accreditation', prisma.accreditation, { basePath: 'accreditation' });
createCrudRoutes('BoSMeeting', prisma.boSMeeting, { basePath: 'bos-meetings' });

// Department - Update only
app.put('/api/admin/department/:id', authenticateToken, async (req, res) => {
  try {
    const department = await prisma.department.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact Info - Update only
app.put('/api/admin/contact/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await prisma.contactInfo.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// POPUP ADMIN ROUTES
// ========================

// Get all popups
app.get('/api/admin/popups', authenticateToken, async (req, res) => {
  try {
    const popups = await prisma.popup.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(popups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create popup
app.post('/api/admin/popups', authenticateToken, async (req, res) => {
  try {
    // If new popup is active, deactivate all others
    if (req.body.isActive) {
      await prisma.popup.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const popup = await prisma.popup.create({ data: req.body });
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update popup
app.put('/api/admin/popups/:id', authenticateToken, async (req, res) => {
  try {
    // If updating to active, deactivate all others
    if (req.body.isActive) {
      await prisma.popup.updateMany({
        where: {
          isActive: true,
          id: { not: parseInt(req.params.id) }
        },
        data: { isActive: false }
      });
    }

    const popup = await prisma.popup.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete popup
app.delete('/api/admin/popups/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.popup.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Popup deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate popup
app.post('/api/admin/popups/:id/activate', authenticateToken, async (req, res) => {
  try {
    // Deactivate all other popups first
    await prisma.popup.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const popup = await prisma.popup.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: true }
    });
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate popup
app.post('/api/admin/popups/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const popup = await prisma.popup.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// DASHBOARD STATS
// ========================

app.get('/api/admin/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [faculty, notices, events, awards, gallery, publications] = await Promise.all([
      prisma.faculty.count(),
      prisma.notice.count(),
      prisma.event.count(),
      prisma.award.count(),
      prisma.galleryImage.count(),
      prisma.publication.count()
    ]);

    res.json({ faculty, notices, events, awards, gallery, publications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// START SERVER
// ========================

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 IEM BSH API Server running on port ${PORT}`);
  });
}

export default app;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
