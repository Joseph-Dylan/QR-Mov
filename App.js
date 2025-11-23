import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './utils/firebase';
import { collection, doc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';

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
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [accreditedSubjects, setAccreditedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  // Verificar si hay sesión activa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario ya está loggeado
        setShowLogin(false);
        setShowMenu(true);
      } else {
        // No hay usuario loggeado
        setShowLogin(true);
        setShowMenu(false);
      }
    });
    
    return unsubscribe;
  }, []);

  // Función de login SOLO con Firebase Auth
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      
      // Login directo con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        username, 
        password
      );
      
      // Si llega aquí, el login fue exitoso
      console.log('Usuario autenticado:', userCredential.user.uid);
      setShowLogin(false);
      setShowMenu(true);
      
    } catch (error) {
      console.error('Error de autenticación:', error);
      
      let errorMessage = 'Error al iniciar sesión';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA ESCANEAR QR Y CONSULTAR FIREBASE
  const handleBarCodeScanned = async ({ data }) => {
    console.log("QR escaneado:", data);
    
    try {
      setLoading(true);
      
      // Extraer la boleta de la URL
      const url = new URL(data);
      const boletaParam = url.searchParams.get('boleta');
      
      if (!boletaParam) {
        Alert.alert('Error', 'No se encontró la boleta en el QR');
        return;
      }

      const boleta = boletaParam;
      console.log("Buscando estudiante con boleta:", boleta);

      // 1. Buscar estudiante en Firebase
      const studentDoc = await getDoc(doc(db, 'students', boleta));
      
      if (!studentDoc.exists()) {
        Alert.alert('Error', `No se encontró al alumno con boleta: ${boleta}`);
        return;
      }

      const studentData = studentDoc.data();
      console.log("Datos del estudiante:", studentData);
      setScannedStudentData(studentData);

      // 2. Obtener horario del grupo
      const scheduleQuery = query(
        collection(db, 'group_schedules'), 
        where('groupId', '==', studentData.groupId)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const scheduleData = scheduleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Horarios encontrados:", scheduleData);
      
      // Organizar horario
      const organizedSchedule = organizeScheduleByTime(scheduleData);
      setStudentSchedule(organizedSchedule);

      // 3. Obtener materias acreditadas
      const accreditedQuery = query(
        collection(db, 'accredited_subjects'),
        where('studentId', '==', boleta)
      );
      const accreditedSnapshot = await getDocs(accreditedQuery);
      const accreditedData = accreditedSnapshot.docs.map(doc => doc.data());
      console.log("Materias acreditadas:", accreditedData);
      setAccreditedSubjects(accreditedData);

      // 4. Crear registro del escaneo
      await addDoc(collection(db, 'records'), {
        studentId: boleta,
        studentName: studentData.name,
        door: 'App Móvil',
        timestamp: new Date(),
        recordType: 'consulta',
        recordTypeCode: 0,
        justified: false
      });

      // ✅ DIRECTO AL MENÚ PRINCIPAL SIN ALERT INTERMEDIO
      setShowCamera(false);
      setShowMenu(true);

    } catch (error) {
      console.error("Error procesando QR:", error);
      Alert.alert('Error', 'No se pudieron cargar los datos desde Firebase');
    } finally {
      setLoading(false);
    }
  };

  // ✅ ORGANIZAR HORARIO
  const organizeScheduleByTime = (scheduleData) => {
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
  };

  // ✅ SIMULAR ESCANEO PARA PRUEBAS
  const simulateQRScan = () => {
    handleBarCodeScanned({ 
      data: 'https://coatl.cecyt9.ipn.mx/app/qr_system/accessprocess.php?boleta=2024090001' 
    });
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

  const goBackToHome = async () => {
    try {
      await signOut(auth);
      setShowMenu(false);
      setShowLogin(true);
      setUsername('');
      setPassword('');
      setScannedStudentData(null);
      setStudentSchedule([]);
      setAccreditedSubjects([]);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

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
              placeholder="Email"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.loginHint}>Usa el email y contraseña creados en Firebase Auth</Text>
        </View>
      </View>
    );
  }

  // Pantalla de Horario (SOLO DATOS REALES DE FIREBASE)
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
          {/* Información del estudiante */}
          {scannedStudentData && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{scannedStudentData.name}</Text>
              <Text style={styles.studentDetails}>
                Boleta: {scannedStudentData.boleta} | Grupo: {scannedStudentData.groupId?.replace('group_', '')}
              </Text>
              <Text style={styles.studentDetails}>
              Carrera: {scannedStudentData.career || 'No especificada'}
            </Text>
            </View>
          )}

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
            
            {/* Filas de horarios - SOLO DATOS REALES */}
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

          <View style={styles.espasSection}>
            <Text style={styles.espasTitle}>Materias Acreditadas</Text>
            {accreditedSubjects.length > 0 ? (
              accreditedSubjects.map((subject, index) => (
                <View key={index} style={styles.espaItem}>
                  <Text style={styles.espaText}>• {subject.subjectName}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No hay materias acreditadas</Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Pantalla de Situación Académica (SOLO DATOS REALES DE FIREBASE)
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
          {/* Información del estudiante */}
          {scannedStudentData && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{scannedStudentData.name}</Text>
              <Text style={styles.studentDetails}>
                Boleta: {scannedStudentData.boleta}
              </Text>
              <Text style={styles.studentDetails}>
                Carrera: {scannedStudentData.career || 'No especificada'}
              </Text>
            </View>
          )}

          {/* SOLO DATOS QUE EXISTEN EN FIREBASE */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Situación Actual:</Text>
            <Text style={styles.infoValue}>
              {scannedStudentData?.academicStatus === 'active' ? 'Regular' : 
               scannedStudentData?.academicStatus || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Grupo:</Text>
            <Text style={styles.infoValue}>
              {scannedStudentData?.groupId?.replace('group_', '') || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Retardos:</Text>
            <Text style={styles.infoValue}>{scannedStudentData?.delays || 0}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Sin Credencial:</Text>
            <Text style={styles.infoValue}>{scannedStudentData?.withoutCredential || 0}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={styles.infoValue}>
              {scannedStudentData?.blocked ? 'BLOQUEADO' : 'ACTIVO'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Puerta Abierta:</Text>
            <Text style={styles.infoValue}>
              {scannedStudentData?.openDoor ? 'SÍ' : 'NO'}
            </Text>
          </View>

          {/* Materias acreditadas */}
          <View style={styles.espasSection}>
            <Text style={styles.espasTitle}>Materias Acreditadas</Text>
            {accreditedSubjects.length > 0 ? (
              accreditedSubjects.map((subject, index) => (
                <View key={index} style={styles.espaItem}>
                  <Text style={styles.espaText}>• {subject.subjectName}</Text>
                  {subject.accreditationDate && (
                    <Text style={styles.espaDate}>
                      Acreditada: {new Date(subject.accreditationDate?.seconds * 1000).toLocaleDateString()}
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
        
        {/* Información del estudiante escaneado */}
        {scannedStudentData && (
          <View style={styles.scannedStudentInfo}>
            <Text style={styles.scannedStudentName}>{scannedStudentData.name}</Text>
            <Text style={styles.scannedStudentBoleta}>Boleta: {scannedStudentData.boleta}</Text>
            <Text style={styles.scannedStudentGroup}>Grupo: {scannedStudentData.groupId?.replace('group_', '')}</Text>
            {/* AGREGAR ESTA LÍNEA: */}
            <Text style={styles.scannedStudentCareer}>Carrera: {scannedStudentData.career || 'No especificada'}</Text>
          </View>
        )}
        
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
          onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"]
          }}
        />
        
        {/* Overlay de la cámara */}
        <View style={styles.cameraOverlay}>
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
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B2453" />
                <Text style={styles.loadingText}>Cargando datos...</Text>
              </View>
            )}
            
            <View style={styles.scanFrame}>
              <View style={styles.scanCornerTL} />
              <View style={styles.scanCornerTR} />
              <View style={styles.scanCornerBL} />
              <View style={styles.scanCornerBR} />
            </View>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.simulateButton} onPress={simulateQRScan}>
                <Text style={styles.simulateButtonText}>Simular Escaneo (2024090001)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

// ESTILOS COMPLETOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  loginButtonDisabled: {
    opacity: 0.7,
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
  studentInfo: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#8B2453',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 8,
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
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
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
    marginBottom: 20,
  },
  loadingContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8B2453',
    fontWeight: 'bold',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    position: 'relative',
    marginVertical: 20,
  },
  scanCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#8B2453',
  },
  scanCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#8B2453',
  },
  scanCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#8B2453',
  },
  scanCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#8B2453',
  },
  cameraControls: {
    alignItems: 'center',
  },
  simulateButton: {
    backgroundColor: '#8B2453',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#591634',
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noData: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  scannedStudentCareer: {
  fontSize: 14,
  color: '#666',
  },
});