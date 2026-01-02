import React, { useState } from 'react';
import TimeSheetReviewModal from './TimeSheetReviewModal';
import SubRequestHistoryModal from './SubRequestHistoryModal';
import SubRequestModal from './SubRequestModal';

export default function TimeManagementHub({ isOpen, onOpenChange, teacherName, classes, subRequests }) {
  const [activeView, setActiveView] = useState('timesheet'); // 'timesheet', 'history', 'new-request'

  const handleClose = () => {
    setActiveView('timesheet'); // Reset to default
    onOpenChange(false);
  };

  return (
    <>
      {/* Time Sheet Modal */}
      <TimeSheetReviewModal 
        isOpen={isOpen && activeView === 'timesheet'}
        onOpenChange={handleClose}
        teacherName={teacherName}
        classes={classes}
        subRequests={subRequests}
      />

      {/* Request History Modal */}
      <SubRequestHistoryModal
        isOpen={isOpen && activeView === 'history'}
        onOpenChange={handleClose}
        teacherName={teacherName}
        onNewRequest={() => setActiveView('new-request')}
      />

      {/* New Request Modal */}
      <SubRequestModal 
        isOpen={isOpen && activeView === 'new-request'}
        onOpenChange={handleClose}
        classData={null}
        teacherName={teacherName}
        availableClasses={classes}
      />
    </>
  );
}