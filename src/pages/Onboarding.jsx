import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Users, Calendar, GraduationCap, MapPin, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';

// Design tokens
const colors = {
  ink: '#1a1a1a',
  paper: '#faf9f7',
  muted: '#8a8478',
  etchLight: '#c4a0a0',
  etchDark: '#8a7070',
  green: '#7eb89a',
  red: '#c48c8c',
  amber: '#c4a98c',
};

const EtchedText = ({ children, size = 'md', className = '' }) => {
  const sizes = { sm: '14px', md: '18px', lg: '24px', xl: '32px', '2xl': '48px' };
  return (
    <span className={className} style={{
      fontSize: sizes[size],
      fontWeight: '700',
      letterSpacing: '-0.02em',
      color: 'transparent',
      backgroundImage: `linear-gradient(180deg, ${colors.etchLight} 0%, ${colors.etchDark} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      textShadow: '0 2px 3px rgba(255,255,255,0.7)',
    }}>
      {children}
    </span>
  );
};

export default function Onboarding() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [importStatus, setImportStatus] = useState('idle'); // idle, parsing, previewing, importing, complete, error
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef(null);

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Handle quoted values with commas
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    
    return rows;
  };

  // Process uploaded file
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setImportStatus('parsing');
    
    try {
      const text = await uploadedFile.text();
      const data = parseCSV(text);
      setCsvData(data);
      setImportStatus('previewing');
    } catch (err) {
      console.error('Parse error:', err);
      setImportStatus('error');
    }
  };

  // Extract unique entities from CSV
  const extractEntities = (data) => {
    const students = new Map();
    const classes = new Map();
    const teachers = new Set();
    const rooms = new Set();

    // Day mapping
    const dayMap = {
      'M': 'M', 'Mo': 'M', 'Mon': 'M', 'Monday': 'M',
      'T': 'T', 'Tu': 'T', 'Tue': 'T', 'Tuesday': 'T',
      'W': 'W', 'We': 'W', 'Wed': 'W', 'Wednesday': 'W',
      'R': 'R', 'Th': 'R', 'Thu': 'R', 'Thursday': 'R',
      'F': 'F', 'Fr': 'F', 'Fri': 'F', 'Friday': 'F',
      'S': 'S', 'Sa': 'S', 'Sat': 'S', 'Saturday': 'S',
      'U': 'U', 'Su': 'U', 'Sun': 'U', 'Sunday': 'U',
    };

    // Parse time string to decimal hours
    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3]?.toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours + (minutes / 60);
    };

    // Calculate duration in hours
    const calcDuration = (from, to) => {
      const start = parseTime(from);
      const end = parseTime(to);
      return end - start;
    };

    // Parse student name (Last, First format)
    const parseStudentName = (name) => {
      if (!name) return '';
      const parts = name.split(',').map(p => p.trim());
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
      return name;
    };

    // Parse parent name
    const parseParentName = (name) => {
      if (!name) return '';
      const parts = name.split(',').map(p => p.trim());
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
      return name;
    };

    data.forEach(row => {
      // Extract student
      const studentName = parseStudentName(row['Enrollee Name']);
      if (studentName && !students.has(studentName)) {
        students.set(studentName, {
          name: studentName,
          age: parseFloat(row['Age']) || null,
          parent_name: parseParentName(row['Primary Payer Name']),
          parent_email: row['Email']?.toLowerCase() || '',
          phone: row['Primary Phone'] || '',
          status: 'active',
          level: row['Age Category'] || 'Beginner',
        });
      }

      // Extract class
      const classTitle = row['Classes'];
      if (classTitle && !classes.has(classTitle)) {
        const weekday = row['Weekdays']?.trim();
        const day = dayMap[weekday] || weekday?.charAt(0)?.toUpperCase() || 'M';
        
        classes.set(classTitle, {
          title: classTitle,
          style: row['Class Category'] || '',
          day: day,
          start_time: parseTime(row['Time From']),
          duration: calcDuration(row['Time From'], row['Time To']) || 1,
          teacher: row['Instructor(s)'] || '',
          room: row['Location'] || '',
          student_names: [],
          type: 'class',
        });
      }

      // Add student to class
      if (classTitle && studentName) {
        const classData = classes.get(classTitle);
        if (classData && !classData.student_names.includes(studentName)) {
          classData.student_names.push(studentName);
        }
      }

      // Extract teacher
      const instructor = row['Instructor(s)'];
      if (instructor) {
        // Handle multiple instructors
        instructor.split(/[,&]/).forEach(t => {
          const name = t.trim();
          if (name) teachers.add(name);
        });
      }

      // Extract room
      const location = row['Location'];
      if (location) rooms.add(location);
    });

    return {
      students: Array.from(students.values()),
      classes: Array.from(classes.values()),
      teachers: Array.from(teachers),
      rooms: Array.from(rooms),
    };
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const entities = extractEntities(csvData);
      const errors = [];
      let created = { students: 0, classes: 0, teachers: 0, rooms: 0 };
      const total = entities.students.length + entities.classes.length + entities.teachers.length + entities.rooms.length;
      let processed = 0;

      // Create Rooms first
      for (const roomName of entities.rooms) {
        try {
          await base44.entities.Room.create({ name: roomName });
          created.rooms++;
        } catch (err) {
          errors.push({ type: 'Room', name: roomName, error: err.message });
        }
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Create Teachers
      for (const teacherName of entities.teachers) {
        try {
          await base44.entities.Teacher.create({ 
            name: teacherName,
            styles: [], // Will be populated based on classes later
          });
          created.teachers++;
        } catch (err) {
          errors.push({ type: 'Teacher', name: teacherName, error: err.message });
        }
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Create Students
      for (const student of entities.students) {
        try {
          await base44.entities.Student.create(student);
          created.students++;
        } catch (err) {
          errors.push({ type: 'Student', name: student.name, error: err.message });
        }
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Create Classes
      for (const classData of entities.classes) {
        try {
          await base44.entities.DanceClass.create(classData);
          created.classes++;
        } catch (err) {
          errors.push({ type: 'Class', name: classData.title, error: err.message });
        }
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      return { created, errors, total };
    },
    onSuccess: (data) => {
      setResults(data);
      setImportStatus('complete');
    },
    onError: (err) => {
      console.error('Import error:', err);
      setImportStatus('error');
    }
  });

  const startImport = () => {
    setImportStatus('importing');
    setProgress(0);
    importMutation.mutate();
  };

  const preview = csvData ? extractEntities(csvData) : null;

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <EtchedText size="2xl">Studio Onboarding</EtchedText>
          <p style={{ color: colors.muted }}>
            Import your roster to set up students, classes, teachers, and rooms
          </p>
        </div>

        {/* Upload Area */}
        {importStatus === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '60px 40px',
              borderRadius: '32px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              border: '2px dashed rgba(200, 180, 170, 0.4)',
              boxShadow: '0 4px 24px rgba(180, 120, 120, 0.08)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            className="hover:border-[#8a7070] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(145deg, #faf4f4 0%, #f5ebeb 100%)',
              boxShadow: '4px 4px 10px rgba(210, 190, 190, 0.2), -4px -4px 10px rgba(255, 255, 255, 0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Upload size={32} style={{ color: colors.etchDark }} />
            </div>
            <EtchedText size="lg">Drop your CSV roster here</EtchedText>
            <p style={{ color: colors.muted, marginTop: '8px' }}>
              or click to browse files
            </p>
          </motion.div>
        )}

        {/* Parsing State */}
        {importStatus === 'parsing' && (
          <div className="text-center py-20">
            <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.etchLight }} />
            <p style={{ color: colors.muted, marginTop: '16px' }}>Reading your roster...</p>
          </div>
        )}

        {/* Preview State */}
        {importStatus === 'previewing' && preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* File Info */}
            <div style={{
              padding: '20px 24px',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              border: '1px solid rgba(200, 180, 170, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <FileSpreadsheet size={24} style={{ color: colors.etchDark }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: colors.ink }}>{file?.name}</div>
                <div style={{ fontSize: '13px', color: colors.muted }}>{csvData?.length} rows</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setFile(null);
                setCsvData(null);
                setImportStatus('idle');
              }}>
                Change File
              </Button>
            </div>

            {/* Preview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PreviewCard icon={Users} label="Students" count={preview.students.length} color={colors.green} />
              <PreviewCard icon={Calendar} label="Classes" count={preview.classes.length} color={colors.etchDark} />
              <PreviewCard icon={GraduationCap} label="Teachers" count={preview.teachers.length} color={colors.amber} />
              <PreviewCard icon={MapPin} label="Rooms" count={preview.rooms.length} color={colors.etchLight} />
            </div>

            {/* Sample Preview */}
            <div style={{
              padding: '24px',
              borderRadius: '24px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              border: '1px solid rgba(200, 180, 170, 0.2)',
            }}>
              <h3 style={{ fontWeight: '600', color: colors.ink, marginBottom: '16px' }}>Sample Students</h3>
              <div className="space-y-2">
                {preview.students.slice(0, 5).map((s, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(145deg, #faf4f4 0%, #f5ebeb 100%)',
                      boxShadow: '2px 2px 5px rgba(210, 190, 190, 0.2), -2px -2px 5px rgba(255, 255, 255, 0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontSize: '14px', fontWeight: '500',
                        color: 'transparent',
                        backgroundImage: 'linear-gradient(180deg, #c4a8a8 0%, #9a7878 100%)',
                        backgroundClip: 'text', WebkitBackgroundClip: 'text',
                      }}>
                        {s.name.charAt(0)}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: colors.ink }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: colors.muted }}>
                        {s.age ? `${Math.round(s.age)} yrs` : ''} • {s.parent_email || 'No email'}
                      </div>
                    </div>
                  </div>
                ))}
                {preview.students.length > 5 && (
                  <p style={{ color: colors.muted, fontSize: '13px', textAlign: 'center', paddingTop: '8px' }}>
                    +{preview.students.length - 5} more students
                  </p>
                )}
              </div>
            </div>

            {/* Import Button */}
            <Button 
              onClick={startImport}
              className="w-full h-14 text-lg rounded-2xl"
              style={{ backgroundColor: colors.ink }}
            >
              Start Import
            </Button>
          </motion.div>
        )}

        {/* Importing State */}
        {importStatus === 'importing' && (
          <div style={{
            padding: '60px 40px',
            borderRadius: '32px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
            border: '1px solid rgba(200, 180, 170, 0.2)',
            textAlign: 'center',
          }}>
            <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.etchLight }} />
            <EtchedText size="lg" className="block mt-6">Importing your studio data...</EtchedText>
            <p style={{ color: colors.muted, marginTop: '8px', marginBottom: '24px' }}>
              This may take a few minutes
            </p>
            <Progress value={progress} className="h-2 max-w-md mx-auto" />
            <p style={{ color: colors.muted, marginTop: '12px', fontSize: '14px' }}>{progress}%</p>
          </div>
        )}

        {/* Complete State */}
        {importStatus === 'complete' && results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div style={{
              padding: '40px',
              borderRadius: '32px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
              border: '1px solid rgba(200, 180, 170, 0.2)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: `linear-gradient(145deg, ${colors.green}30 0%, ${colors.green}20 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <CheckCircle2 size={40} style={{ color: colors.green }} />
              </div>
              <EtchedText size="xl">Import Complete!</EtchedText>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <ResultCard icon={Users} label="Students" count={results.created.students} />
                <ResultCard icon={Calendar} label="Classes" count={results.created.classes} />
                <ResultCard icon={GraduationCap} label="Teachers" count={results.created.teachers} />
                <ResultCard icon={MapPin} label="Rooms" count={results.created.rooms} />
              </div>
            </div>

            {/* Errors Section */}
            {results.errors.length > 0 && (
              <div style={{
                padding: '24px',
                borderRadius: '24px',
                background: `${colors.red}10`,
                border: `1px solid ${colors.red}30`,
              }}>
                <button 
                  onClick={() => setShowErrors(!showErrors)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} style={{ color: colors.red }} />
                    <span style={{ fontWeight: '600', color: colors.ink }}>
                      {results.errors.length} items failed to import
                    </span>
                  </div>
                  {showErrors ? <ChevronUp size={20} style={{ color: colors.muted }} /> : <ChevronDown size={20} style={{ color: colors.muted }} />}
                </button>
                
                <AnimatePresence>
                  {showErrors && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {results.errors.map((err, i) => (
                          <div key={i} style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.8)',
                            fontSize: '13px',
                          }}>
                            <div style={{ fontWeight: '500', color: colors.ink }}>
                              {err.type}: {err.name}
                            </div>
                            <div style={{ color: colors.red, marginTop: '4px' }}>
                              {err.error}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => {
                  setFile(null);
                  setCsvData(null);
                  setResults(null);
                  setImportStatus('idle');
                }}
              >
                Import Another File
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl"
                style={{ backgroundColor: colors.ink }}
                onClick={() => window.location.href = '/students'}
              >
                View Students
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {importStatus === 'error' && (
          <div style={{
            padding: '60px 40px',
            borderRadius: '32px',
            background: `${colors.red}10`,
            border: `1px solid ${colors.red}30`,
            textAlign: 'center',
          }}>
            <XCircle size={48} style={{ color: colors.red, margin: '0 auto' }} />
            <EtchedText size="lg" className="block mt-6">Something went wrong</EtchedText>
            <p style={{ color: colors.muted, marginTop: '8px' }}>
              Please check your file format and try again
            </p>
            <Button 
              variant="outline"
              className="mt-6"
              onClick={() => {
                setFile(null);
                setCsvData(null);
                setImportStatus('idle');
              }}
            >
              Try Again
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

function PreviewCard({ icon: Icon, label, count, color }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: '20px',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,252,250,0.9) 100%)',
      border: '1px solid rgba(200, 180, 170, 0.2)',
      textAlign: 'center',
    }}>
      <Icon size={24} style={{ color, margin: '0 auto 12px' }} />
      <EtchedText size="lg">{count}</EtchedText>
      <div style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function ResultCard({ icon: Icon, label, count }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
    }}>
      <Icon size={20} style={{ color: colors.green, margin: '0 auto 8px' }} />
      <div style={{ fontSize: '24px', fontWeight: '700', color: colors.ink }}>{count}</div>
      <div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}