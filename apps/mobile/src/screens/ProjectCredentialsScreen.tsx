import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native'
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  IconButton,
  TextInput,
  SegmentedButtons,
  Menu,
  Divider,
} from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useRoute, useNavigation } from '@react-navigation/native'
import apiClient from '../services/apiClient'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'

// Types
type CredentialType = 'database' | 'ssh' | 'ssh_key' | 'firebase' | 'api_key' | 'encryption_key' | 'other'
type Environment = 'development' | 'staging' | 'production'

interface CredentialSummary {
  id: number
  name: string
  type: CredentialType
  metadata: Record<string, unknown>
  updatedAt: string
}
interface EnvSecret {
  id: number
  key: string
  value?: string
}

const CRED_TYPES: CredentialType[] = ['database', 'ssh', 'ssh_key', 'firebase', 'api_key', 'encryption_key', 'other']
const ENVIRONMENTS: Environment[] = ['development', 'staging', 'production']

export default function ProjectCredentialsScreen() {
  const { colors } = useTheme()
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { projectId } = route.params

  const [tab, setTab] = useState<'credentials' | 'env'>('credentials')
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')

  // Credentials State
  const [credentials, setCredentials] = useState<CredentialSummary[]>([])
  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const [newCredName, setNewCredName] = useState('')
  const [newCredType, setNewCredType] = useState<CredentialType>('other')
  const [newCredValue, setNewCredValue] = useState('')
  const [newCredNote, setNewCredNote] = useState('')
  const [savingCred, setSavingCred] = useState(false)
  const [credTypeMenuVisible, setCredTypeMenuVisible] = useState(false)

  // Env State
  const [environment, setEnvironment] = useState<Environment>('production')
  const [envSecrets, setEnvSecrets] = useState<EnvSecret[]>([])
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [showEnvValues, setShowEnvValues] = useState(false)
  const [envMenuVisible, setEnvMenuVisible] = useState(false)
  const [uploadingEnv, setUploadingEnv] = useState(false)

  const loadCredentials = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/projects/${projectId}/credentials`)
      if (res?.success) {
        setCredentials(res.data || [])
        setForbidden(false)
      } else {
        if (res?.error?.toLowerCase().includes('denied') || res?.error?.toLowerCase().includes('unauthorized')) {
          setForbidden(true)
        } else {
          setError(res?.error || 'Failed to load credentials')
        }
      }
    } catch (e) {
      console.error(e)
      setError('An error occurred loading credentials')
    }
  }, [projectId])

  const loadEnv = useCallback(async () => {
    try {
      const res = await apiClient.get(`/api/projects/${projectId}/env?environment=${environment}&reveal=${showEnvValues}`)
      if (res?.success) {
        setEnvSecrets(res.data || [])
      } else if (res?.error?.toLowerCase().includes('denied') || res?.error?.toLowerCase().includes('unauthorized')) {
        setForbidden(true)
      }
    } catch (e) {
      console.error(e)
    }
  }, [projectId, environment, showEnvValues])

  const loadData = useCallback(async () => {
    setLoading(true)
    await loadCredentials()
    if (tab === 'env') await loadEnv()
    setLoading(false)
  }, [loadCredentials, loadEnv, tab])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (tab === 'env') loadEnv()
  }, [tab, loadEnv, environment]) // re-load when env changes

  const handleRevealCred = async (id: number) => {
    if (revealed[id] !== undefined) {
      const newRevealed = { ...revealed }
      delete newRevealed[id]
      setRevealed(newRevealed)
      return
    }
    
    try {
      const res = await apiClient.get(`/api/projects/${projectId}/credentials/${id}`)
      if (res?.success) {
        setRevealed(prev => ({ ...prev, [id]: res.data.value }))
      } else {
        Alert.alert('Error', res?.error || 'Failed to reveal credential')
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred')
    }
  }

  const handleAddCred = async () => {
    if (!newCredName.trim() || !newCredValue.trim()) {
      Alert.alert('Validation', 'Name and Value are required.')
      return
    }

    setSavingCred(true)
    try {
      const payload = {
        name: newCredName.trim(),
        type: newCredType,
        value: newCredValue,
        metadata: newCredNote ? { note: newCredNote } : {}
      }
      const res = await apiClient.post(`/api/projects/${projectId}/credentials`, payload)
      if (res?.success) {
        setNewCredName('')
        setNewCredType('other')
        setNewCredValue('')
        setNewCredNote('')
        loadCredentials()
      } else {
        Alert.alert('Error', res?.error || 'Failed to add credential')
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred adding credential')
    } finally {
      setSavingCred(false)
    }
  }

  const handleDeleteCred = async (id: number) => {
    Alert.alert('Delete', 'Delete this credential?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await apiClient.del(`/api/projects/${projectId}/credentials/${id}`)
        if (res?.success) loadCredentials()
        else Alert.alert('Error', res?.error || 'Failed to delete credential')
      }}
    ])
  }

  const handleAddEnv = async () => {
    if (!newEnvKey.trim()) {
      Alert.alert('Validation', 'Key is required.')
      return
    }
    
    try {
      const payload = {
        environment,
        key: newEnvKey.trim(),
        value: newEnvValue
      }
      const res = await apiClient.post(`/api/projects/${projectId}/env`, payload)
      if (res?.success) {
        setNewEnvKey('')
        setNewEnvValue('')
        loadEnv()
      } else {
        Alert.alert('Error', res?.error || 'Failed to add environment variable')
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred adding environment variable')
    }
  }

  const handleDeleteEnv = async (key: string) => {
    Alert.alert('Delete', `Delete environment variable ${key}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await apiClient.del(`/api/projects/${projectId}/env?environment=${environment}&key=${encodeURIComponent(key)}`)
        if (res?.success) loadEnv()
        else Alert.alert('Error', res?.error || 'Failed to delete env var')
      }}
    ])
  }

  const handleUploadEnvFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', '*/*'], // Allow .env files
        copyToCacheDirectory: true
      });
      
      if (result.canceled) return;

      setUploadingEnv(true)
      const fileUri = result.assets[0].uri;
      
      // Read the text from the file
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
      
      if (!fileContent.trim()) {
        Alert.alert('Error', 'The file is empty.');
        return;
      }

      // Send content to API
      const payload = { environment, content: fileContent }
      const res = await apiClient.post(`/api/projects/${projectId}/env/upload`, payload)
      
      if (res?.success) {
        Alert.alert('Success', `Imported ${(res as any).imported || 0} key(s) from file.`)
        loadEnv()
      } else {
        Alert.alert('Error', res?.error || 'Import failed')
      }
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Failed to read or upload file.')
    } finally {
      setUploadingEnv(false)
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (forbidden) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <IconButton icon="shield-lock-outline" size={60} iconColor={colors.error} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginTop: 10 }}>Access Denied</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 5 }}>
          You don't have access to this project's credentials. Ask an admin or project member for access.
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Go Back
        </Button>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text>
        <Button mode="contained" onPress={loadData} style={{ marginTop: 20 }}>Retry</Button>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(val) => setTab(val as 'credentials' | 'env')}
          buttons={[
            { value: 'credentials', label: 'Credentials' },
            { value: 'env', label: 'Env Variables' }
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {tab === 'credentials' ? (
          <View>
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Add Credential</Text>
                <TextInput label="Name (e.g. Production DB)" value={newCredName} onChangeText={setNewCredName} mode="outlined" style={styles.input} />
                
                <Menu
                  visible={credTypeMenuVisible}
                  onDismiss={() => setCredTypeMenuVisible(false)}
                  anchor={
                    <TouchableOpacity onPress={() => setCredTypeMenuVisible(true)} style={styles.dropdownAnchor}>
                      <Text style={{ color: colors.text }}>Type: {newCredType}</Text>
                      <IconButton icon="chevron-down" size={20} style={{ margin: 0 }} />
                    </TouchableOpacity>
                  }
                >
                  {CRED_TYPES.map(t => (
                    <Menu.Item key={t} onPress={() => { setNewCredType(t); setCredTypeMenuVisible(false); }} title={t} />
                  ))}
                </Menu>

                <TextInput label="Secret Value" value={newCredValue} onChangeText={setNewCredValue} mode="outlined" multiline numberOfLines={3} style={styles.input} />
                <TextInput label="Note (optional)" value={newCredNote} onChangeText={setNewCredNote} mode="outlined" style={styles.input} />
                <Button mode="contained" onPress={handleAddCred} loading={savingCred} disabled={savingCred} style={{ marginTop: 12 }}>
                  Add Credential
                </Button>
              </Card.Content>
            </Card>

            <Text style={styles.listTitle}>Stored Credentials</Text>
            {credentials.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>No credentials stored yet.</Text>
            ) : (
              credentials.map(c => (
                <Card key={c.id} style={styles.itemCard}>
                  <Card.Content>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{c.name}</Text>
                        <Text style={styles.itemMeta}>{c.type.toUpperCase()}</Text>
                        {c.metadata?.note ? <Text style={styles.itemNote}>{c.metadata.note as string}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <Button compact mode="text" onPress={() => handleRevealCred(c.id)}>
                          {revealed[c.id] !== undefined ? 'Hide' : 'Reveal'}
                        </Button>
                        <IconButton icon="trash-can-outline" iconColor={colors.error} size={20} onPress={() => handleDeleteCred(c.id)} />
                      </View>
                    </View>
                    {revealed[c.id] !== undefined ? (
                      <View style={styles.secretBox}>
                        <Text style={styles.secretText}>{revealed[c.id]}</Text>
                      </View>
                    ) : null}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        ) : (
          <View>
            <View style={styles.envControls}>
              <Menu
                visible={envMenuVisible}
                onDismiss={() => setEnvMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setEnvMenuVisible(true)} style={[styles.dropdownAnchor, { flex: 1, marginRight: 8 }]}>
                    <Text style={{ color: colors.text, textTransform: 'capitalize' }}>{environment}</Text>
                    <IconButton icon="chevron-down" size={20} style={{ margin: 0 }} />
                  </TouchableOpacity>
                }
              >
                {ENVIRONMENTS.map(e => (
                  <Menu.Item key={e} onPress={() => { setEnvironment(e); setEnvMenuVisible(false); }} title={e.charAt(0).toUpperCase() + e.slice(1)} />
                ))}
              </Menu>
              <Button mode="text" onPress={() => setShowEnvValues(!showEnvValues)}>
                {showEnvValues ? 'Hide Values' : 'Show Values'}
              </Button>
            </View>

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Add Environment Variable</Text>
                <TextInput label="KEY" value={newEnvKey} onChangeText={setNewEnvKey} mode="outlined" style={styles.input} />
                <TextInput label="value" value={newEnvValue} onChangeText={setNewEnvValue} mode="outlined" style={styles.input} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <Button mode="contained" onPress={handleAddEnv} style={{ flex: 1, marginRight: 8 }}>
                    Add Variable
                  </Button>
                  <Button mode="outlined" icon="file-upload" onPress={handleUploadEnvFile} loading={uploadingEnv} disabled={uploadingEnv}>
                    Upload .env
                  </Button>
                </View>
              </Card.Content>
            </Card>

            <Text style={styles.listTitle}>Variables for {environment}</Text>
            {envSecrets.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>No variables for {environment}.</Text>
            ) : (
              <Card style={styles.itemCard}>
                <Card.Content style={{ paddingVertical: 8 }}>
                  {envSecrets.map((s, index) => (
                    <View key={s.id}>
                      {index > 0 && <Divider style={{ marginVertical: 8 }} />}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{s.key}</Text>
                          {s.value !== undefined ? (
                            <Text style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: 12 }} numberOfLines={1}>{s.value}</Text>
                          ) : (
                            <Text style={{ color: colors.textSecondary, letterSpacing: 2 }}>••••••••</Text>
                          )}
                        </View>
                        <IconButton icon="trash-can-outline" iconColor={colors.error} size={20} onPress={() => handleDeleteEnv(s.key)} />
                      </View>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  input: { marginBottom: 10 },
  dropdownAnchor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  itemCard: { marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemMeta: { fontSize: 12, color: '#666', marginTop: 2, fontWeight: '600' },
  itemNote: { fontSize: 12, color: '#888', marginTop: 4 },
  secretBox: {
    marginTop: 10,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 6,
  },
  secretText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  envControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
})
