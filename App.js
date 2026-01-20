import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebase';

import LoginScreen from './components/login';
import MainMenu from './components/main';
import CameraScreen from './components/camera';
import SearchScreen from './components/buscar';
import HistoryScreen from './components/historial';
import InfoScreen from './components/info';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [accreditedSubjects, setAccreditedSubjects] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setCurrentScreen('menu');
      } else {
        setUser(null);
        setCurrentScreen('login');
      }
    });
    
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setScannedStudentData(null);
      setStudentSchedule([]);
      setAccreditedSubjects([]);
      setConsultationHistory([]);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('menu');
  };

  const navigateTo = (screen) => {
    setCurrentScreen(screen);
  };

  const updateStudentData = (studentData, schedule, accredited) => {
    setScannedStudentData(studentData);
    if (schedule) setStudentSchedule(schedule);
    if (accredited) setAccreditedSubjects(accredited);
  };

  const updateConsultationHistory = (history) => {
    setConsultationHistory(history);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B2453" />
      </View>
    );
  }

  switch (currentScreen) {
    case 'login':
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    
    case 'camera':
      return (
        <CameraScreen
          onClose={() => navigateTo('menu')}
          onStudentScanned={(studentData, schedule, accredited) => {
            updateStudentData(studentData, schedule, accredited);
            navigateTo('menu');
          }}
        />
      );
    
    case 'search':
      return (
        <SearchScreen
          onBack={() => navigateTo('menu')}
          onStudentSelect={(studentData, schedule, accredited) => {
            updateStudentData(studentData, schedule, accredited);
            navigateTo('menu');
          }}
        />
      );
    
    case 'history':
      return (
        <HistoryScreen
          onBack={() => navigateTo('menu')}
          studentData={scannedStudentData}
          consultationHistory={consultationHistory}
          onHistoryLoaded={updateConsultationHistory}
        />
      );
    
    case 'info':
      return (
        <InfoScreen
          onBack={() => navigateTo('menu')}
          studentData={scannedStudentData}
          studentSchedule={studentSchedule}
          accreditedSubjects={accreditedSubjects}
        />
      );
    
    case 'menu':
    default:
      return (
        <MainMenu
          studentData={scannedStudentData}
          onOpenCamera={() => navigateTo('camera')}
          onOpenSearch={() => navigateTo('search')}
          onOpenInfo={() => navigateTo('info')}
          onOpenHistory={() => navigateTo('history')}
          onLogout={handleLogout}
        />
      );
  }
}