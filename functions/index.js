const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

/**
 * Scheduled function to clean up inactive rooms
 * Runs every 5 minutes
 * Deletes rooms with no players that have been inactive for more than 5 minutes
 */
exports.cleanupInactiveRooms = onSchedule('every 5 minutes', async (event) => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  try {
    const roomsQuery = db.collection('rooms');
    const snapshot = await roomsQuery.get();
    
    let deletedCount = 0;
    
    for (const roomDoc of snapshot.docs) {
      const roomData = roomDoc.data();
      const lastActivity = roomData.lastActivity ? new Date(roomData.lastActivity) : new Date(roomData.createdAt || now);
      const playerCount = roomData.playerCount || 0;
      
      // Only delete rooms with no players that have been inactive for more than 5 minutes
      if (playerCount === 0 && lastActivity < fiveMinutesAgo) {
        await roomDoc.ref.delete();
        
        // Clean up associated files
        const filesQuery = db.collection('roomFiles').where('roomId', '==', roomDoc.id);
        const filesSnapshot = await filesQuery.get();
        
        for (const fileDoc of filesSnapshot.docs) {
          await fileDoc.ref.delete();
        }
        
        deletedCount++;
        console.log(`Deleted inactive room with no players: ${roomDoc.id}`);
      }
    }
    
    console.log(`Cleanup completed. Deleted ${deletedCount} inactive rooms.`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Failed to cleanup inactive rooms:', error);
    throw error;
  }
});

/**
 * Trigger function to clean up room files when a room is deleted
 */
exports.cleanupRoomFiles = onDocumentWritten('rooms/{roomId}', async (event) => {
  const snapshot = event.data.after;
  
  // If the room was deleted
  if (!snapshot.exists) {
    const roomId = event.params.roomId;
    
    try {
      const filesQuery = db.collection('roomFiles').where('roomId', '==', roomId);
      const filesSnapshot = await filesQuery.get();
      
      for (const fileDoc of filesSnapshot.docs) {
        await fileDoc.ref.delete();
      }
      
      console.log(`Cleaned up files for deleted room: ${roomId}`);
    } catch (error) {
      console.error(`Failed to cleanup files for room ${roomId}:`, error);
    }
  }
});

/**
 * HTTP-triggered function to validate room creation
 */
exports.validateRoomCreation = require('firebase-functions/v2/https').onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, () => {});
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { roomId, roomName, password, createdBy } = req.body;
    
    // Validate required fields
    if (!roomId || !roomName || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate room ID format (alphanumeric, hyphens, underscores)
    const roomIdRegex = /^[a-zA-Z0-9-_]+$/;
    if (!roomIdRegex.test(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID format' });
    }
    
    // Validate room name length
    if (roomName.length < 3 || roomName.length > 50) {
      return res.status(400).json({ error: 'Room name must be between 3 and 50 characters' });
    }
    
    // Validate room name doesn't contain malicious content
    const dangerousPatterns = /<script|javascript:|onload|onerror/i;
    if (dangerousPatterns.test(roomName)) {
      return res.status(400).json({ error: 'Room name contains invalid characters' });
    }
    
    // Validate password if provided
    if (password && (password.length < 4 || password.length > 20)) {
      return res.status(400).json({ error: 'Password must be between 4 and 20 characters' });
    }
    
    // Check if room already exists
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    
    if (roomDoc.exists) {
      return res.status(409).json({ error: 'Room already exists' });
    }
    
    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Room validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * HTTP-triggered function to validate task creation/update
 */
exports.validateTask = require('firebase-functions/v2/https').onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, () => {});
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { text, uid, taskId } = req.body;
    
    // Validate required fields
    if (!text || !uid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate task text length
    if (text.length < 1 || text.length > 500) {
      return res.status(400).json({ error: 'Task text must be between 1 and 500 characters' });
    }
    
    // Validate task text doesn't contain malicious content
    const dangerousPatterns = /<script|javascript:|onload|onerror/i;
    if (dangerousPatterns.test(text)) {
      return res.status(400).json({ error: 'Task text contains invalid characters' });
    }
    
    // If updating, verify user owns the task
    if (taskId) {
      const taskRef = db.collection('tasks').doc(taskId);
      const taskDoc = await taskRef.get();
      
      if (!taskDoc.exists) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (taskDoc.data().uid !== uid) {
        return res.status(403).json({ error: 'Unauthorized to modify this task' });
      }
    }
    
    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Task validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * HTTP-triggered function to validate file upload
 */
exports.validateFileUpload = require('firebase-functions/v2/https').onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, () => {});
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fileName, fileSize, fileType, uid, roomId } = req.body;
    
    // Validate required fields
    if (!fileName || !fileSize || !fileType || !uid || !roomId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate file name
    const sanitizedName = fileName.replace(/[<>:"|?*]/g, '').replace(/\.\./g, '').replace(/[\/\\]/g, '').trim();
    if (sanitizedName !== fileName) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    
    if (sanitizedName.length > 255) {
      return res.status(400).json({ error: 'File name too long' });
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileSize > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }
    
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }
    
    // Verify room exists
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    
    if (!roomDoc.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * HTTP-triggered function to validate chat message
 */
exports.validateChatMessage = require('firebase-functions/v2/https').onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  cors(req, res, () => {});
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, uid, roomId } = req.body;
    
    // Validate required fields
    if (!message || !uid || !roomId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate message length
    if (message.length < 1 || message.length > 1000) {
      return res.status(400).json({ error: 'Message must be between 1 and 1000 characters' });
    }
    
    // Validate message doesn't contain malicious content
    const dangerousPatterns = /<script|javascript:|onload|onerror/i;
    if (dangerousPatterns.test(message)) {
      return res.status(400).json({ error: 'Message contains invalid characters' });
    }
    
    // Verify room exists
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    
    if (!roomDoc.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Chat validation error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});
