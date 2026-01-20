import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InfoScreen = ({ onBack, studentData, studentSchedule, accreditedSubjects }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
      return date.toLocaleDateString('es-MX');
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información del Alumno</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.infoContent}>
        {studentData && (
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{studentData.name}</Text>
            <Text style={styles.studentDetails}>
              Boleta: {studentData.boleta}
            </Text>
            <Text style={styles.studentDetails}>
              Grupo: {studentData.groupId?.replace('group_', '')}
            </Text>
            <Text style={styles.studentDetails}>
              Carrera: {studentData.career || 'No especificada'}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Situación Académica</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Situación:</Text>
              <Text style={styles.infoValue}>
                {studentData?.academicStatus === 'active' ? 'Regular' : 
                 studentData?.academicStatus || 'No especificado'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={[styles.infoValue, studentData?.blocked ? styles.blockedText : styles.activeText]}>
                {studentData?.blocked ? 'BLOQUEADO' : 'ACTIVO'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Puerta Abierta:</Text>
              <Text style={styles.infoValue}>
                {studentData?.openDoor ? 'SÍ' : 'NO'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horario Semanal</Text>
          
          <View style={styles.scheduleTable}>
            <View style={styles.tableHeader}>
              <View style={styles.timeHeaderCell}>
                <Text style={styles.tableHeaderText}>HORA</Text>
              </View>
              <View style={styles.dayCell}>
                <Text style={styles.tableHeaderText}>LUN</Text>
              </View>
              <View style={styles.dayCell}>
                <Text style={styles.tableHeaderText}>MAR</Text>
              </View>
              <View style={styles.dayCell}>
                <Text style={styles.tableHeaderText}>MIÉ</Text>
              </View>
              <View style={styles.dayCell}>
                <Text style={styles.tableHeaderText}>JUE</Text>
              </View>
              <View style={styles.dayCell}>
                <Text style={styles.tableHeaderText}>VIE</Text>
              </View>
            </View>
            
            {studentSchedule.length > 0 ? (
              studentSchedule.map((row, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeText}>{row.time}</Text>
                  </View>
                  <View style={row.lun === '-' ? styles.emptyCell : styles.subjectCell}>
                    <Text style={styles.subjectText}>{row.lun}</Text>
                  </View>
                  <View style={row.mar === '-' ? styles.emptyCell : styles.subjectCell}>
                    <Text style={styles.subjectText}>{row.mar}</Text>
                  </View>
                  <View style={row.mie === '-' ? styles.emptyCell : styles.subjectCell}>
                    <Text style={styles.subjectText}>{row.mie}</Text>
                  </View>
                  <View style={row.jue === '-' ? styles.emptyCell : styles.subjectCell}>
                    <Text style={styles.subjectText}>{row.jue}</Text>
                  </View>
                  <View style={row.vie === '-' ? styles.emptyCell : styles.subjectCell}>
                    <Text style={styles.subjectText}>{row.vie}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No hay horario disponible</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materias Acreditadas</Text>
          {accreditedSubjects.length > 0 ? (
            accreditedSubjects.map((subject, index) => (
              <View key={index} style={styles.espaItem}>
                <Text style={styles.espaText}>• {subject.subjectName}</Text>
                {subject.accreditationDate && (
                  <Text style={styles.espaDate}>
                    Acreditada: {formatDate(subject.accreditationDate)}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No hay materias acreditadas</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  infoContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  studentInfo: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#8B2453',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B2453',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  activeText: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  blockedText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  scheduleTable: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B2453',
    height: 50,
  },
  timeHeaderCell: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FFF',
  },
  dayCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#FFF',
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    minHeight: 60,
  },
  timeCell: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
    padding: 5,
  },
  timeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subjectCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
    padding: 5,
  },
  emptyCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
    padding: 5,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
  },
  espaItem: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B2453',
  },
  espaText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  espaDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    fontStyle: 'italic',
  },
  noData: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default InfoScreen;