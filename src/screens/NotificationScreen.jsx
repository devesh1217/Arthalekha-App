import React, { useState, useEffect, use } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBackup } from '../utils/backupUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setupNotifications, scheduleDailyReminder, cancelAllNotifications } from '../utils/notifications';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

const NOTIFICATION_ENABLED_KEY = 'notificationEnabled';
const REMINDER_TIME_KEY = 'notificationReminderTime';
const DEFAULT_REMINDER_TIME = new Date().setHours(21, 0, 0, 0);

const NotificationScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        loadNotificationSettings();
    }, []);

    useEffect(() => {
        showLoader('Updating Notification Settings...');
        if (notificationEnabled) {
            setupNotifications();
        } else {
            cancelAllNotifications();
        }
        hideLoader();
    }, [notificationEnabled]);

    useEffect(() => {
        if (notificationEnabled) {
            scheduleDailyReminder(reminderTime);
        }
    }, [reminderTime]);

    const showLoader = (message) => {
        setLoadingMessage(message);
        setIsLoading(true);
    };
    const hideLoader = () => {
        setIsLoading(false);
        setLoadingMessage('');
    };

    const loadNotificationSettings = async () => {
        const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
        const time = await AsyncStorage.getItem(REMINDER_TIME_KEY);
        setNotificationEnabled(enabled === 'true');
        setReminderTime(time ? Number(time) : DEFAULT_REMINDER_TIME);
    };

    const saveNotificationSettings = async (enabled, freq) => {
        await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
        await AsyncStorage.setItem(REMINDER_TIME_KEY, String(freq));
        setNotificationEnabled(enabled);
        setReminderTime(freq ? Number(freq) : DEFAULT_REMINDER_TIME);
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
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.color }}>Notifications</Text>
            </View>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                    <Icon name="notifications-outline" size={24} color={theme.color} />
                    <Text style={styles.settingText}>Daily Reminder</Text>
                </View>
                <Switch
                    value={notificationEnabled}
                    onValueChange={async (val) => {
                        await saveNotificationSettings(val, reminderTime);
                    }}
                />
            </View>
            {notificationEnabled && (
                <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'flex-start' }]}> 
                    <Text style={[styles.settingText, { marginBottom: 8 }]}>Reminder Time</Text>
                    
                    // display selected and let user update it
                    <TouchableOpacity style={styles.addButton} onPress={() => {
                        DateTimePickerAndroid.open({
                            value: new Date(reminderTime),
                            mode: 'time',
                            is24Hour: false,
                            display: 'default',
                            onChange: async (event, selectedDate) => {
                                if (event.type === 'set' && selectedDate) {
                                    const selectedTime = new Date(selectedDate);
                                    const now = new Date();
                                    selectedTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                                    await saveNotificationSettings(true, selectedTime.getTime());
                                }
                            },
                        });
                    }}>
                        <Text style={styles.buttonText}>
                            {`Set Time: ${new Date(reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                    </TouchableOpacity>

                </View>
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

export default NotificationScreen;
