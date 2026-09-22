import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Save, Phone, Mail, User, Shield, LogOut, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { userApi } from '../services/user';
import { uploadApi } from '../services/upload';
import { storage } from '../utils/storage';
import TopBar from '../components/TopBar';
import { resolveImageUrl } from '../config/api';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ ...user });
    }
  }, [user]);

  const handlePhotoChange = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error("Permission to access gallery is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        setForm(p => ({ ...p, avatar: result.assets[0].uri }));
      }
    } catch (error) {
      toast.error("Failed to pick image");
    }
  };

  const handleSave = async () => {
    try {
      if (!form.name?.trim()) {
        toast.error("Name cannot be empty.");
        return;
      }
      
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast.error("Please enter a valid email address.");
        return;
      }
      
      setLoading(true);
      
      const updatedData = {
        name: form.name,
        email: form.email,
        avatar: form.avatar || user.avatar,
      };
      
      if (photoUri) {
        try {
          let fileName = photoUri.split('/').pop() || 'upload.jpg';
          if (!fileName.includes('.')) {
            fileName += '.jpg';
          }
          const match = /\.(\w+)$/.exec(fileName);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          const uploadRes = await uploadApi.uploadImage(photoUri, type, fileName);
          if (uploadRes.url) {
            updatedData.avatar = uploadRes.url;
          }
        } catch (err) {
          toast.error("Failed to upload image");
          setLoading(false);
          return;
        }
      }
      
      await userApi.update(user.id, updatedData);
      
      // Update local storage explicitly
      const fullUpdatedUser = { ...user, ...updatedData };
      await storage.setUser(fullUpdatedUser);
      
      // Inform user they might need to restart if they want to see it globally without context method
      // Or we can just trust the reload on next mount.
      
      setEditing(false);
      setPhotoUri(null);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.message || "Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    "Regional Manager": "#3b82f6",
    "Branch Manager": "#22c55e",
    "BDM": "#eab308",
    "Sales Manager": "#f97316",
  };

  const infoItems = [
    { icon: Mail, label: "Email", key: "email", type: "email-address" },
    { icon: Phone, label: "Mobile", key: "mobile", type: "phone-pad", readOnly: true },
    { icon: Shield, label: "Role", key: "role", readOnly: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <View style={styles.avatarWrap}>
            {form.avatar ? (
              <Image source={{ uri: resolveImageUrl(form.avatar) }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            )}
            
            {editing && (
              <TouchableOpacity style={styles.cameraBtn} onPress={handlePhotoChange}>
                <Camera size={16} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColors[user?.role] || 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>My Information</Text>
              <TouchableOpacity 
                style={[styles.editBtn, editing ? styles.editBtnActive : styles.editBtnInactive]} 
                onPress={() => {
                  setEditing(p => !p);
                  if (editing) {
                    setForm({ ...user });
                    setPhotoUri(null);
                  }
                }}
              >
                <Edit2 size={14} color={editing ? colors.slate600 : colors.primary} />
                <Text style={[styles.editBtnText, { color: editing ? colors.slate600 : colors.primary }]}>
                  {editing ? "Cancel" : "Edit"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={14} color={colors.slate500} />
                <Text style={styles.labelText}>Full Name</Text>
              </View>
              <TextInput
                style={[styles.input, editing ? styles.inputActive : styles.inputInactive]}
                value={form.name}
                onChangeText={t => setForm(p => ({ ...p, name: t }))}
                editable={editing}
              />
            </View>

            {infoItems.map(f => (
              <View key={f.key} style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <f.icon size={14} color={colors.slate500} />
                  <Text style={styles.labelText}>{f.label}</Text>
                </View>
                <TextInput
                  style={[styles.input, (editing && !f.readOnly) ? styles.inputActive : styles.inputInactive]}
                  value={form[f.key] || "—"}
                  onChangeText={t => setForm(p => ({ ...p, [f.key]: t }))}
                  editable={editing && !f.readOnly}
                  keyboardType={f.type || 'default'}
                />
              </View>
            ))}

            {editing && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color={colors.white} /> : (
                  <>
                    <Save size={18} color={colors.white} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { paddingBottom: 100, backgroundColor: colors.slate50 },
  
  headerArea: {
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 50
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.white
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.white,
    marginBottom: 6
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white
  },
  
  contentArea: {
    paddingHorizontal: 16,
    marginTop: -20
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.slate900
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  editBtnActive: {
    backgroundColor: colors.slate100
  },
  editBtnInactive: {
    backgroundColor: colors.primarySoft || '#eff6ff'
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  
  inputGroup: {
    marginBottom: 16
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate500
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate800
  },
  inputActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white
  },
  inputInactive: {
    borderColor: 'transparent',
    backgroundColor: colors.slate50,
    color: colors.slate600
  },
  
  saveBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  
  logoutBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 8
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
