import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// --- OUR LUXURY DESIGN SYSTEM ---
const COLORS = {
  background: '#F9F7F2', 
  textPrimary: '#2D2926', 
  accent: '#C4A484', 
  secondary: '#A3B18A', 
  cardWhite: '#FFFFFF',
  inputBackground: '#F0EBE1', 
};

const Stack = createNativeStackNavigator();

// --- DUMMY DATA ---
const DUMMY_MEMORIES = [
  {
    id: '1',
    title: 'Summer at the Lake',
    date: 'August 14, 2025',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=800&auto=format&fit=crop',
    preview: 'The water was so calm that morning, and we just sat there listening to the birds...'
  }
];

// --- 1. NEW LOGIN SCREEN ---
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // This is a temporary fake login just to test the UI!
  const handleLogin = () => {
    navigation.replace('Home'); 
  };

  return (
    <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.loginContent}>
        <Text style={styles.loginBrand}>Memory Lane</Text>
        <Text style={styles.loginSubtitle}>A private collection for loved ones.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your email" 
            placeholderTextColor="#B0A89A"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your password" 
            placeholderTextColor="#B0A89A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Access Memories</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 2. MEMORY CARD COMPONENT ---
const MemoryCard = ({ memory }) => (
  <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9}>
    <Image source={{ uri: memory.image }} style={styles.cardImage} />
    <View style={styles.cardContent}>
      <Text style={styles.cardDate}>{memory.date}</Text>
      <Text style={styles.cardTitle}>{memory.title}</Text>
      <Text style={styles.cardPreview} numberOfLines={2}>{memory.preview}</Text>
    </View>
  </TouchableOpacity>
);

// --- 3. HOME SCREEN ---
function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Memories</Text>
        <Text style={styles.headerSubtitle}>A curated collection of beautiful moments.</Text>
      </View>

      <FlatList
        data={DUMMY_MEMORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryCard memory={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} 
      />
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMemory')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- 4. UPGRADED ADD MEMORY SCREEN ---
function AddMemoryScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  
  // <-- UPGRADE: Now an Array to hold multiple images
  const [selectedMedia, setSelectedMedia] = useState([]); 

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true, // <-- UPGRADE: Allows picking more than one!
      quality: 1,
    });

    if (!result.canceled) {
      // Extract the URIs from the selected items and add them to our array
      const newMedia = result.assets.map(asset => asset.uri);
      setSelectedMedia([...selectedMedia, ...newMedia]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>New Memory</Text>
          <View style={{ width: 50 }} /> 
        </View>
        
        {/* <-- UPGRADE: Horizontal scrolling gallery for multiple images */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroller}>
          {selectedMedia.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.thumbnailImage} />
          ))}
          
          <TouchableOpacity style={styles.addMoreMediaBox} onPress={pickImageAsync}>
            <Text style={styles.addMoreMediaText}>{selectedMedia.length > 0 ? '+ Add More' : '+ Add Photos/Videos'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Memory Title</Text>
          <TextInput style={styles.input} placeholder="e.g., The day we met..." placeholderTextColor="#B0A89A" value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} placeholder="e.g., February 28, 2026" placeholderTextColor="#B0A89A" value={date} onChangeText={setDate} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>The Story</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="What made this moment so special?" placeholderTextColor="#B0A89A" multiline numberOfLines={5} value={description} onChangeText={setDescription} textAlignVertical="top" />
        </View>

        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Memory</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <NavigationContainer>
      {/* Notice the initialRouteName is now 'Login' */}
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddMemory" component={AddMemoryScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 24 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: COLORS.secondary, marginTop: 8, fontWeight: '500' },
  
  // Login Styles
  loginContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  loginContent: { paddingHorizontal: 32, paddingBottom: 40 },
  loginBrand: { fontSize: 40, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -1 },
  loginSubtitle: { fontSize: 16, color: COLORS.secondary, textAlign: 'center', marginBottom: 48 },
  loginButton: { backgroundColor: COLORS.accent, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Card Styles
  cardContainer: { backgroundColor: COLORS.cardWhite, marginHorizontal: 24, marginBottom: 24, borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardImage: { width: '100%', height: 200 },
  cardContent: { padding: 20 },
  cardDate: { fontSize: 12, color: COLORS.secondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  cardPreview: { fontSize: 15, color: '#666', lineHeight: 22 },
  
  // Form Styles
  fab: { position: 'absolute', bottom: 40, right: 24, backgroundColor: COLORS.accent, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabText: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: -4 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 10 : 40, marginBottom: 30 },
  backButtonText: { fontSize: 16, color: COLORS.secondary, fontWeight: '600' },
  screenTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  
  // Media Array Styles
  mediaScroller: { flexDirection: 'row', marginBottom: 24 },
  thumbnailImage: { width: 120, height: 160, borderRadius: 12, marginRight: 12, resizeMode: 'cover' },
  addMoreMediaBox: { width: 120, height: 160, backgroundColor: COLORS.inputBackground, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#D6CFC4', marginRight: 24 },
  addMoreMediaText: { color: COLORS.secondary, fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 10 },
  
  // Input Styles
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: COLORS.inputBackground, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.textPrimary },
  textArea: { height: 120, paddingTop: 16 },
  saveButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});