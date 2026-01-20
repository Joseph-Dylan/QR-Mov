import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../utils/firebase';
import { studentService } from '../utils/studentService';

const SearchScreen = ({ onBack, onStudentSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchStudents(text);
    }, 300);
  };

  const searchStudents = async (queryText) => {
    if (queryText.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await studentService.searchStudents(queryText);
      setSearchResults(results);
    } catch (error) {
      console.error('Error buscando alumnos:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStudentSelect = async (student) => {
    try {
      const [schedule, accredited] = await Promise.all([
        studentService.getStudentSchedule(student.groupId),
        studentService.getAccreditedSubjects(student.boleta)
      ]);

      await studentService.registerConsultation(student.boleta, student.name, 'manual_search');
      
      onStudentSelect(student, schedule, accredited);
    } catch (error) {
      console.error('Error seleccionando estudiante:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
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
});

export default SearchScreen;