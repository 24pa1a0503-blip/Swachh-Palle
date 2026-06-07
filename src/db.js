const fs = require('fs');
const path = require('path');
const { db, bucket, isFirebaseEnabled } = require('./firebase');

const LOCAL_DB_PATH = path.join(__dirname, '..', 'local_db.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for Local JSON Database
function readLocalDB() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    // Initial empty db
    const initialData = { tickets: [], users: [] };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local JSON db:', err);
    return { tickets: [], users: [] };
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing local JSON db:', err);
  }
}

// Save image helper (returns URL/path)
async function saveImage(ticketId, base64Image) {
  if (!base64Image) return '';

  // Extract content and extension
  const matches = base64Image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer;

  if (matches && matches.length === 3) {
    ext = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // Attempt to parse raw base64 if not in URI format
    try {
      buffer = Buffer.from(base64Image, 'base64');
    } catch (e) {
      console.error('Invalid image format');
      return '';
    }
  }

  const filename = `${ticketId}.${ext}`;

  if (isFirebaseEnabled && bucket) {
    try {
      const file = bucket.file(`tickets/${filename}`);
      await file.save(buffer, {
        metadata: { contentType: `image/${ext}` },
        public: true
      });
      // Return public URL or signed URL. For simplicity, standard public URL:
      return `https://storage.googleapis.com/${bucket.name}/tickets/${filename}`;
    } catch (error) {
      console.error('Firebase Storage upload failed, falling back to local file. Error:', error);
    }
  }

  // Local storage fallback
  const localFilePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(localFilePath, buffer);
  return `/uploads/${filename}`;
}

