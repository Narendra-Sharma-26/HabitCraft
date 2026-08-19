const Group = require('../models/Group');
const User = require('../models/User');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const { getTodayIST, getPastISTDate } = require('../utils/dateHelper');

// @desc    Create a new squad
// @route   POST /api/groups
const createGroup = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;

        const group = await Group.create({
            name,
            admin: userId,
            members: [userId] // Creator is automatically the first member
        });

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all squads the user is part of
// @route   GET /api/groups
const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('members', 'name email')
            .populate('admin', 'name');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search for users to invite (by email or exact name)
// @route   GET /api/groups/search?q=...
const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.json([]);

        // Find users matching the search, excluding the person searching
        const users = await User.find({
            $and: [
                { _id: { $ne: req.user._id } },
                {
                    $or: [
                        { email: { $regex: query, $options: 'i' } },
                        { name: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('name email _id').limit(5);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a user to a squad
// @route   POST /api/groups/:id/members
const addMember = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: "Group not found" });
        
        // Only the admin can add people
        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the admin can add members." });
        }

        if (group.members.includes(targetUserId)) {
            return res.status(400).json({ message: "User is already in this squad." });
        }

        group.members.push(targetUserId);
        await group.save();

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get localized leaderboard for a specific squad
// @route   GET /api/groups/:id/leaderboard
const getGroupLeaderboard = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Ensure the person asking is actually in the squad
        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({ message: "Access denied." });
        }

        // Fetch ONLY the users in this specific group
        const groupUsers = await User.find({ _id: { $in: group.members } }).select("name disciplineScore");
        const allHabits = await Habit.find({ userId: { $in: group.members }, isActive: true }).select("userId streak totalCompleted _id");

        const todayStr = getTodayIST();
        const yesterdayStr = getPastISTDate(1);

        const recentLogs = await HabitLog.find({
            date: { $in: [todayStr, yesterdayStr] },
            completed: true
        }).select("habitId");

        const aliveHabitIds = new Set(recentLogs.map(log => log.habitId.toString()));

        // Calculate stats exactly like the global leaderboard
        const usersWithStats = groupUsers.map(user => {
            const userHabits = allHabits.filter(h => h.userId.toString() === user._id.toString());
            
            const bestStreak = userHabits.reduce((max, h) => {
                const actualStreak = aliveHabitIds.has(h._id.toString()) ? (h.streak || 0) : 0;
                return Math.max(max, actualStreak);
            }, 0);

            const totalCompleted = userHabits.reduce((sum, h) => sum + (h.totalCompleted || 0), 0);

            return {
                _id: user._id.toString(),
                name: user.name,
                disciplineScore: user.disciplineScore || 0,
                bestStreak,
                totalCompleted
            };
        });

        // Tie-Breaker Logic
        usersWithStats.sort((a, b) => {
            if (b.disciplineScore !== a.disciplineScore) return b.disciplineScore - a.disciplineScore;
            if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
            return b.totalCompleted - a.totalCompleted;
        });

        const rankedUsers = usersWithStats.map((u, index) => ({ ...u, rank: index + 1 }));
        
        res.json({ groupName: group.name, leaderboard: rankedUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Delete a squad completely
// @route   DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Only the admin can delete the squad
        if (group.admin._id.toString() !== req.user._id.toString() && group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the admin can delete this squad." });
        }

        await Group.findByIdAndDelete(req.params.id);
        res.json({ message: "Squad deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a member (or leave the squad)
// @route   DELETE /api/groups/:id/members/:memberId
const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isSelf = req.user._id.toString() === req.params.memberId;
        const isAdmin = group.admin._id.toString() === req.user._id.toString() || group.admin.toString() === req.user._id.toString();

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ message: "Not authorized to remove this member." });
        }

        // Filter out the specific member
        group.members = group.members.filter(id => id.toString() !== req.params.memberId);
        await group.save();

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = { createGroup, getMyGroups, searchUsers, addMember, getGroupLeaderboard, deleteGroup, removeMember };
