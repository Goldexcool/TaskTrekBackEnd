const Column = require('../models/Column');
const Board = require('../models/Board');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Team = require('../models/Team');

/**
 * Add a new column to a board
 * @route POST /api/boards/:boardId/columns
 */
const addColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Column name is required'
      });
    }

    // Find the board
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check user permission
    const hasPermission = await checkBoardEditPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add columns to this board'
      });
    }

    // Get max order in existing columns
    const maxOrderColumn = await Column.findOne({ board: boardId })
      .sort({ order: -1 })
      .limit(1);
    
    const newOrder = maxOrderColumn ? maxOrderColumn.order + 1 : 0;

    // Create new column
    const column = await Column.create({
      name,
      order: newOrder,
      board: boardId,
      createdBy: req.user.id
    });

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'created_column',
      boardId,
      columnId: column._id,
      metadata: { columnName: name }
    });

    // Get board members to notify
    const boardWithMembers = await Board.findById(boardId)
      .populate({
        path: 'members.user',
        select: '_id'
      });

    const io = req.app.get('io');
    if (io && boardWithMembers && boardWithMembers.members) {
      const memberIds = boardWithMembers.members
        .map(member => member.user._id.toString())
        .filter(id => id !== req.user.id); 

      memberIds.forEach(memberId => {
        io.to(`user:${memberId}`).emit('column:created', {
          boardId,
          column: {
            _id: column._id,
            name: column.name,
            order: column.order
          },
          creator: {
            id: req.user.id,
            name: req.user.name || req.user.username
          }
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Column added successfully',
      data: column
    });
  } catch (error) {
    console.error('Add column error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while adding column',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update column details
 * @route PUT /api/columns/:id
 */
const updateColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order } = req.body;

    // Find the column
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }

    // Get the board to check permissions
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }

    const hasPermission = await checkBoardEditPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this column'
      });
    }

    const oldName = column.name;

    if (name !== undefined) column.name = name;
    if (order !== undefined) column.order = order;

    await column.save();

    // Log activity if name changed
    if (name && name !== oldName) {
      await Activity.create({
        user: req.user.id,
        action: 'updated_column',
        boardId: column.board,
        columnId: column._id,
        metadata: {
          oldName,
          newName: name
        }
      });
    }

    // Emit WebSocket event to all board members
    const io = req.app.get('io');
    if (io && board.members) {
      const memberIds = board.members
        .map(member => member.user.toString())
        .filter(id => id !== req.user.id); // Don't notify the updater

      memberIds.forEach(memberId => {
        io.to(`user:${memberId}`).emit('column:updated', {
          boardId: board._id,
          column: {
            _id: column._id,
            name: column.name,
            order: column.order
          },
          updater: {
            id: req.user.id,
            name: req.user.name || req.user.username
          }
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Column updated successfully',
      data: column
    });
  } catch (error) {
    console.error('Update column error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating column',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a column and its tasks
 * @route DELETE /api/columns/:id
 */
const deleteColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const { moveTasks, destinationColumnId } = req.body;

    // Find the column
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }

    // Get the board to check permissions
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }

    // Check user permission
    const hasPermission = await checkBoardEditPermission(board, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this column'
      });
    }

    // Handle tasks in the column
    if (moveTasks && destinationColumnId) {
      // Ensure destination column exists and is in the same board
      const destinationColumn = await Column.findOne({
        _id: destinationColumnId,
        board: column.board
      });

      if (!destinationColumn) {
        return res.status(400).json({
          success: false,
          message: 'Destination column not found in this board'
        });
      }

      // Move tasks to the destination column
      await Task.updateMany(
        { column: column._id },
        { column: destinationColumnId }
      );
    } else {
      // Delete all tasks in this column
      await Task.deleteMany({ column: column._id });
    }

    // Delete the column
    await column.deleteOne();

    // Log activity
    await Activity.create({
      user: req.user.id,
      action: 'deleted_column',
      boardId: column.board,
      metadata: {
        columnName: column.name,
        tasksPreserved: moveTasks ? true : false,
        destinationColumn: moveTasks ? destinationColumnId : null
      }
    });

    // Emit WebSocket event to all board members
    const io = req.app.get('io');
    if (io && board.members) {
      const memberIds = board.members
        .map(member => member.user.toString())
        .filter(id => id !== req.user.id); 

      memberIds.forEach(memberId => {
        io.to(`user:${memberId}`).emit('column:deleted', {
          boardId: board._id,
          columnId: column._id,
          tasks: {
            moved: !!moveTasks,
            destinationColumnId: destinationColumnId || null
          },
          deleter: {
            id: req.user.id,
            name: req.user.name || req.user.username
          }
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Column deleted successfully'
    });
  } catch (error) {
    console.error('Delete column error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting column',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to check if a user has edit permission on a board
 */
const checkBoardEditPermission = async (board, userId) => {
  if (!board || !userId) return false;
  
  // Check if user is the creator/owner
  if (board.createdBy.toString() === userId) return true;
  
  // Check if user is a member with edit permission
  const memberEntry = board.members.find(
    member => member.user.toString() === userId
  );
  
  if (memberEntry && (memberEntry.role === 'admin' || memberEntry.role === 'editor')) {
    return true;
  }
  
  // Check if board belongs to team and user is team admin/owner
  if (board.team) {
    const team = await Team.findById(board.team);
    if (team) {
      if (team.owner.toString() === userId) return true;
      if (team.admins && team.admins.includes(userId)) return true;
    }
  }
  
  return false;
};

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

module.exports = {
  createColumn,
  getColumnsByBoard,
  addColumn,
  updateColumn,
  deleteColumn
};