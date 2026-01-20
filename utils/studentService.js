import { 
  getDoc, 
  doc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

export const studentService = {
  async getStudentByBoleta(boleta) {
    try {
      const studentDoc = await getDoc(doc(db, 'students', boleta));
      return studentDoc.exists() ? { id: studentDoc.id, ...studentDoc.data() } : null;
    } catch (error) {
      console.error("Error obteniendo estudiante:", error);
      throw error;
    }
  },

  async getStudentSchedule(groupId) {
    try {
      const scheduleQuery = query(
        collection(db, 'group_schedules'), 
        where('groupId', '==', groupId)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const scheduleData = scheduleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return this.organizeScheduleByTime(scheduleData);
    } catch (error) {
      console.error("Error obteniendo horario:", error);
      return [];
    }
  },

  async getAccreditedSubjects(studentId) {
    try {
      const accreditedQuery = query(
        collection(db, 'accredited_subjects'),
        where('studentId', '==', studentId)
      );
      const accreditedSnapshot = await getDocs(accreditedQuery);
      return accreditedSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Error obteniendo materias acreditadas:", error);
      return [];
    }
  },

  organizeScheduleByTime(scheduleData) {
    const timeSlots = {};
    
    scheduleData.forEach(classItem => {
      const timeKey = `${classItem.startTime}-${classItem.endTime}`;
      
      if (!timeSlots[timeKey]) {
        timeSlots[timeKey] = {
          time: `${classItem.startTime}-${classItem.endTime}`,
          lun: '-', mar: '-', mie: '-', jue: '-', vie: '-'
        };
      }
      
      const dayMap = {
        'lunes': 'lun',
        'martes': 'mar', 
        'miércoles': 'mie',
        'jueves': 'jue',
        'viernes': 'vie'
      };
      
      const dayKey = dayMap[classItem.day];
      if (dayKey) {
        timeSlots[timeKey][dayKey] = classItem.subjectName;
      }
    });
    
    return Object.values(timeSlots).sort((a, b) => a.time.localeCompare(b.time));
  },

  async searchStudents(searchTerm) {
    try {
      const studentsRef = collection(db, 'students');
      const searchTermLower = searchTerm.toLowerCase();
      
      const allStudentsSnapshot = await getDocs(studentsRef);
      
      const results = [];
      allStudentsSnapshot.docs.forEach(doc => {
        const student = { id: doc.id, ...doc.data() };
        const studentNameLower = student.name ? student.name.toLowerCase() : '';
        const studentBoleta = student.boleta || '';
        
        if (studentNameLower.includes(searchTermLower) || 
            studentBoleta.includes(searchTerm)) {
          results.push(student);
        }
      });
      
      return results.slice(0, 20);
    } catch (error) {
      console.error('Error buscando alumnos:', error);
      throw error;
    }
  },

  async getConsultationHistory(studentId, prefectId) {
    try {
      const historyQuery = query(
        collection(db, 'consultation_history'),
        where('studentId', '==', studentId),
        where('prefectId', '==', prefectId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(historyQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.timestamp?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      throw error;
    }
  },

  async registerConsultation(studentId, studentName, consultationType) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      await addDoc(collection(db, 'consultation_history'), {
        studentId: studentId,
        studentName: studentName,
        prefectId: currentUser.uid,
        prefectEmail: currentUser.email,
        consultationType: consultationType,
        timestamp: new Date(),
        details: `Consulta ${consultationType === 'qr_scan' ? 'por QR' : 'manual'}`
      });
      
      await addDoc(collection(db, 'records'), {
        studentId: studentId,
        studentName: studentName,
        door: 'App Móvil',
        timestamp: new Date(),
        recordType: 'consulta',
        recordTypeCode: 0,
        justified: false
      });
    } catch (error) {
      console.error("Error registrando consulta:", error);
      throw error;
    }
  },

  extractBoletaFromQR(data) {
    try {
      const url = new URL(data);
      const boletaParam = url.searchParams.get('boleta');
      if (boletaParam) {
        return boletaParam;
      }
      throw new Error('No tiene parámetro boleta');
    } catch (error) {
      const match = data.match(/\d{10}/);
      if (match) {
        return match[0];
      }
      throw new Error('QR Inválido: No contiene una boleta válida');
    }
  }
};