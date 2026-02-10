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

    // Verify the studio exists first
    const studios = await base44.asServiceRole.entities.Studio.filter({ id: studio_id });
    if (!studios || studios.length === 0) {
      return Response.json({ error: 'Studio not found' }, { status: 404 });
    }

    // List of all entities that have studio_id field - ordered by priority
    const entitiesToDelete = [
      // High priority - child records first
      'Attendance',
      'StudentNote',
      'TeacherNote',
      'Message',
      'TaskComment',
      'ConversationMessage',
      'PerformanceChat',
      'FamilyNote',
      'FamilyTask',
      'FamilyDocument',
      'Notification',
      // Mid-level records
      'PerformanceRoutine',
      'TimeLog',
      'TimeSheetAcknowledgement',
      'SubRequest',
      'LessonPlan',
      'MusicTrack',
      'Transaction',
      'Invoice',
      'AgentLog',
      'GrowthAction',
      'GrowthPeriodProgress',
      // Core records
      'DanceClass',
      'Student',
      'Teacher',
      'Family',
      'Performance',
      'Room',
      'Team',
      // Settings and configuration
      'TuitionRule',
      'TuitionPlan',
      'DiscountRule',
      'FeeType',
      'SavedFilter',
      'FamilyRoomConfig',
      'GrowthOutcome',
      'GrowthTarget',
      'StudioSettings',
    ];

    const deletionResults = {};
    const errors = [];

    // Delete in batches with delays to avoid rate limiting
    for (const entityName of entitiesToDelete) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({ studio_id });
        
        if (records && records.length > 0) {
          // Delete records one at a time with small delays
          let deletedCount = 0;
          for (const record of records) {
            try {
              await base44.asServiceRole.entities[entityName].delete(record.id);
              deletedCount++;
            } catch (deleteErr) {
              // Continue on individual delete errors
              errors.push(`${entityName}/${record.id}: ${deleteErr.message}`);
            }
            // Small delay between deletes to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          deletionResults[entityName] = deletedCount;
        } else {
          deletionResults[entityName] = 0;
        }
      } catch (err) {
        // Entity might not exist or have no records, continue
        if (!err.message?.includes('Rate limit')) {
          deletionResults[entityName] = `skipped`;
        } else {
          errors.push(`${entityName}: Rate limited`);
        }
      }
      
      // Add delay between entity types
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Finally, delete the studio itself
    try {
      await base44.asServiceRole.entities.Studio.delete(studio_id);
      deletionResults['Studio'] = 1;
    } catch (studioErr) {
      return Response.json({ 
        error: 'Failed to delete studio record: ' + studioErr.message,
        partialResults: deletionResults 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: 'Studio and all related data deleted successfully',
      deletionResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});