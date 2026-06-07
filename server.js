require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./src/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

function fileToGenerativePart(base64Str) {
  if (!base64Str) return null;
  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      inlineData: {
        data: matches[2],
        mimeType: `image/${matches[1]}`
      },
    };
  } else {
    return {
      inlineData: {
        data: base64Str,
        mimeType: "image/jpeg"
      }
    };
  }
}

async function verifyImageWithGemini(base64Image, category) {
  if (!genAI) {
    console.warn('[AI VERIFICATION] GEMINI_API_KEY not configured in environment. Bypassing image verification.');
    return true;
  }
  if (!base64Image) {
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const imagePart = fileToGenerativePart(base64Image);
    if (!imagePart) return false;
    
    let prompt = '';
    if (category && category.includes('Drain')) {
      prompt = 'Does this image show a blocked drain, stagnant water, or street flooding? Answer only YES or NO.';
    } else {
      prompt = 'Does this image show a full dustbin, a pile of garbage, or litter/waste on the street? Answer only YES or NO.';
    }

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim().toUpperCase();
    console.log(`[AI VERIFICATION] Category: ${category}, Gemini response:`, text);

    return text.includes('YES');
  } catch (error) {
    console.error('[AI VERIFICATION] Gemini Vision verification failed, bypassing to fail-safe:', error);
    return true;
  }
}

// Enable CORS and JSON parsing (limit increased for base64 image uploads)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints

// 1. Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await db.getTickets();
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 2. Submit a new ticket (original)
app.post('/api/tickets', async (req, res) => {
  try {
    const { category, latitude, longitude, image, reporterId } = req.body;
    
    if (!category || !latitude || !longitude || !reporterId) {
      return res.status(400).json({ success: false, error: 'Missing required parameters.' });
    }

    // AI Verification Check
    const isImageValid = await verifyImageWithGemini(image, category);
    if (!isImageValid) {
      const errorMsg = category.includes('Drain')
        ? 'Image verification failed. Please capture a clear photo showing a blocked drain or stagnant water.'
        : 'Image verification failed. Please capture a clear photo showing a full dustbin or garbage pile.';
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const ticket = await db.createTicket({
      category,
      latitude,
      longitude,
      image,
      reporterId
    });

    if (ticket.duplicate) {
      res.status(200).json({ success: true, duplicate: true, data: ticket.ticket });
    } else {
      res.status(201).json({ success: true, data: ticket });
    }
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 2b. Submit a new ticket (new path)
app.post('/api/tickets/new', async (req, res) => {
  try {
    const { category, latitude, longitude, image, reporterId } = req.body;
    
    if (!category || !latitude || !longitude || !reporterId) {
      return res.status(400).json({ success: false, error: 'Missing required parameters.' });
    }

    // AI Verification Check
    const isImageValid = await verifyImageWithGemini(image, category);
    if (!isImageValid) {
      const errorMsg = category.includes('Drain')
        ? 'Image verification failed. Please capture a clear photo showing a blocked drain or stagnant water.'
        : 'Image verification failed. Please capture a clear photo showing a full dustbin or garbage pile.';
      return res.status(400).json({ success: false, error: errorMsg });
    }

    const ticket = await db.createTicket({
      category,
      latitude,
      longitude,
      image,
      reporterId
    });

    if (ticket.duplicate) {
      res.status(200).json({ success: true, duplicate: true, data: ticket.ticket });
    } else {
      res.status(201).json({ success: true, data: ticket });
    }
  } catch (error) {
    console.error('Error creating ticket via new endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 3. Resolve ticket and grant 50 Civic Points to the reporter (original)
app.put('/api/tickets/:id/resolve', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const result = await db.updateTicketVerification(ticketId, 'Valid & Resolved');
    res.json({ 
      success: true, 
      message: `Ticket ${ticketId} resolved successfully.`,
      pointsAwarded: result.pointsAwarded,
      reporterId: result.reporterId
    });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

// 3b. Verify ticket status - admin verification logic (new path)
app.post('/api/tickets/update-status', async (req, res) => {
  try {
    const { ticketId, status, resolvedImage } = req.body; // status is 'Valid & Resolved' or 'Fake/Spam Report'
    if (!ticketId || !status) {
      return res.status(400).json({ success: false, error: 'Missing ticketId or status.' });
    }

    const result = await db.updateTicketVerification(ticketId, status, resolvedImage);
    res.json({
      success: true,
      message: `Ticket status updated to ${result.status}.`,
      pointsAwarded: result.pointsAwarded,
      reporterId: result.reporterId
    });
  } catch (error) {
    console.error('Error updating ticket verification status:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});


// 4. Create or Get user profile
app.post('/api/users', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    let user = await db.getUser(id);
    if (!user) {
      user = await db.createUser(id, name);
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4b. Update user profile details
app.post('/api/users/update', async (req, res) => {
  try {
    const { id, name, phone, email } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const updatedUser = await db.updateUser(id, updateData);
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4c. Get all users/citizens
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4d. Delete user/citizen
app.delete('/api/users/:id', async (req, res) => {
  try {
    const success = await db.deleteUser(req.params.id);
    if (success) {
      res.json({ success: true, message: 'User deleted successfully.' });
    } else {
      res.status(404).json({ success: false, error: 'User not found.' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4e. Clear all demo/test users
app.post('/api/users/clear-demos', async (req, res) => {
  try {
    const count = await db.clearDemoUsers();
    res.json({ success: true, message: `Cleared ${count} demo citizens successfully.`, count });
  } catch (error) {
    console.error('Error clearing demo users:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 3c. Clear all resolved and spam/rejected tickets
app.post('/api/tickets/clear-processed', async (req, res) => {
  try {
    const count = await db.clearProcessedTickets();
    res.json({ success: true, message: `Cleared ${count} processed tickets successfully.`, count });
  } catch (error) {
    console.error('Error clearing processed tickets:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 5. Get specific user profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 6. Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db.getLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Swachh Palle server running on port ${PORT}`);
  console.log(` - Villager App: http://localhost:${PORT}/villager/index.html`);
  console.log(` - Admin Grid:   http://localhost:${PORT}/admin/dashboard.html`);
  console.log(`==================================================`);
});
