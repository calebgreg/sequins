import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can delete studios
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { studio_id, entity_batch } = await req.json();

    if (!studio_id) {
      return Response.json({ error: 'studio_id is required' }, { status: 400 });
    }

    // If entity_batch is provided, only delete that batch of entities
    // This allows the frontend to call multiple times for different entity groups
    const allEntities = [
      // Batch 1: Notes and messages
      ['Attendance', 'StudentNote', 'TeacherNote', 'Message', 'TaskComment', 'ConversationMessage', 'PerformanceChat', 'FamilyNote', 'Notification'],
      // Batch 2: Tasks and documents  
      ['FamilyTask', 'FamilyDocument', 'PerformanceRoutine', 'TimeLog', 'TimeSheetAcknowledgement', 'SubRequest', 'LessonPlan', 'MusicTrack'],
      // Batch 3: Financial
      ['Transaction', 'Invoice', 'AgentLog', 'GrowthAction', 'GrowthPeriodProgress'],
      // Batch 4: Core records
      ['DanceClass', 'Student', 'Teacher', 'Family', 'Performance', 'Room', 'Team'],
      // Batch 5: Settings
      ['TuitionRule', 'TuitionPlan', 'DiscountRule', 'FeeType', 'SavedFilter', 'FamilyRoomConfig', 'GrowthOutcome', 'GrowthTarget', 'StudioSettings'],
    ];

    const batchIndex = entity_batch !== undefined ? entity_batch : -1;
    
    // If no batch specified, delete studio directly (final step)
    if (batchIndex === -1) {
      // Verify the studio exists
      const studios = await base44.asServiceRole.entities.Studio.filter({ id: studio_id });
      if (!studios || studios.length === 0) {
        return Response.json({ error: 'Studio not found' }, { status: 404 });
      }
      
      await base44.asServiceRole.entities.Studio.delete(studio_id);
      return Response.json({ 
        success: true, 
        message: 'Studio deleted',
        step: 'complete'
      });
    }

    // Delete specific batch
    if (batchIndex >= allEntities.length) {
      return Response.json({ error: 'Invalid batch index' }, { status: 400 });
    }

    const entitiesToDelete = allEntities[batchIndex];
    const deletionResults = {};

    for (const entityName of entitiesToDelete) {
      try {
        const records = await base44.asServiceRole.entities[entityName].filter({ studio_id });
        
        if (records && records.length > 0) {
          // Delete all records
          await Promise.all(records.map(r => 
            base44.asServiceRole.entities[entityName].delete(r.id).catch(() => {})
          ));
          deletionResults[entityName] = records.length;
        } else {
          deletionResults[entityName] = 0;
        }
      } catch (err) {
        deletionResults[entityName] = 'skipped';
      }
    }

    return Response.json({ 
      success: true, 
      batch: batchIndex,
      totalBatches: allEntities.length,
      deletionResults,
      step: 'batch_complete'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});