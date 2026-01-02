import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, CalendarX, FileText } from 'lucide-react';
import TimeSheetReviewModal from './TimeSheetReviewModal';
import SubRequestHistoryModal from './SubRequestHistoryModal';
import SubRequestModal from './SubRequestModal';

export default function TimeManagementHub({ isOpen, onOpenChange, teacherName, classes, subRequests }) {
  const [activeTab, setActiveTab] = useState('timesheet');
  const [showNewSubRequest, setShowNewSubRequest] = useState(false);

  return (
    <>
      <Dialog open={isOpen && !showNewSubRequest} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Time Management</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timesheet" className="gap-2">
                <Clock className="w-4 h-4" />
                Time Sheet
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2">
                <FileText className="w-4 h-4" />
                My Requests
              </TabsTrigger>
              <TabsTrigger value="new-request" className="gap-2">
                <CalendarX className="w-4 h-4" />
                Request Coverage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timesheet" className="mt-6">
              <TimeSheetReviewModal 
                isOpen={true}
                onOpenChange={() => {}}
                teacherName={teacherName}
                classes={classes}
                subRequests={subRequests}
                embedded={true}
              />
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <SubRequestHistoryModal
                isOpen={true}
                onOpenChange={() => {}}
                teacherName={teacherName}
                onNewRequest={() => setActiveTab('new-request')}
                embedded={true}
              />
            </TabsContent>

            <TabsContent value="new-request" className="mt-6">
              <SubRequestModal 
                isOpen={true}
                onOpenChange={() => {}}
                classData={null}
                teacherName={teacherName}
                availableClasses={classes}
                embedded={true}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}