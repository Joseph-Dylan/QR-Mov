import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../utils/firebase';
import { studentService } from '../utils/studentService';

const HistoryScreen = ({ onBack, studentData, consultationHistory, onHistoryLoaded }) => {
  const [historyLoading, setHistoryLoading] = useState(false);
  const [localHistory, setLocalHistory] = useState(consultationHistory || []);

  useEffect(() => {
    if (studentData?.boleta) {
      loadConsultationHistory();
    }
  }, [studentData?.boleta]);

  const loadConsultationHistory = async () => {
    if (!studentData?.boleta) return;
    
    try {
      setHistoryLoading(true);
      const user = auth.currentUser;
      if (!user) return;
      
      const history = await studentService.getConsultationHistory(studentData.boleta, user.uid);
      setLocalHistory(history);
      if (onHistoryLoaded) {
        onHistoryLoaded(history);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Consultas</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.historyContent}>
        <View style={styles.historyStudentInfo}>
          <Text style={styles.historyStudentName}>{studentData?.name}</Text>
          <Text style={styles.historyStudentBoleta}>Boleta: {studentData?.boleta}</Text>
          <Text style={styles.historyTotalConsultations}>
            Total de consultas: {localHistory.length}
          </Text>
        </View>
        
        {historyLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#8B2453" />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : localHistory.length > 0 ? (
          localHistory.map((item, index) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                <View style={styles.historyTypeBadge}>
                  <Text style={styles.historyTypeText}>
                    {item.consultationType === 'qr_scan' ? 'QR' : 'Manual'}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyPrefect}>
                Prefecto: {item.prefectEmail || 'Desconocido'}
              </Text>
              <Text style={styles.historyDetails}>{item.details}</Text>
            </View>
          ))
        ) : (
          <View style={styles.noHistory}>
            <Ionicons name="time-outline" size={50} color="#CCC" />
            <Text style={styles.noHistoryText}>No hay consultas registradas</Text>
            <Text style={styles.noHistorySubtext}>Este alumno no ha sido consultado aún</Text>
          </View>
        )}
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
  historyContent: {
    flex: 1,
    padding: 20,
  },
  historyStudentInfo: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
  },
  historyStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  historyStudentBoleta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  historyTotalConsultations: {
    fontSize: 14,
    color: '#8B2453',
    fontWeight: 'bold',
  },
  historyItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B2453',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  historyTypeBadge: {
    backgroundColor: '#8B2453',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyTypeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyPrefect: {
    fontSize: 13,
    color: '#333',
    marginBottom: 5,
  },
  historyDetails: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noHistoryText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noHistorySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#8B2453',
    fontSize: 16,
  },
});

export default HistoryScreen;