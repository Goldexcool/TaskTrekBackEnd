const Column = require('../models/Column');
const Board = require('../models/Board');

// Create column
const createColumn = async (req, res) => {
  try {
    const { title, boardId, position } = req.body;
    
    if (!title || !boardId) {
      return res.status(400).json({
        success: false,
        message: "Please provide title and boardId"
      });
    }
    
    // Create column
    const column = await Column.create({
      title,
      board: boardId,
      position: position || 0
    });
    
    res.status(201).json({
      success: true,
      data: column
    });
  } catch (error) {
    console.error('Column creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get columns by board
const getColumnsByBoard = async (req, res) => {
  try {
    const boardId = req.params.boardId;
    console.log('Getting columns for board:', boardId);
    
    // Find columns for this board
    const columns = await Column.find({ board: boardId })
      .sort({ position: 1 });
    
    console.log(`Found ${columns.length} columns`);
    
    res.status(200).json({
      success: true,
      count: columns.length,
      data: columns
    });
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update column
const updateColumn = async (req, res) => {
  try {
    const { title, position } = req.body;
    const column = await Column.findById(req.params.id);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found"
      });
    }
    
    // Update fields
    if (title) column.title = title;
    if (position !== undefined) column.position = position;
    
    await column.save();
    
    res.status(200).json({
      success: true,
      data: column
    });
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete column
const deleteColumn = async (req, res) => {
  try {
    const column = await Column.findById(req.params.id);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found"
      });
    }
    
    await Column.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: "Column deleted successfully"
    });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createColumn,
  getColumnsByBoard,
  updateColumn,
  deleteColumn
};