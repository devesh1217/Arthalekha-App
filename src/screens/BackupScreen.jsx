import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBackup } from '../utils/backupUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

const AUTO_BACKUP_KEY = 'autoBackupEnabled';
const AUTO_BACKUP_FREQ_KEY = 'autoBackupFrequency';
const AUTO_BACKUP_LAST_KEY = 'autoBackupLastTime';
const AUTO_BACKUP_FREQUENCIES = [
    { label: 'Every 6 hours', value: 6 * 60 * 60 * 1000 },
    { label: 'Every 12 hours', value: 12 * 60 * 60 * 1000 },
    { label: 'Every day', value: 24 * 60 * 60 * 1000 },
    { label: 'Every 3 days', value: 3 * 24 * 60 * 60 * 1000 },
    { label: 'Every week', value: 7 * 24 * 60 * 60 * 1000 },
];

const BackupScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [autoBackupFrequency, setAutoBackupFrequency] = useState(AUTO_BACKUP_FREQUENCIES[2].value);
    const [lastAutoBackup, setLastAutoBackup] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        loadBackupSettings();
    }, []);

    useEffect(() => {
        if (autoBackupEnabled) {
            maybeTriggerAutoBackup();
        }
    }, [autoBackupEnabled, autoBackupFrequency]);

    const showLoader = (message) => {
        setLoadingMessage(message);
        setIsLoading(true);
    };
    const hideLoader = () => {
        setIsLoading(false);
        setLoadingMessage('');
    };

    const loadBackupSettings = async () => {
        const enabled = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
        const freq = await AsyncStorage.getItem(AUTO_BACKUP_FREQ_KEY);
        const last = await AsyncStorage.getItem(AUTO_BACKUP_LAST_KEY);
        setAutoBackupEnabled(enabled === 'true');
        if (freq) setAutoBackupFrequency(Number(freq));
        if (last) setLastAutoBackup(Number(last));
    };

    const saveBackupSettings = async (enabled, freq) => {
        await AsyncStorage.setItem(AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
        await AsyncStorage.setItem(AUTO_BACKUP_FREQ_KEY, String(freq));
        setAutoBackupEnabled(enabled);
        setAutoBackupFrequency(freq);
    };

    const maybeTriggerAutoBackup = async () => {
        try {
            const now = Date.now();
            if (!lastAutoBackup || now - lastAutoBackup > autoBackupFrequency) {
                showLoader('Auto backup in progress...');
                await createBackup();
                setLastAutoBackup(now);
                await AsyncStorage.setItem(AUTO_BACKUP_LAST_KEY, String(now));
                hideLoader();
            }
        } catch (e) {
            hideLoader();
        }
    };

    const handleManualBackup = async () => {
        try {
            showLoader('Creating backup...');
            const backupPath = await createBackup();
            hideLoader();
            if (backupPath) {
                Alert.alert('Backup Success', `Backup created successfully at ${backupPath}`);
            }
        } catch (error) {
            hideLoader();
            Alert.alert('Backup Failed', 'Failed to create backup');
        }
    };

    const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: theme.backgroundColor },
        sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.color, marginBottom: 12 },
        settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
        settingItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        settingText: { color: theme.color, fontSize: 16 },
        lastBackupText: { marginTop: 8, color: theme.color, fontSize: 14 },
        addButton: { backgroundColor: theme.appThemeColor, padding: 8, borderRadius: 8, alignItems: 'center', marginTop: 16 },
        buttonText: { color: '#fff' },
        loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
        loadingContainer: { backgroundColor: theme.cardBackground, padding: 20, borderRadius: 10, alignItems: 'center', minWidth: 200 },
        loadingText: { color: theme.color, marginTop: 10, fontSize: 16, textAlign: 'center' },
        loadingSpinner: { height: 50 },
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}>
                <TouchableOpacity style={{ padding: 8, marginRight: 16 }} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={theme.color} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.color }}>Backup</Text>
            </View>
            <Text style={styles.sectionTitle}>Backup Settings</Text>
            <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                    <Icon name="cloud-upload-outline" size={24} color={theme.color} />
                    <Text style={styles.settingText}>Automatic Backup</Text>
                </View>
                <Switch
                    value={autoBackupEnabled}
                    onValueChange={async (val) => {
                        await saveBackupSettings(val, autoBackupFrequency);
                    }}
                />
            </View>
            {autoBackupEnabled && (
                <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'flex-start' }]}> 
                    <Text style={[styles.settingText, { marginBottom: 8 }]}>Backup Frequency</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {AUTO_BACKUP_FREQUENCIES.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={{
                                    backgroundColor: autoBackupFrequency === opt.value ? theme.appThemeColor : theme.cardBackground,
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 16,
                                    marginRight: 8,
                                    marginBottom: 8,
                                }}
                                onPress={async () => {
                                    await saveBackupSettings(true, opt.value);
                                }}
                            >
                                <Text style={{ color: autoBackupFrequency === opt.value ? '#fff' : theme.color }}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
            <TouchableOpacity style={styles.addButton} onPress={handleManualBackup}>
                <Text style={styles.buttonText}>Create Backup Now</Text>
            </TouchableOpacity>
            {lastAutoBackup && (
                <Text style={styles.lastBackupText}>
                    Last auto backup: {new Date(lastAutoBackup).toLocaleString()}
                </Text>
            )}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.appThemeColor} style={styles.loadingSpinner} />
                        <Text style={styles.loadingText}>{loadingMessage}</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default BackupScreen;