// Database API functions
async function getTickets() {
  if (isFirebaseEnabled && db) {
    const snapshot = await db.collection('tickets').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const data = readLocalDB();
    // Sort tickets descending by createdAt
    return [...data.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function getTicketById(id) {
  if (isFirebaseEnabled && db) {
    const doc = await db.collection('tickets').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } else {
    const data = readLocalDB();
    return data.tickets.find(t => t.id === id) || null;
  }
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function createTicket(ticketData) {
  let nextNumber = 1001;
  const data = readLocalDB();
  const inputLat = parseFloat(ticketData.latitude) || 16.5062;
  const inputLng = parseFloat(ticketData.longitude) || 80.6480;
  const category = ticketData.category || '🗑️ Full Dustbin';
  const reporterId = ticketData.reporterId || 'anonymous';

  // 1. Search for existing pending duplicate of same category within 50 meters
  let duplicateTicket = null;
  if (isFirebaseEnabled && db) {
    try {
      const snapshot = await db.collection('tickets')
        .where('status', '==', 'Pending')
        .where('category', '==', category)
        .get();
      for (const doc of snapshot.docs) {
        const t = doc.data();
        const dist = getDistanceMeters(inputLat, inputLng, t.latitude, t.longitude);
        if (dist <= 50) {
          duplicateTicket = { id: doc.id, ...t };
          break;
        }
      }
    } catch (err) {
      console.error('Error querying duplicate tickets in Firestore:', err);
    }
  } else {
    for (const t of data.tickets) {
      if (t.status === 'Pending' && t.category === category) {
        const dist = getDistanceMeters(inputLat, inputLng, t.latitude, t.longitude);
        if (dist <= 50) {
          duplicateTicket = t;
          break;
        }
      }
    }
  }

  // 2. If duplicate exists, record as upvote and do not create new ticket
  if (duplicateTicket) {
    let upvotes = duplicateTicket.upvotes || [];
    if (!upvotes.includes(reporterId) && duplicateTicket.reporterId !== reporterId) {
      upvotes.push(reporterId);
    }

    if (isFirebaseEnabled && db) {
      await db.collection('tickets').doc(duplicateTicket.id).update({ upvotes });
    } else {
      duplicateTicket.upvotes = upvotes;
      writeLocalDB(data);
    }

    return {
      duplicate: true,
      ticket: { ...duplicateTicket, upvotes }
    };
  }

  // 3. Generate new ID if not a duplicate
  if (isFirebaseEnabled && db) {
    try {
      const snapshot = await db.collection('tickets').get();
      let maxNum = 1000;
      snapshot.docs.forEach(doc => {
        const match = doc.id.match(/^SP-(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      });
      nextNumber = maxNum + 1;
    } catch (e) {
      console.error('Error fetching tickets for ID generation, falling back to local count:', e);
      nextNumber = data.tickets.length + 1001;
    }
  } else {
    let maxNum = 1000;
    data.tickets.forEach(t => {
      const match = t.id.match(/^SP-(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    nextNumber = maxNum + 1;
  }
  
  const ticketId = `SP-${nextNumber}`;

  // Process image if any
  let imageUrl = '';
  if (ticketData.image) {
    imageUrl = await saveImage(ticketId, ticketData.image);
  }

  const newTicket = {
    id: ticketId,
    category: category,
    latitude: inputLat,
    longitude: inputLng,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    reporterId: reporterId,
    imageUrl: imageUrl,
    upvotes: []
  };

  if (isFirebaseEnabled && db) {
    await db.collection('tickets').doc(ticketId).set({
      category: newTicket.category,
      latitude: newTicket.latitude,
      longitude: newTicket.longitude,
      status: newTicket.status,
      createdAt: newTicket.createdAt,
      reporterId: newTicket.reporterId,
      imageUrl: newTicket.imageUrl,
      upvotes: newTicket.upvotes
    });
    return newTicket;
  } else {
    data.tickets.push(newTicket);
    writeLocalDB(data);
    return newTicket;
  }
}

async function updateTicketStatus(id, status, resolvedImageUrl) {
  if (isFirebaseEnabled && db) {
    const updateData = { status };
    if (resolvedImageUrl) updateData.resolvedImageUrl = resolvedImageUrl;
    await db.collection('tickets').doc(id).update(updateData);
    return true;
  } else {
    const data = readLocalDB();
    const ticket = data.tickets.find(t => t.id === id);
    if (ticket) {
      ticket.status = status;
      if (resolvedImageUrl) ticket.resolvedImageUrl = resolvedImageUrl;
      writeLocalDB(data);
      return true;
    }
    return false;
  }
}

async function getUser(userId) {
  if (isFirebaseEnabled && db) {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  } else {
    const data = readLocalDB();
    return data.users.find(u => u.id === userId) || null;
  }
}

async function createUser(userId, name) {
  const newUser = {
    id: userId,
    name: name || `Villager #${userId.slice(-4)}`,
    civicPoints: 0,
    createdAt: new Date().toISOString()
  };

  if (isFirebaseEnabled && db) {
    await db.collection('users').doc(userId).set(newUser);
    return newUser;
  } else {
    const data = readLocalDB();
    // Check if user already exists
    const existing = data.users.find(u => u.id === userId);
    if (existing) return existing;

    data.users.push(newUser);
    writeLocalDB(data);
    return newUser;
  }
}

async function addCivicPoints(userId, points) {
  if (isFirebaseEnabled && db) {
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      if (doc.exists) {
        const currentPoints = doc.data().civicPoints || 0;
        t.update(userRef, { civicPoints: currentPoints + points });
      } else {
        // Create user with points
        t.set(userRef, {
          id: userId,
          name: `Villager #${userId.slice(-4)}`,
          civicPoints: points,
          createdAt: new Date().toISOString()
        });
      }
    });
    return true;
  } else {
    const data = readLocalDB();
    let user = data.users.find(u => u.id === userId);
    if (!user) {
      // Auto-create user
      user = {
        id: userId,
        name: `Villager #${userId.slice(-4)}`,
        civicPoints: points,
        createdAt: new Date().toISOString()
      };
      data.users.push(user);
    } else {
      user.civicPoints = (user.civicPoints || 0) + points;
    }
    writeLocalDB(data);
    return true;
  }
}

async function getLeaderboard() {
  if (isFirebaseEnabled && db) {
    const snapshot = await db.collection('users')
      .orderBy('civicPoints', 'desc')
      .limit(10)
      .get();
    return snapshot.docs.map(doc => doc.data());
  } else {
    const data = readLocalDB();
    return [...data.users]
      .sort((a, b) => (b.civicPoints || 0) - (a.civicPoints || 0))
      .slice(0, 10);
  }
}

async function updateTicketVerification(ticketId, verificationStatus, resolvedImage) {
  let status = 'Pending';
  let pointsToAward = 0;
  
  if (verificationStatus === 'Valid & Resolved') {
    status = 'Resolved';
    pointsToAward = 50;
  } else if (verificationStatus === 'Fake/Spam Report') {
    status = 'Rejected';
    pointsToAward = 0;
  } else {
    throw new Error('Invalid verification status');
  }

  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    throw new Error('Ticket not found.');
  }

  if (ticket.status !== 'Pending') {
    throw new Error('Ticket is already processed.');
  }

  // Process resolution image if any
  let resolvedImageUrl = '';
  if (status === 'Resolved' && resolvedImage) {
    resolvedImageUrl = await saveImage(`${ticketId}-resolved`, resolvedImage);
  }

  // Update status
  await updateTicketStatus(ticketId, status, resolvedImageUrl);

  // Award points if Valid & Resolved and reporter is valid
  let pointsAwarded = false;
  if (pointsToAward > 0) {
    if (ticket.reporterId && ticket.reporterId !== 'anonymous') {
      await addCivicPoints(ticket.reporterId, pointsToAward);
      pointsAwarded = true;
    }
    // Also award points to all upvoters who reported the same issue
    if (ticket.upvotes && Array.isArray(ticket.upvotes)) {
      for (const upvoterId of ticket.upvotes) {
        if (upvoterId && upvoterId !== 'anonymous') {
          await addCivicPoints(upvoterId, pointsToAward);
        }
      }
    }
  }

  return {
    success: true,
    ticketId,
    status,
    pointsAwarded,
    reporterId: ticket.reporterId
  };
}

async function updateUser(userId, updateData) {
  if (isFirebaseEnabled && db) {
    await db.collection('users').doc(userId).update(updateData);
    const updatedDoc = await db.collection('users').doc(userId).get();
    return updatedDoc.data();
  } else {
    const data = readLocalDB();
    const user = data.users.find(u => u.id === userId);
    if (user) {
      Object.assign(user, updateData);
      writeLocalDB(data);
      return user;
    }
    return null;
  }
}

async function deleteUser(userId) {
  if (isFirebaseEnabled && db) {
    await db.collection('users').doc(userId).delete();
    return true;
  } else {
    const data = readLocalDB();
    const initialLength = data.users.length;
    data.users = data.users.filter(u => u.id !== userId);
    if (data.users.length !== initialLength) {
      writeLocalDB(data);
      return true;
    }
    return false;
  }
}

async function clearDemoUsers() {
  if (isFirebaseEnabled && db) {
    const snapshot = await db.collection('users').get();
    const batch = db.batch();
    let count = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name && (data.name.startsWith('Villager #') || data.name.startsWith('Citizen #'))) {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } else {
    const data = readLocalDB();
    const initialCount = data.users.length;
    data.users = data.users.filter(u => !(u.name && (u.name.startsWith('Villager #') || u.name.startsWith('Citizen #'))));
    const deletedCount = initialCount - data.users.length;
    if (deletedCount > 0) {
      writeLocalDB(data);
    }
    return deletedCount;
  }
}

async function getUsers() {
  if (isFirebaseEnabled && db) {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => doc.data());
  } else {
    const data = readLocalDB();
    return [...data.users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function clearProcessedTickets() {
  if (isFirebaseEnabled && db) {
    const snapshot = await db.collection('tickets').get();
    const batch = db.batch();
    let count = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'Resolved' || data.status === 'Rejected') {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } else {
    const data = readLocalDB();
    const initialCount = data.tickets.length;
    data.tickets = data.tickets.filter(t => !(t.status === 'Resolved' || t.status === 'Rejected'));
    const deletedCount = initialCount - data.tickets.length;
    if (deletedCount > 0) {
      writeLocalDB(data);
    }
    return deletedCount;
  }
}

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
  updateTicketVerification,
  getUser,
  createUser,
  addCivicPoints,
  getLeaderboard,
  updateUser,
  deleteUser,
  clearDemoUsers,
  getUsers,
  clearProcessedTickets
};

