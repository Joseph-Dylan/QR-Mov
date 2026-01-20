import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MainMenu = ({
  studentData,
  onOpenCamera,
  onOpenSearch,
  onOpenInfo,
  onOpenHistory,
  onLogout,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>QR PASS APP</Text>
      </View>
      
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>Menú Principal</Text>
        
        {studentData ? (
          <View style={styles.scannedStudentInfo}>
            <Text style={styles.scannedStudentName}>{studentData.name}</Text>
            <Text style={styles.scannedStudentBoleta}>Boleta: {studentData.boleta}</Text>
            <Text style={styles.scannedStudentGroup}>Grupo: {studentData.groupId?.replace('group_', '')}</Text>
            <Text style={styles.scannedStudentCareer}>Carrera: {studentData.career || 'No especificada'}</Text>
            <View style={styles.statusBadge}>
              <Text style={studentData?.blocked ? styles.blockedBadgeText : styles.activeBadgeText}>
                {studentData?.blocked ? 'BLOQUEADO' : 'ACTIVO'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noStudentInfo}>
            <Text style={styles.noStudentText}>No se ha seleccionado ningún estudiante</Text>
            <Text style={styles.noStudentSubtext}>Escanea un QR o busca manualmente</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.menuButton} onPress={onOpenSearch}>
          <Text style={styles.menuButtonText}>Buscar Alumno Manualmente</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onOpenInfo} 
          disabled={!studentData}
        >
          <Text style={[styles.menuButtonText, !studentData && styles.disabledButtonText]}>
            Ver Información del Alumno
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onOpenHistory} 
          disabled={!studentData}
        >
          <Text style={[styles.menuButtonText, !studentData && styles.disabledButtonText]}>
            Ver Historial de Consultas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.thirdButton} onPress={onOpenCamera}>
          <Text style={styles.thirdButtonText}>
            {studentData ? 'Escanear Otro QR' : 'Escanear QR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  appTitle: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  scannedStudentInfo: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
    width: '100%',
    alignItems: 'center',
  },
  scannedStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  scannedStudentBoleta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  scannedStudentGroup: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  scannedStudentCareer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    marginTop: 5,
  },
  activeBadgeText: {
    color: '#27ae60',
    fontWeight: 'bold',
    fontSize: 12,
  },
  blockedBadgeText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noStudentInfo: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderStyle: 'dashed',
    width: '100%',
  },
  noStudentText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  noStudentSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#8B2453',
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    minWidth: 250,
  },
  menuButtonText: {
    color: '#8B2453',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#AAA',
  },
  thirdButton: {
    backgroundColor: '#8B2453',
    borderWidth: 2,
    borderColor: '#591634',
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    minWidth: 250,
  },
  thirdButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 30,
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    minWidth: 250,
  },
  logoutButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainMenu;