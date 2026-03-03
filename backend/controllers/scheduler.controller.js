const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const buildTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

// POST /api/scheduler/auto
// Heuristic "AI" scheduler: Generates a weekly schedule based on required subjects
// and checks classroom availability to prevent conflicts.
exports.autoSchedule = async (req, res) => {
    try {
        const { classroom, subjects, excludeBatchId } = req.body;

        if (!classroom) {
            return res.status(400).json({ message: 'Classroom is required to auto-schedule.' });
        }

        // 1. Fetch current room occupancy
        const query = { classroom, schedule: { $exists: true, $ne: [] } };
        if (excludeBatchId) {
            query._id = { $ne: excludeBatchId }; // if editing an existing batch
        }

        const batches = await Batch.find(query).select('schedule');
        const occupied = new Set();

        batches.forEach(b => {
            b.schedule?.forEach(s => {
                occupied.add(`${s.day}-${s.time}`);
            });
        });

        // 2. Determine number of slots needed
        // Usually 1 slot per subject per week. If no subjects picked, default to 5 slots.
        const slotsNeeded = subjects && subjects.length > 0 ? subjects.length : 5;

        const timeSlots = buildTimeSlots();
        const availableSlots = [];

        // 3. Find all available slots for this room
        // Preferred days: Monday to Friday
        for (const day of DAYS) {
            for (const time of timeSlots) {
                if (!occupied.has(`${day}-${time}`)) {
                    availableSlots.push({ day, time });
                }
            }
        }

        if (availableSlots.length < slotsNeeded) {
            return res.status(400).json({
                message: `Not enough available slots in ${classroom}. Needed ${slotsNeeded}, but only found ${availableSlots.length}.`
            });
        }

        // 4. Algorithm to distribute slots optimally
        // Goal: Spread slots across different days, ideally at consistent times.
        const selectedSchedule = [];
        const daysUsed = new Set();

        // Let's try to pick a consistent time (e.g., 09:00, 10:00) that is open across multiple days
        let chosenConsistentTime = null;
        let bestDayCoverage = 0;

        for (const time of timeSlots) {
            let matchingDays = availableSlots.filter(s => s.time === time);
            if (matchingDays.length > bestDayCoverage) {
                bestDayCoverage = matchingDays.length;
                chosenConsistentTime = time;
            }
        }

        // Try to allocate at the consistent time first
        if (chosenConsistentTime) {
            for (const slot of availableSlots) {
                if (selectedSchedule.length >= slotsNeeded) break;
                if (slot.time === chosenConsistentTime && !daysUsed.has(slot.day)) {
                    selectedSchedule.push(slot);
                    daysUsed.add(slot.day);
                }
            }
        }

        // 1st fallback pass: distribute one slot per day for any available time
        for (const slot of availableSlots) {
            if (selectedSchedule.length >= slotsNeeded) break;
            if (!daysUsed.has(slot.day)) {
                selectedSchedule.push(slot);
                daysUsed.add(slot.day);
            }
        }

        // 2nd fallback pass: just take any available slot
        for (const slot of availableSlots) {
            if (selectedSchedule.length >= slotsNeeded) break;
            const alreadySelected = selectedSchedule.some(s => s.day === slot.day && s.time === slot.time);
            if (!alreadySelected) {
                selectedSchedule.push(slot);
            }
        }

        // Sort schedule chronologically
        const dayOrder = Object.fromEntries(DAYS.map((d, i) => [d, i]));
        selectedSchedule.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) {
                return dayOrder[a.day] - dayOrder[b.day];
            }
            return a.time.localeCompare(b.time);
        });

        return res.json({ schedule: selectedSchedule });

    } catch (err) {
        res.status(500).json({ message: 'Server error during auto-schedule', error: err.message });
    }
};

