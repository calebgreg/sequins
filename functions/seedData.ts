import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const TEACHERS = [
  { name: "Miss Sarah", email: "sarah@studio.com", styles: ["Ballet", "Lyrical", "Contemporary"], bio: "Former principal dancer with 15 years teaching experience." },
  { name: "Mr. John", email: "john@studio.com", styles: ["Hip Hop", "Jazz", "Tap"], bio: "Energy and rhythm expert specializing in street styles." },
  { name: "Ms. Emily", email: "emily@studio.com", styles: ["Tap", "Jazz", "Musical Theater"], bio: "Broadway veteran bringing stage presence to every class." },
  { name: "Miss Jessica", email: "jessica@studio.com", styles: ["Ballet", "Pointe", "Conditioning"], bio: "Focuses on technique and injury prevention." }
];

const STYLES = ["Ballet", "Jazz", "Tap", "Hip Hop", "Lyrical", "Contemporary", "Musical Theater", "Acro"];
const LEVELS = ["Mini", "Petite", "Junior", "Teen", "Senior"];
const DAYS = ["M", "T", "W", "R", "F", "S"];

const FIRST_NAMES = ["Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail", "Emily", "Ella", "Elizabeth", "Camila", "Luna", "Sofia", "Avery", "Mila", "Aria", "Liam", "Noah", "Oliver", "Elijah", "William", "James", "Benjamin", "Lucas", "Henry", "Alexander"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

const COLORS = ["bg-red-200", "bg-orange-200", "bg-amber-200", "bg-yellow-200", "bg-lime-200", "bg-green-200", "bg-emerald-200", "bg-teal-200", "bg-cyan-200", "bg-sky-200", "bg-blue-200", "bg-indigo-200", "bg-violet-200", "bg-purple-200", "bg-fuchsia-200", "bg-pink-200", "bg-rose-200"];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubarray(arr, size) {
    const shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Studio Settings
        const settings = await base44.asServiceRole.entities.StudioSettings.list();
        if (settings.length === 0) {
            await base44.asServiceRole.entities.StudioSettings.create({
                name: "Elevate Dance Academy",
                type: "mixed",
                pricing_model: "per_class",
                levels: LEVELS
            });
        }

        // 2. Teachers
        const existingTeachers = await base44.asServiceRole.entities.Teacher.list();
        if (existingTeachers.length === 0) {
            await base44.asServiceRole.entities.Teacher.bulkCreate(TEACHERS);
        }
        
        // 3. Students
        const students = [];
        const existingStudents = await base44.asServiceRole.entities.Student.list();
        if (existingStudents.length === 0) {
            for (let i = 0; i < 40; i++) {
                const fname = getRandom(FIRST_NAMES);
                const lname = getRandom(LAST_NAMES);
                students.push({
                    name: `${fname} ${lname}`,
                    age: Math.floor(Math.random() * 12) + 6, // 6 to 18
                    level: getRandom(LEVELS),
                    status: "active",
                    color: getRandom(COLORS),
                    interests: [getRandom(STYLES), getRandom(STYLES)],
                    parent_email: `parent${i}@example.com`,
                    parent_name: `Mrs. ${lname}`,
                    joined_date: "2024-09-01"
                });
            }
            const createdStudents = await base44.asServiceRole.entities.Student.bulkCreate(students);
            // Refresh local list with IDs
            students.length = 0;
            students.push(...createdStudents);
        } else {
            students.push(...existingStudents);
        }

        // 4. Classes
        const existingClasses = await base44.asServiceRole.entities.DanceClass.list();
        if (existingClasses.length < 5) {
            const classesToCreate = [];
            const teacherList = await base44.asServiceRole.entities.Teacher.list();
            
            for (const level of LEVELS) {
                for (let i = 0; i < 3; i++) { // 3 classes per level
                    const style = getRandom(STYLES);
                    const teacher = getRandom(teacherList) || { name: "Staff" };
                    
                    // Assign random students
                    const classStudents = getRandomSubarray(students, Math.floor(Math.random() * 8) + 4);
                    const studentNames = classStudents.map(s => s.name);

                    classesToCreate.push({
                        title: `${level} ${style}`,
                        type: "class",
                        style: style,
                        day: getRandom(DAYS),
                        start_time: Math.floor(Math.random() * 5) + 15, // 3pm to 8pm
                        duration: 1,
                        teacher: teacher.name,
                        room: Math.random() > 0.5 ? "Studio A" : "Studio B",
                        student_names: studentNames,
                        tuition_cost: 65
                    });
                }
            }
            await base44.asServiceRole.entities.DanceClass.bulkCreate(classesToCreate);
        }

        return Response.json({ success: true, message: "Data populated successfully" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});