import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Parent Schema for emergency information
const parentSchema = new mongoose.Schema({
  parentId: { type: String, required: true, unique: true },
  pediatrician: String,
  hospital: String,
  emergencyNumber: String,
  createdAt: { type: Date, default: Date.now }
});

// Message Schema for chat logs
const messageSchema = new mongoose.Schema({
  parentId: { type: String, required: true },
  sender: { type: String, required: true, enum: ['parent', 'caretaker'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Chat Log Schema for bulk saving
const chatLogSchema = new mongoose.Schema({
  logs: [{
    parentId: String,
    sender: String,
    message: String,
    timestamp: Date
  }],
  savedAt: { type: Date, default: Date.now }
});

// Create models
const Parent = mongoose.model('Parent', parentSchema);
const Message = mongoose.model('Message', messageSchema);
const ChatLog = mongoose.model('ChatLog', chatLogSchema);

// GET /api/parents - List all parents
router.get('/', async (req, res) => {
  try {
    const parents = await Parent.find({}, 'parentId').lean();
    const parentIds = parents.map(p => p.parentId);
    res.json(parentIds);
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
});

// GET /api/parents/parent-info/:parentId - Get emergency info for a parent
router.get('/parent-info/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;
    const parent = await Parent.findOne({ parentId }).lean();
    
    if (!parent) {
      // Create a new parent with sample emergency info if not found
      const newParent = new Parent({
        parentId,
        pediatrician: 'Dr. Sarah Johnson',
        hospital: 'City Children Hospital',
        emergencyNumber: '+1-555-EMERGENCY'
      });
      await newParent.save();
      
      return res.json({
        parentId: newParent.parentId,
        pediatrician: newParent.pediatrician,
        hospital: newParent.hospital,
        emergencyNumber: newParent.emergencyNumber
      });
    }
    
    res.json({
      parentId: parent.parentId,
      pediatrician: parent.pediatrician || 'Dr. Sarah Johnson',
      hospital: parent.hospital || 'City Children Hospital',
      emergencyNumber: parent.emergencyNumber || '+1-555-EMERGENCY'
    });
  } catch (error) {
    console.error('Error fetching parent info:', error);
    res.status(500).json({ error: 'Failed to fetch parent information' });
  }
});

// POST /api/parents/parent-info - Create or update parent emergency info
router.post('/parent-info', async (req, res) => {
  try {
    const { parentId, pediatrician, hospital, emergencyNumber } = req.body;
    
    const parent = await Parent.findOneAndUpdate(
      { parentId },
      { 
        parentId, 
        pediatrician, 
        hospital, 
        emergencyNumber 
      },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, parent });
  } catch (error) {
    console.error('Error saving parent info:', error);
    res.status(500).json({ error: 'Failed to save parent information' });
  }
});

export default router;
