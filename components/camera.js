import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { studentService } from '../utils/studentService';

const CameraScreen = ({ onClose, onStudentScanned }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const cameraRef = useRef(null);
  const lastScannedData = useRef('');

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanCooldown || data === lastScannedData.current) {
      return;
    }

    setScanCooldown(true);
    lastScannedData.current = data;
    
    console.log("QR escaneado:", data);
    
    try {
      setLoading(true);
      
      const boleta = studentService.extractBoletaFromQR(data);
      
      console.log("Buscando estudiante con boleta:", boleta);
      const studentData = await studentService.getStudentByBoleta(boleta);
      
      if (!studentData) {
        Alert.alert('No Encontrado', `No se encontró al alumno con boleta: ${boleta}`);
        setTimeout(() => {
          setScanCooldown(false);
          lastScannedData.current = '';
        }, 1000);
        return;
      }

      const [schedule, accredited] = await Promise.all([
        studentService.getStudentSchedule(studentData.groupId),
        studentService.getAccreditedSubjects(boleta)
      ]);

      await studentService.registerConsultation(boleta, studentData.name, 'qr_scan');
      
      onStudentScanned(studentData, schedule, accredited);
      
    } catch (error) {
      console.error("Error procesando QR:", error);
      Alert.alert('Error', error.message || 'Error al procesar los datos');
    } finally {
      setLoading(false);
      
      setTimeout(() => {
        setScanCooldown(false);
        lastScannedData.current = '';
      }, 2000);
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

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Solicitando permiso de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>
          Necesitamos tu permiso para usar la cámara
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  loadingText: {
    color: '#8B2453',
    fontSize: 16,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    fontWeight: 'bold',
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
  button: {
    backgroundColor: '#8B2453',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen;