import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView, Dimensions, ActivityIndicator, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './utils/firebase';
import { collection, doc, getDoc, getDocs, query, where, addDoc, orderBy, limit } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function App() {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [accreditedSubjects, setAccreditedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const cameraRef = useRef(null);
  const lastScannedData = useRef('');
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setShowLogin(false);
        setShowMenu(true);
      } else {
        setShowLogin(true);
        setShowMenu(false);
      }
    });
    
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        username, 
        password
      );
      
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

  const handleBarCodeScanned = async ({ data }) => {
    if (scanCooldown || data === lastScannedData.current) {
      return;
    }

    setScanCooldown(true);
    lastScannedData.current = data;
    
    console.log("QR escaneado:", data);
    
    try {
      setLoading(true);
      
      let boleta;
      
      try {
        const url = new URL(data);
        const boletaParam = url.searchParams.get('boleta');
        if (boletaParam) {
          boleta = boletaParam;
        } else {
          throw new Error('No tiene parámetro boleta');
        }
      } catch (error) {
        const match = data.match(/\d{10}/);
        if (match) {
          boleta = match[0];
        } else {
          Alert.alert('QR Inválido', 'El código QR no contiene una boleta válida');
          setTimeout(() => {
            setScanCooldown(false);
            lastScannedData.current = '';
          }, 1000);
          return;
        }
      }

      console.log("Buscando estudiante con boleta:", boleta);

      const studentDoc = await getDoc(doc(db, 'students', boleta));
      
      if (!studentDoc.exists()) {
        Alert.alert('No Encontrado', `No se encontró al alumno con boleta: ${boleta}`);
        setTimeout(() => {
          setScanCooldown(false);
          lastScannedData.current = '';
        }, 1000);
        return;
      }

      const studentData = studentDoc.data();
      console.log("Datos del estudiante:", studentData);
      setScannedStudentData(studentData);

      await loadStudentData(boleta, studentData);
      
      await registerConsultation(boleta, studentData.name, 'qr_scan');
      
      await addDoc(collection(db, 'records'), {
        studentId: boleta,
        studentName: studentData.name,
        door: 'App Móvil',
        timestamp: new Date(),
        recordType: 'consulta',
        recordTypeCode: 0,
        justified: false
      });

      setShowCamera(false);
      setShowMenu(true);

    } catch (error) {
      console.error("Error procesando QR:", error);
      Alert.alert('Error', 'Error al procesar los datos');
    } finally {
      setLoading(false);
      
      setTimeout(() => {
        setScanCooldown(false);
        lastScannedData.current = '';
      }, 2000);
    }
  };

  const loadStudentData = async (boleta, studentData) => {
    try {
      const scheduleQuery = query(
        collection(db, 'group_schedules'), 
        where('groupId', '==', studentData.groupId)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const scheduleData = scheduleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const organizedSchedule = organizeScheduleByTime(scheduleData);
      setStudentSchedule(organizedSchedule);

      const accreditedQuery = query(
        collection(db, 'accredited_subjects'),
        where('studentId', '==', boleta)
      );
      const accreditedSnapshot = await getDocs(accreditedQuery);
      const accreditedData = accreditedSnapshot.docs.map(doc => doc.data());
      setAccreditedSubjects(accreditedData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const registerConsultation = async (studentId, studentName, consultationType) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await addDoc(collection(db, 'consultation_history'), {
        studentId: studentId,
        studentName: studentName,
        prefectId: user.uid,
        prefectEmail: user.email,
        consultationType: consultationType,
        timestamp: new Date(),
        details: `Consulta ${consultationType === 'qr_scan' ? 'por QR' : 'manual'}`
      });
    } catch (error) {
      console.error("Error registrando consulta:", error);
    }
  };

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

  const searchStudents = async (queryText) => {
    if (queryText.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      
      const studentsRef = collection(db, 'students');
      
      const searchTermLower = queryText.toLowerCase();
      const searchTermUpper = queryText.toUpperCase();
      
      const allStudentsSnapshot = await getDocs(studentsRef);
      
      const results = [];
      
      allStudentsSnapshot.docs.forEach(doc => {
        const student = { id: doc.id, ...doc.data() };
        const studentNameLower = student.name ? student.name.toLowerCase() : '';
        const studentBoleta = student.boleta || '';
        
        if (studentNameLower.includes(searchTermLower) || 
            studentBoleta.includes(queryText)) {
          results.push(student);
        }
      });
      
      setSearchResults(results.slice(0, 20));
      
    } catch (error) {
      console.error('Error buscando alumnos:', error);
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadConsultationHistory = async (studentId) => {
    if (!studentId) return;
    
    try {
      setHistoryLoading(true);
      
      const historyQuery = query(
    collection(db, 'consultation_history'),
    where('studentId', '==', studentId),
    where('prefectId', '==', user.uid), // ← Solo consultas de ESTE prefecto
    orderBy('timestamp', 'desc'),
    limit(20)
  );
      
      const snapshot = await getDocs(historyQuery);
      const history = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.timestamp?.toDate() || new Date()
        };
      });
      
      setConsultationHistory(history);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStudentSelect = async (student) => {
    try {
      setLoading(true);
      setScannedStudentData(student);
      
      await loadStudentData(student.boleta, student);
      await registerConsultation(student.boleta, student.name, 'manual_search');
      
      setShowSearch(false);
      setShowMenu(true);
    } catch (error) {
      console.error('Error seleccionando estudiante:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del estudiante');
    } finally {
      setLoading(false);
    }
  };

  const simulateQRScan = () => {
    if (scanCooldown) {
      return;
    }
    
    setScanCooldown(true);
    lastScannedData.current = '2024090001';
    handleBarCodeScanned({ 
      data: 'https://coatl.cecyt9.ipn.mx/app/qr_system/accessprocess.php?boleta=2024090001' 
    });
    
    setTimeout(() => {
      setScanCooldown(false);
      lastScannedData.current = '';
    }, 2000);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchStudents(text);
    }, 300);
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  function openCamera() {
    setShowCamera(true);
    setShowMenu(false);
    setScanCooldown(false);
    lastScannedData.current = '';
  }

  function closeCamera() {
    setShowCamera(false);
    setShowMenu(true);
    setScanCooldown(false);
    lastScannedData.current = '';
  }

  function openSearchScreen() {
    setShowMenu(false);
    setShowSearch(true);
    setSearchQuery('');
    setSearchResults([]);
  }

  function openHistoryScreen() {
    if (!scannedStudentData) {
      Alert.alert('Información', 'Primero debes seleccionar un alumno');
      return;
    }
    loadConsultationHistory(scannedStudentData.boleta);
    setShowMenu(false);
    setShowHistory(true);
  }

  function openInfoScreen() {
    setShowMenu(false);
    setShowInfo(true);
  }

  function goBackToMenu() {
    setShowInfo(false);
    setShowSearch(false);
    setShowHistory(false);
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
      setScanCooldown(false);
      lastScannedData.current = '';
      setSearchQuery('');
      setSearchResults([]);
      setConsultationHistory([]);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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

  if (showSearch) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToMenu}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Alumno</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.searchContent}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o boleta..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="words"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {searchLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#8B2453" />
              <Text style={styles.loadingText}>Buscando...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.resultItem}
                  onPress={() => handleStudentSelect(item)}
                >
                  <View style={styles.resultContent}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultDetails}>Boleta: {item.boleta}</Text>
                    <Text style={styles.resultDetails}>Grupo: {item.groupId?.replace('group_', '') || 'N/A'}</Text>
                    <Text style={styles.resultDetails}>Carrera: {item.career || 'No especificada'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B2453" />
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.length >= 2 ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={50} color="#CCC" />
              <Text style={styles.noResultsText}>No se encontraron resultados</Text>
              <Text style={styles.noResultsSubtext}>Intenta con otro nombre o boleta</Text>
            </View>
          ) : (
            <View style={styles.searchHint}>
              <Ionicons name="information-circle-outline" size={30} color="#8B2453" />
              <Text style={styles.searchHintText}>
                Escribe al menos 2 caracteres para buscar
              </Text>
              <Text style={styles.searchHintSubtext}>
                Puedes buscar por nombre del alumno o número de boleta
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToMenu}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historial de Consultas</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.historyContent}>
          <View style={styles.historyStudentInfo}>
            <Text style={styles.historyStudentName}>{scannedStudentData?.name}</Text>
            <Text style={styles.historyStudentBoleta}>Boleta: {scannedStudentData?.boleta}</Text>
            <Text style={styles.historyTotalConsultations}>
              Total de consultas: {consultationHistory.length}
            </Text>
          </View>
          
          {historyLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#8B2453" />
              <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
          ) : consultationHistory.length > 0 ? (
            consultationHistory.map((item, index) => (
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
  }

  if (showInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackToMenu}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Información del Alumno</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.infoContent}>
          {scannedStudentData && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{scannedStudentData.name}</Text>
              <Text style={styles.studentDetails}>
                Boleta: {scannedStudentData.boleta}
              </Text>
              <Text style={styles.studentDetails}>
                Grupo: {scannedStudentData.groupId?.replace('group_', '')}
              </Text>
              <Text style={styles.studentDetails}>
                Carrera: {scannedStudentData.career || 'No especificada'}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Situación Académica</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Situación:</Text>
                <Text style={styles.infoValue}>
                  {scannedStudentData?.academicStatus === 'active' ? 'Regular' : 
                   scannedStudentData?.academicStatus || 'No especificado'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado:</Text>
                <Text style={[styles.infoValue, scannedStudentData?.blocked ? styles.blockedText : styles.activeText]}>
                  {scannedStudentData?.blocked ? 'BLOQUEADO' : 'ACTIVO'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Retardos:</Text>
                <Text style={styles.infoValue}>{scannedStudentData?.delays || 0}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Sin Credencial:</Text>
                <Text style={styles.infoValue}>{scannedStudentData?.withoutCredential || 0}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Puerta Abierta:</Text>
                <Text style={styles.infoValue}>
                  {scannedStudentData?.openDoor ? 'SÍ' : 'NO'}
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

  if (showMenu) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>QR PASS APP</Text>
        </View>
        
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>Menú Principal</Text>
          
          {scannedStudentData ? (
            <View style={styles.scannedStudentInfo}>
              <Text style={styles.scannedStudentName}>{scannedStudentData.name}</Text>
              <Text style={styles.scannedStudentBoleta}>Boleta: {scannedStudentData.boleta}</Text>
              <Text style={styles.scannedStudentGroup}>Grupo: {scannedStudentData.groupId?.replace('group_', '')}</Text>
              <Text style={styles.scannedStudentCareer}>Carrera: {scannedStudentData.career || 'No especificada'}</Text>
              <View style={styles.statusBadge}>
                <Text style={scannedStudentData?.blocked ? styles.blockedBadgeText : styles.activeBadgeText}>
                  {scannedStudentData?.blocked ? 'BLOQUEADO' : 'ACTIVO'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noStudentInfo}>
              <Text style={styles.noStudentText}>No se ha seleccionado ningún estudiante</Text>
              <Text style={styles.noStudentSubtext}>Escanea un QR o busca manualmente</Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.menuButton} onPress={openSearchScreen}>
            <Text style={styles.menuButtonText}>Buscar Alumno Manualmente</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={openInfoScreen} disabled={!scannedStudentData}>
            <Text style={[styles.menuButtonText, !scannedStudentData && styles.disabledButtonText]}>
              Ver Información del Alumno
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={openHistoryScreen} disabled={!scannedStudentData}>
            <Text style={[styles.menuButtonText, !scannedStudentData && styles.disabledButtonText]}>
              Ver Historial de Consultas
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.thirdButton} onPress={openCamera}>
            <Text style={styles.thirdButtonText}>
              {scannedStudentData ? 'Escanear Otro QR' : 'Escanear QR'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={goBackToHome}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showCamera && permission) {
    return (
      <View style={styles.container}>
        <CameraView 
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          onBarcodeScanned={scanCooldown ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"]
          }}
        />
        
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
            
            {scanCooldown && !loading && (
              <View style={styles.cooldownContainer}>
                <Text style={styles.cooldownText}>Procesando...</Text>
              </View>
            )}
            
            <View style={styles.scanFrame}>
              <View style={styles.scanCornerTL} />
              <View style={styles.scanCornerTR} />
              <View style={styles.scanCornerBL} />
              <View style={styles.scanCornerBR} />
            </View>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={[styles.simulateButton, scanCooldown && styles.simulateButtonDisabled]} 
                onPress={simulateQRScan}
                disabled={scanCooldown}
              >
                <Text style={styles.simulateButtonText}>
                  {scanCooldown ? 'Esperando...' : 'Simular Escaneo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

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
  searchContent: {
    flex: 1,
    padding: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8B2453',
    fontSize: 16,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#8B2453',
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  searchHint: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  searchHintText: {
    fontSize: 16,
    color: '#8B2453',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  searchHintSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    width: '48%',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    alignItems: 'center',
  },
  cooldownContainer: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
  },
  cooldownText: {
    color: '#FFD700',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
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
  simulateButtonDisabled: {
    backgroundColor: 'rgba(139, 36, 83, 0.5)',
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});