// POST /api/scheduler/auto-batch
// Fully automated: Takes a batchId, looks at its subjects, 
// finds an available room, an available teacher, and generates the time slots.
exports.autoScheduleBatch = async (req, res) => {
    try {
        const { batchId } = req.body;
        if (!batchId) return res.status(400).json({ message: 'Batch ID is required.' });

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });

        // 1. Determine slots needed
        const subjects = batch.subjects || [];
        const slotsNeeded = subjects.length > 0 ? subjects.length : 5;

        // 2. Fetch config (Rooms)
        const admin = await Admin.findOne().select('roomsAvailable');
        const roomCount = parseInt(admin?.roomsAvailable) || 5;
        const classrooms = Array.from({ length: roomCount }, (_, i) => `Room ${i + 1}`);

        // 3. Fetch active teachers
        const teachers = await Teacher.find({ status: 'active' }).select('name assignments');

        // 4. Fetch all other batch schedules to check occupancy
        const allBatches = await Batch.find({
            _id: { $ne: batchId },
            schedule: { $exists: true, $ne: [] }
        }).select('classroom teacher schedule');

        // Build occupancy map: occupancy[roomName] = Set of "Day-Time"
        const roomOccupancy = {};
        classrooms.forEach(c => roomOccupancy[c] = new Set());

        // Build teacher occupancy map: teacherOccupancy[teacherName] = Set of "Day-Time"
        const teacherOccupancy = {};
        teachers.forEach(t => teacherOccupancy[t.name] = new Set());

        allBatches.forEach(b => {
            b.schedule?.forEach(s => {
                const slotStr = `${s.day}-${s.time}`;
                if (b.classroom && roomOccupancy[b.classroom]) {
                    roomOccupancy[b.classroom].add(slotStr);
                }
                if (b.teacher && teacherOccupancy[b.teacher]) {
                    teacherOccupancy[b.teacher].add(slotStr);
                }
            });
        });

        const timeSlots = buildTimeSlots();
        let selectedRoom = null;
        let selectedSchedule = null;
        let availableSlotsForRoom = [];

        // 5. Find a room that has enough free slots
        for (const room of classrooms) {
            const freeSlots = [];
            for (const day of DAYS) {
                for (const time of timeSlots) {
                    if (!roomOccupancy[room].has(`${day}-${time}`)) {
                        freeSlots.push({ day, time });
                    }
                }
            }
            if (freeSlots.length >= slotsNeeded) {
                selectedRoom = room;
                availableSlotsForRoom = freeSlots;
                break;
            }
        }

        if (!selectedRoom) {
            return res.status(400).json({ message: 'No classroom has enough available slots to accommodate this batch.' });
        }

        // 6. Algorithm to pick slots (same logic as before)
        const schedule = [];
        const daysUsed = new Set();

        let chosenConsistentTime = null;
        let bestDayCoverage = 0;

        for (const time of timeSlots) {
            let matchingDays = availableSlotsForRoom.filter(s => s.time === time);
            if (matchingDays.length > bestDayCoverage) {
                bestDayCoverage = matchingDays.length;
                chosenConsistentTime = time;
            }
        }

        if (chosenConsistentTime) {
            for (const slot of availableSlotsForRoom) {
                if (schedule.length >= slotsNeeded) break;
                if (slot.time === chosenConsistentTime && !daysUsed.has(slot.day)) {
                    schedule.push(slot);
                    daysUsed.add(slot.day);
                }
            }
        }

        for (const slot of availableSlotsForRoom) {
            if (schedule.length >= slotsNeeded) break;
            if (!daysUsed.has(slot.day)) {
                schedule.push(slot);
                daysUsed.add(slot.day);
            }
        }

        for (const slot of availableSlotsForRoom) {
            if (schedule.length >= slotsNeeded) break;
            const alreadySelected = schedule.some(s => s.day === slot.day && s.time === slot.time);
            if (!alreadySelected) {
                schedule.push(slot);
            }
        }

        selectedSchedule = schedule;

        // 7. Find a teacher available during these exact slots
        let selectedTeacher = null;

        for (const teacher of teachers) {
            let isAvailable = true;
            for (const slot of selectedSchedule) {
                if (teacherOccupancy[teacher.name].has(`${slot.day}-${slot.time}`)) {
                    isAvailable = false;
                    break;
                }
            }
            if (isAvailable) {
                selectedTeacher = teacher.name;
                break;
            }
        }

        if (!selectedTeacher) {
            // Fallback: Just give the first active teacher and let admin handle conflicts later
            selectedTeacher = teachers.length > 0 ? teachers[0].name : 'Unassigned';
        }

        // Sort schedule chronologically
        const dayOrder = Object.fromEntries(DAYS.map((d, i) => [d, i]));
        selectedSchedule.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) {
                return dayOrder[a.day] - dayOrder[b.day];
            }
            return a.time.localeCompare(b.time);
        });

        return res.json({
            schedule: selectedSchedule,
            classroom: selectedRoom,
            teacher: selectedTeacher
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error during auto-schedule batch', error: err.message });
    }
};
