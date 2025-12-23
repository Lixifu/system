// Data migration script to fix organizer assignment for activities and trainings
const sequelize = require('../config/db');
const { Activity, Training, User } = require('../models');

async function runMigration() {
    try {
        console.log('=== Starting organizer assignment migration ===');
        
        // Connect to database
        await sequelize.sync();
        console.log('Database connected successfully');
        
        // Find or create the default organizer user
        let defaultOrganizer = await User.findOne({ where: { email: 'organizer@example.com' } });
        
        if (!defaultOrganizer) {
            console.log('Creating default organizer user...');
            defaultOrganizer = await User.create({
                name: 'Default Organizer',
                email: 'organizer@example.com',
                phone: '13800138000',
                password: 'password123', // This will be hashed by the model's beforeSave hook
                role: 'organizer'
            });
            console.log('Default organizer created with ID:', defaultOrganizer.id);
        } else {
            console.log('Using existing default organizer with ID:', defaultOrganizer.id);
        }
        
        // Fix activities without proper organizer assignment
        console.log('\n=== Fixing activity organizer assignments ===');
        
        // Count activities before update
        const totalActivities = await Activity.count();
        console.log(`Total activities: ${totalActivities}`);
        
        // Update activities with no organizerId or invalid organizerId
        const [activityUpdatedCount] = await Activity.update(
            { organizerId: defaultOrganizer.id },
            {
                where: {
                    [sequelize.Sequelize.Op.or]: [
                        { organizerId: null },
                        { organizerId: 0 },
                        {
                            organizerId: {
                                [sequelize.Sequelize.Op.notIn]: sequelize.literal(
                                    '(SELECT id FROM users WHERE role = \'organizer\')'
                                )
                            }
                        }
                    ]
                }
            }
        );
        console.log(`Updated ${activityUpdatedCount} activities with proper organizer assignment`);
        
        // Fix trainings without proper organizer assignment
        console.log('\n=== Fixing training organizer assignments ===');
        
        // Count trainings before update
        const totalTrainings = await Training.count();
        console.log(`Total trainings: ${totalTrainings}`);
        
        // Update trainings with no organizerId or invalid organizerId
        const [trainingUpdatedCount] = await Training.update(
            { organizerId: defaultOrganizer.id },
            {
                where: {
                    [sequelize.Sequelize.Op.or]: [
                        { organizerId: null },
                        { organizerId: 0 },
                        {
                            organizerId: {
                                [sequelize.Sequelize.Op.notIn]: sequelize.literal(
                                    '(SELECT id FROM users WHERE role = \'organizer\')'
                                )
                            }
                        }
                    ]
                }
            }
        );
        console.log(`Updated ${trainingUpdatedCount} trainings with proper organizer assignment`);
        
        // Verify the fix by counting unassigned items
        const unassignedActivities = await Activity.count({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { organizerId: null },
                    { organizerId: 0 }
                ]
            }
        });
        
        const unassignedTrainings = await Training.count({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { organizerId: null },
                    { organizerId: 0 }
                ]
            }
        });
        
        console.log('\n=== Migration Verification ===');
        console.log(`Unassigned activities after migration: ${unassignedActivities}`);
        console.log(`Unassigned trainings after migration: ${unassignedTrainings}`);
        
        console.log('\n=== Migration Complete ===');
        console.log(`Total fixes applied: ${activityUpdatedCount + trainingUpdatedCount}`);
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await sequelize.close();
        process.exit(0);
    }
}

// Run the migration
runMigration();