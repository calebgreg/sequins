import { useMemo } from 'react';

export default function useNoteInference({ content, classes = [], student = null, students = [] }) {
  return useMemo(() => {
    if (!content) return { 
        detectedTags: [], 
        inferredCategory: 'general', 
        inferredSentiment: 'neutral', 
        matchedClass: null 
    };

    const lowerContent = content.toLowerCase();
    const tags = new Set();

    // 1. Class names
    let matchedClass = null;
    classes.forEach(cls => {
        if (cls?.title && lowerContent.includes(cls.title.toLowerCase())) {
            tags.add(cls.title);
            if (!matchedClass) matchedClass = cls.title;
        }
    });

    // 2. Student Interests (if single student provided)
    if (student?.interests) {
        student.interests.forEach(interest => {
            if (interest && lowerContent.includes(interest.toLowerCase())) {
                tags.add(interest);
            }
        });
    }
    
    // 3. Student Names (if students list provided)
    if (students.length > 0) {
        students.forEach(s => {
             if (s?.name && lowerContent.includes(s.name.toLowerCase())) {
                 tags.add(s.name);
             }
        });
    }

    // 4. Common Dance Dictionary
    const commonTerms = [
        'technique', 'flexibility', 'turnout', 'posture', 'alignment', 'extension',
        'pirouette', 'fouetté', 'plié', 'tendu', 'jeté', 'arabesque', 'attitude', 'developpé',
        'musicality', 'performance', 'focus', 'energy', 'timing', 'rhythm',
        'exam', 'competition', 'recital', 'choreography', 'improv', 'barre', 'center'
    ];
    
    commonTerms.forEach(term => {
        if (lowerContent.includes(term.toLowerCase())) {
            tags.add(term.charAt(0).toUpperCase() + term.slice(1));
        }
    });
    
    // 5. Infer Category
    let inferredCategory = 'general';
    if (lowerContent.includes('behavior') || lowerContent.includes('focus') || lowerContent.includes('attitude') || lowerContent.includes('late') || lowerContent.includes('disrupt') || lowerContent.includes('listening')) inferredCategory = 'behavior';
    else if (lowerContent.includes('technique') || lowerContent.includes('posture') || lowerContent.includes('turnout') || lowerContent.includes('feet') || lowerContent.includes('arms') || lowerContent.includes('pointed')) inferredCategory = 'technique';
    else if (lowerContent.includes('improve') || lowerContent.includes('better') || lowerContent.includes('progress') || lowerContent.includes('growth') || lowerContent.includes('stronger') || lowerContent.includes('achieved')) inferredCategory = 'progress';

    // 6. Infer Sentiment
    let inferredSentiment = 'neutral';
    const positiveWords = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'strong', 'improved', 'best', 'beautiful', 'love', 'proud'];
    const constructiveWords = ['needs work', 'struggle', 'hard', 'try', 'focus', 'attention', 'fix', 'correct', 'difficult', 'trouble'];
    
    if (positiveWords.some(w => lowerContent.includes(w))) inferredSentiment = 'positive';
    else if (constructiveWords.some(w => lowerContent.includes(w))) inferredSentiment = 'constructive';

    return {
        detectedTags: Array.from(tags),
        inferredCategory,
        inferredSentiment,
        matchedClass
    };
  }, [content, classes, student, students]);
}