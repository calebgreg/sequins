import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Users, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { createPageUrl } from '../../utils';
import { Link } from 'react-router-dom';

export default function TeacherDetailSheet({ isOpen, onOpenChange, teacher, classes = [], attendance = [] }) {
    if (!teacher) return null;

    const teacherClasses = classes.filter(c => c.teacher === teacher.name);
    
    // Group classes by day
    const dayMap = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'R': 'Thursday', 'F': 'Friday', 'S': 'Saturday', 'U': 'Sunday' };
    const classesByDay = teacherClasses.reduce((acc, cls) => {
        const day = dayMap[cls.day] || cls.day;
        if (!acc[day]) acc[day] = [];
        acc[day].push(cls);
        return acc;
    }, {});

    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-gray-100">
                            <AvatarFallback className="bg-[#333333] text-white text-xl">
                                {getInitials(teacher.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <SheetTitle className="text-2xl font-serif text-[#333333]">{teacher.name}</SheetTitle>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {teacher.styles?.map(style => (
                                    <Badge key={style} variant="secondary" className="text-xs font-normal">
                                        {style}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Bio Section */}
                    {teacher.bio && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">About</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{teacher.bio}</p>
                        </div>
                    )}

                    {/* Contact/Info Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="w-full justify-start gap-2 h-10">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">Email Teacher</span>
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2 h-10">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">Call Teacher</span>
                        </Button>
                    </div>

                    {/* Weekly Schedule */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Weekly Schedule</h4>
                            <Badge variant="outline" className="font-normal">{teacherClasses.length} Classes</Badge>
                        </div>
                        
                        {Object.keys(classesByDay).length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No classes assigned yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                    const dayClasses = classesByDay[day];
                                    if (!dayClasses) return null;
                                    
                                    return (
                                        <div key={day} className="relative pl-6 border-l-2 border-gray-100">
                                            <span className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-white" />
                                            <h5 className="text-sm font-medium text-gray-900 mb-3">{day}</h5>
                                            <div className="space-y-3">
                                                {dayClasses.sort((a,b) => a.start_time - b.start_time).map(cls => (
                                                    <div key={cls.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center group hover:border-gray-300 transition-colors">
                                                        <div>
                                                            <div className="font-medium text-[#333333] text-sm">{cls.title}</div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                {Math.floor(cls.start_time)}:{(cls.start_time % 1 * 60).toString().padStart(2, '0')} 
                                                                <span className="text-gray-300">•</span>
                                                                Room {cls.room || 'A'}
                                                            </div>
                                                        </div>
                                                        <Badge className="bg-white text-gray-600 hover:bg-gray-100 border-gray-200">
                                                            {cls.student_names?.length || 0} Students
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                        <Link to={createPageUrl('ClassManager')}>
                             <Button variant="ghost" className="w-full text-gray-500 hover:text-[#333333]">Manage All Classes</Button>
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}