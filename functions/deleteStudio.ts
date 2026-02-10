import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can delete studios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { studio_id } = await req.json();

    if (!studio_id) {
      return Response.json({ error: 'studio_id is required' }, { status: 400 });
    }

    // List of all entities that have studio_id field
    const entitiesToDelete = [
      'Teacher',
      'Student',
      'DanceClass',
      'Attendance',
      'Family',
      'Invoice',
      'Message',
      'StudentNote',
      'TeacherNote',
      'Room',
      'Performance',
      'PerformanceRoutine',
      'TuitionRule',
      'TuitionPlan',
      'StudioSettings',
      'SavedFilter',
      'GrowthOutcome',
      'GrowthAction',
      'GrowthTarget',
      'GrowthPeriodProgress',
      'AgentLog',
      'SubRequest',
      'TimeLog',
      'TimeSheetAcknowledgement',
      'LessonPlan',
      'MusicTrack',
      'Transaction',
      'DiscountRule',
      'FeeType',
      'FamilyRoomConfig',
      'FamilyNote',
      'FamilyTask',
      'FamilyDocument',
      'ConversationMessage',
      'TaskComment',
      'Notification',
      'PerformanceChat',
      'Team',
    ];

    const deletionResults = {};

    // Delete all related data for each entity type
    for (const entityName of entitiesToDelete) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({ studio_id });
        if (records && records.length > 0) {
          for (const record of records) {
            await base44.asServiceRole.entities[entityName].delete(record.id);
          }
          deletionResults[entityName] = records.length;
        } else {
          deletionResults[entityName] = 0;
        }
      } catch (err) {
        // Entity might not exist or have no records, continue
        deletionResults[entityName] = `skipped: ${err.message}`;
      }
    }

    // Finally, delete the studio itself
    await base44.asServiceRole.entities.Studio.delete(studio_id);
    deletionResults['Studio'] = 1;

    return Response.json({ 
      success: true, 
      message: 'Studio and all related data deleted successfully',
      deletionResults 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});