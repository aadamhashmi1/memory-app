import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  Alert, ScrollView, TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

// --- SUPABASE SETUP ---
import 'react-native-url-polyfill/auto'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

const { width } = Dimensions.get('window');
const COLORS = { background: '#F9F7F2', textPrimary: '#2D2926', textSecondary: '#6B6865', accent: '#C4A484', secondary: '#A3B18A', border: '#E1DFD8', white: '#FFFFFF' };

const MemoryContext = createContext();
const Stack = createNativeStackNavigator();

// --- AUTH SCREEN ---
function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("Required", "Please fill all fields.");
    setLoading(true);
    const { error } = isLoginMode 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) Alert.alert("Error", error.message);
    else if (!isLoginMode) Alert.alert("Success", "Account created! Now please Sign In.");
    setLoading(false);
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>Memory Lane</Text>
      <TextInput style={styles.textInput} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.textInput} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.saveButton} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{isLoginMode ? "Sign In" : "Create Account"}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{marginTop: 20}}>
        <Text style={styles.switchAuthText}>{isLoginMode ? "Need an account? Sign Up" : "Have an account? Login"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- HOME SCREEN ---
function HomeScreen({ navigation }) {
  const { memories, fetchMemories, loading } = useContext(MemoryContext);

  // This forces the app to refresh your memories every time you view the Home screen
  useFocusEffect(
    useCallback(() => {
      fetchMemories();
    }, [])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.homeHeader}>
        <Text style={styles.mainHeaderText}>My Memories</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={COLORS.accent} style={{marginTop: 50}} /> :
      <FlatList 
        data={memories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.memoryCard} onPress={() => navigation.navigate('Detail', { memory: item })}>
            <Image source={{ uri: item.media[0]?.uri }} style={styles.cardImage} />
            <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardDate}>{item.date}</Text></View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No memories yet. Add your first one below!</Text>}
      />}
      <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('NewMemory')}><Text style={styles.floatingButtonText}>+ New Memory</Text></TouchableOpacity>
    </View>
  );
}

// --- NEW MEMORY SCREEN ---
function NewMemoryScreen({ navigation }) {
  const [mediaList, setMediaList] = useState([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, quality: 0.5 });
    if (!result.canceled) setMediaList([...mediaList, ...result.assets.map(a => ({ uri: a.uri, type: a.type }))]);
  };

  const uploadFile = async (file) => {
    const fileName = `${Date.now()}-${file.uri.split('/').pop()}`;
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: fileName, type: file.type === 'video' ? 'video/mp4' : 'image/jpeg' });

    const { error } = await supabase.storage.from('memories-bucket').upload(fileName, formData);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('memories-bucket').getPublicUrl(fileName);
    return { uri: urlData.publicUrl, type: file.type };
  };

  const saveToCloud = async () => {
    if (!title || mediaList.length === 0) return Alert.alert("Error", "Title and media required.");
    setUploading(true);
    try {
      const uploadedMedia = await Promise.all(mediaList.map(file => uploadFile(file)));
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('memories').insert([{ user_id: user.id, title, date, description, media: uploadedMedia }]);
      if (error) throw error;
      navigation.goBack();
    } catch (e) { Alert.alert("Upload Failed", e.message); }
    finally { setUploading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>New Memory</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal style={styles.imageContainer}>
          {mediaList.map((m, i) => <Image key={i} source={{ uri: m.uri }} style={styles.selectedImage} />)}
          <TouchableOpacity style={styles.addMoreBox} onPress={pickMedia}><Text style={styles.addMoreText}>+ Media</Text></TouchableOpacity>
        </ScrollView>
        <TextInput style={styles.textInput} placeholder="Memory Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.textInput} placeholder="Date" value={date} onChangeText={setDate} />
        <TextInput style={[styles.textInput, {height: 100}]} multiline placeholder="The Story..." value={description} onChangeText={setDescription} />
      </ScrollView>
      <TouchableOpacity style={styles.saveButton} onPress={saveToCloud} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Sync to Cloud</Text>}
      </TouchableOpacity>
    </View>
  );
}

// --- DETAIL VIEW SCREEN ---
function MemoryDetailScreen({ route, navigation }) {
  const { memory } = route.params;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancelText}>Back</Text></TouchableOpacity></View>
      <ScrollView horizontal pagingEnabled style={{height: 400}}>
        {memory.media.map((m, i) => (
          <View key={i} style={{width: width, height: 400}}>
            {m.type === 'video' ? <Video source={{uri: m.uri}} useNativeControls resizeMode="cover" style={{flex:1}} /> : <Image source={{uri: m.uri}} style={{flex:1}} />}
          </View>
        ))}
      </ScrollView>
      <View style={{padding: 24}}>
        <Text style={styles.mainHeaderText}>{memory.title}</Text>
        <Text style={styles.cardDate}>{memory.date}</Text>
        <Text style={styles.cardDescription}>{memory.description}</Text>
      </View>
    </View>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  // The Security Guard: Keeps you logged in automatically
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const fetchMemories = async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.from('memories').select('*').order('created_at', { ascending: false });
    if (!error) setMemories(data);
    setLoading(false);
  };

  return (
    <MemoryContext.Provider value={{ memories, fetchMemories, loading, session }}>
      <NavigationContainer>
        <Stack.Navigator>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="NewMemory" component={NewMemoryScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Detail" component={MemoryDetailScreen} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </MemoryContext.Provider>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loginContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  loginTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 30 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 20 },
  mainHeaderText: { fontSize: 34, fontWeight: 'bold', color: COLORS.textPrimary },
  logoutText: { color: COLORS.accent, fontWeight: 'bold', marginBottom: 6 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  memoryCard: { backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImage: { width: '100%', height: 220, backgroundColor: '#EEE' },
  cardTextContainer: { padding: 20 },
  cardTitle: { fontSize: 20, fontWeight: 'bold' },
  cardDate: { fontSize: 14, color: COLORS.accent, marginVertical: 4 },
  cardDescription: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24 },
  floatingButton: { position: 'absolute', bottom: 40, left: 24, right: 24, backgroundColor: COLORS.accent, padding: 18, borderRadius: 16, alignItems: 'center' },
  floatingButtonText: { color: COLORS.white, fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  cancelText: { color: COLORS.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 24 },
  imageContainer: { flexDirection: 'row', marginBottom: 20 },
  selectedImage: { width: 100, height: 130, borderRadius: 12, marginRight: 10 },
  addMoreBox: { width: 100, height: 130, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  addMoreText: { color: COLORS.secondary, fontSize: 12 },
  textInput: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  saveButton: { backgroundColor: COLORS.textPrimary, padding: 18, borderRadius: 16, alignItems: 'center', margin: 24 },
  saveButtonText: { color: COLORS.white, fontWeight: 'bold' },
  switchAuthText: { color: COLORS.accent, textAlign: 'center', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, fontSize: 16 }
});