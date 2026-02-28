import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase'; 

// <-- NEW: We imported the tools to bypass the Android fetch block
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

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

// --- 1. LOGIN SCREEN ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Sign Up Failed', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.loginContent}>
        <Text style={styles.loginBrand}>Memory Lane</Text>
        <Text style={styles.loginSubtitle}>A private collection for loved ones.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#B0A89A" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#B0A89A" secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.loginButton, styles.signInBtn]} onPress={signInWithEmail} disabled={loading}>
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.loginButton, styles.signUpBtn]} onPress={signUpWithEmail} disabled={loading}>
            <Text style={[styles.loginButtonText, styles.signUpText]}>Create Account</Text>
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />}
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 2. MEMORY CARD COMPONENT ---
const MemoryCard = ({ memory }) => {
  const coverImage = memory.media_urls && memory.media_urls.length > 0 ? memory.media_urls[0] : null;

  return (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9}>
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, { backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>A Treasured Memory</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardDate}>{memory.date}</Text>
        <Text style={styles.cardTitle}>{memory.title}</Text>
        {memory.description ? <Text style={styles.cardPreview} numberOfLines={2}>{memory.description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

// --- 3. HOME SCREEN ---
function HomeScreen({ navigation }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', user.id) 
        .order('id', { ascending: false }); 
      
      if (!error && data) setMemories(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMemories();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Memories</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>A curated collection of beautiful moments.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 50 }} />
      ) : memories.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.secondary, fontSize: 16 }}>No memories yet. Tap '+' to add your first one!</Text>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MemoryCard memory={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }} 
        />
      )}
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMemory')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- 4. ADD MEMORY SCREEN ---
function AddMemoryScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]); 
  const [isSaving, setIsSaving] = useState(false);

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8, 
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(asset => asset.uri);
      setSelectedMedia([...selectedMedia, ...newMedia]);
    }
  };

  const handleSaveMemory = async () => {
    if (!title) {
      Alert.alert('Hold on!', 'Please give your memory a title.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let uploadedUrls = [];

      // 1. Upload each photo/video to the storage bucket safely
      for (const uri of selectedMedia) {
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`; 

        // <-- THE FIX: Convert the file to raw Base64 data, decode it, and push it directly
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const arrayBuffer = decode(base64);

        const { error: uploadError } = await supabase.storage.from('memory_media').upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
        });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('memory_media').getPublicUrl(filePath);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // 2. Save the text and the URLs to the database table
      const { error: insertError } = await supabase.from('memories').insert({
        user_id: user.id,
        title: title,
        date: date,
        description: description,
        media_urls: uploadedUrls
      });

      if (insertError) throw insertError;

      // 3. Success! Go back to the home screen
      navigation.goBack();
      
    } catch (error) {
      Alert.alert('Error Saving Memory', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isSaving}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>New Memory</Text>
          <View style={{ width: 50 }} /> 
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroller}>
          {selectedMedia.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.thumbnailImage} />
          ))}
          <TouchableOpacity style={styles.addMoreMediaBox} onPress={pickImageAsync} disabled={isSaving}>
            <Text style={styles.addMoreMediaText}>{selectedMedia.length > 0 ? '+ Add More' : '+ Add Photos/Videos'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Memory Title</Text>
          <TextInput style={styles.input} placeholder="e.g., The day we met..." placeholderTextColor="#B0A89A" value={title} onChangeText={setTitle} editable={!isSaving} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} placeholder="e.g., February 28, 2026" placeholderTextColor="#B0A89A" value={date} onChangeText={setDate} editable={!isSaving} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>The Story</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="What made this moment so special?" placeholderTextColor="#B0A89A" multiline numberOfLines={5} value={description} onChangeText={setDescription} textAlignVertical="top" editable={!isSaving} />
        </View>

        <TouchableOpacity style={[styles.saveButton, isSaving && { backgroundColor: COLORS.secondary }]} onPress={handleSaveMemory} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Memory</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="AddMemory" component={AddMemoryScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 34, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5 },
  logoutText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  headerSubtitle: { fontSize: 16, color: COLORS.secondary, marginTop: 8, fontWeight: '500' },
  
  loginContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  loginContent: { paddingHorizontal: 32, paddingBottom: 40 },
  loginBrand: { fontSize: 40, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -1 },
  loginSubtitle: { fontSize: 16, color: COLORS.secondary, textAlign: 'center', marginBottom: 48 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  loginButton: { flex: 1, paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  signInBtn: { backgroundColor: COLORS.accent, marginRight: 8, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  signUpBtn: { backgroundColor: COLORS.background, borderWidth: 2, borderColor: COLORS.accent, marginLeft: 8 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signUpText: { color: COLORS.accent },

  cardContainer: { backgroundColor: COLORS.cardWhite, marginHorizontal: 24, marginBottom: 24, borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardImage: { width: '100%', height: 200 },
  cardContent: { padding: 20 },
  cardDate: { fontSize: 12, color: COLORS.secondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  cardPreview: { fontSize: 15, color: '#666', lineHeight: 22 },
  
  fab: { position: 'absolute', bottom: 40, right: 24, backgroundColor: COLORS.accent, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabText: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: -4 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 10 : 40, marginBottom: 30 },
  backButtonText: { fontSize: 16, color: COLORS.secondary, fontWeight: '600' },
  screenTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  
  mediaScroller: { flexDirection: 'row', marginBottom: 24 },
  thumbnailImage: { width: 120, height: 160, borderRadius: 12, marginRight: 12, resizeMode: 'cover' },
  addMoreMediaBox: { width: 120, height: 160, backgroundColor: COLORS.inputBackground, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#D6CFC4', marginRight: 24 },
  addMoreMediaText: { color: COLORS.secondary, fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 10 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: COLORS.inputBackground, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.textPrimary },
  textArea: { height: 120, paddingTop: 16 },
  saveButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});