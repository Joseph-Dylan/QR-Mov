import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function App() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAcademic, setShowAcademic] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);
  
  const handleLogin = () => {
    if (username === 'admin' && password === '1234') {
      setShowLogin(false);
      setShowCamera(true);
    } else {
      Alert.alert('Error', 'Usuario o contraseña incorrectos');
    }
  };

  function toggleCameraFacing() {
  setFacing(current => (current === 'back' ? 'front' : 'back'));
}

  function openCamera() {
    setShowCamera(true);
    setShowMenu(false);
  }

  function closeCamera() {
    setShowCamera(false);
    setShowMenu(true);
  }

  function simulateQRScan() {
    Alert.alert(
      "QR Escaneado",
      "Boleta escaneada correctamente",
      [
        {
          text: "Continuar",
          onPress: () => {
            setShowCamera(false);
            setShowMenu(true);
          }
        }
      ]
    );
  }

  function openScheduleScreen() {
    setShowMenu(false);
    setShowSchedule(true);
  }

  function openAcademicScreen() {
    setShowMenu(false);
    setShowAcademic(true);
  }

  function goBackToMenu() {
    setShowSchedule(false);
    setShowAcademic(false);
    setShowMenu(true);
  }

  function goBackToHome() {
    setShowMenu(false);
    setShowLogin(true);
    setUsername('');
    setPassword('');
  }

  // Pantalla de Login
  if (showLogin) {
    return (
      <View style={styles.container}>
        <View style={styles.loginContent}>
          <Text style={styles.loginTitle}>QR PASS APP</Text>
          <Text style={styles.loginSubtitle}>Iniciar Sesión</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Ingresar</Text>
          </TouchableOpacity>
          
          <Text style={styles.loginHint}>Usuario: admin | Contraseña: 1234</Text>
        </View>
      </View>
    );
  }

  // Pantalla de Horario
  if (showSchedule) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToMenu}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Horario Semanal</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.scheduleContent}>
          <View style={styles.scheduleTable}>
            {/* Header de días */}
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
            
            {/* Filas de horarios */}
            {[
              { time: '13:00-14:00', lun: 'Física', mar: 'Cálculo', mie: 'Física', jue: 'Cálculo', vie: '-' },
              { time: '14:00-15:00', lun: 'LDS', mar: 'Prog. Web', mie: 'LDS', jue: 'Prog. Web', vie: '-' },
              { time: '15:00-16:00', lun: '-', mar: '-', mie: '-', jue: '-', vie: '-' },
              { time: '16:00-17:00', lun: 'Pruebas', mar: 'Inglés', mie: 'Pruebas', jue: 'Inglés', vie: '-' },
              { time: '17:00-18:00', lun: 'Sist. Dist.', mar: 'Prog. Móvil', mie: 'Sist. Dist.', jue: 'Prog. Móvil', vie: '-' },
              { time: '18:00-19:00', lun: '-', mar: '-', mie: '-', jue: '-', vie: '-' },
              { time: '19:00-20:00', lun: 'Lab. LDS', mar: '-', mie: 'Lab. Prog.', jue: '-', vie: '-' },
              { time: '20:00-21:00', lun: '-', mar: '-', mie: '-', jue: '-', vie: '-' },
            ].map((row, index) => (
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
            ))}
          </View>

          <View style={styles.espasSection}>
            <Text style={styles.espasTitle}>ESPAs (Materias Acreditadas)</Text>
            <View style={styles.espaItem}>
              <Text style={styles.espaText}>• Inglés</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Pantalla de Situación Académica
  if (showAcademic) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToMenu}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Situación Académica</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.academicContent}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Situación Actual:</Text>
            <Text style={styles.infoValue}>Regular</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Adeudos:</Text>
            <Text style={styles.infoValue}>Álgebra</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Carrera:</Text>
            <Text style={styles.infoValue}>Programación</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Semestre Actual:</Text>
            <Text style={styles.infoValue}>4to Semestre</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Turno:</Text>
            <Text style={styles.infoValue}>Vespertino</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Promedio:</Text>
            <Text style={styles.infoValue}>8.5</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Pantalla del menú después del QR
  if (showMenu) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>QR PASS APP</Text>
        </View>
        
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>Menú Principal</Text>
          
          <TouchableOpacity style={styles.menuButton} onPress={openScheduleScreen}>
            <Text style={styles.menuButtonText}>Visualizar Horario</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={openAcademicScreen}>
            <Text style={styles.menuButtonText}>Situación Académica</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.thirdButton} onPress={openCamera}>
            <Text style={styles.thirdButtonText}>Escanear Nuevo QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={goBackToHome}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pantalla de cámara
  if (showCamera && permission) {
    return (
      <View style={styles.container}>
        <CameraView 
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
        >
          <View style={styles.cameraHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={closeCamera}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraContent}>
            <Text style={styles.cameraSubtext}>Enfoca el código QR de la boleta</Text>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.simulateButton} onPress={simulateQRScan}>
                <Text style={styles.simulateButtonText}>Simular Escaneo QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView> 
      </View>
    );
  }

  // Si la cámara no tiene permisos
  if (showCamera && permission?.granted) {
    return (
      <View style={styles.container}>
        <Text>Se necesitan permisos de cámara</Text>
      </View>
    );
  }

  return null;
}

// Los estilos se mantienen igual que antes...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // ... (todos tus estilos existentes se mantienen igual)
  loginContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginTitle: {
    color: '#000000',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loginSubtitle: {
    color: '#8B2453',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#8B2453',
    borderWidth: 2,
    borderColor: '#591634',
    borderRadius: 30,
    paddingHorizontal: 40,
    paddingVertical: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
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
  scheduleContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  scheduleTable: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
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
  espasSection: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
  },
  espasTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  espaItem: {
    marginBottom: 5,
  },
  espaText: {
    fontSize: 14,
    color: '#333',
  },
  academicContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  infoValue: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContent: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  cameraSubtext: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  cameraControls: {
    alignItems: 'center',
  },
  simulateButton: {
    backgroundColor: '#8B2453',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#591634',
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});