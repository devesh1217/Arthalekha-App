
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';


const Setting = ({ navigation }) => {
    const { theme, toggleTheme } = useTheme();
    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.backgroundColor, padding: 16 },
        header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
        backButton: { padding: 8, marginRight: 16 },
        headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.color },
        navItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.borderColor, justifyContent: 'space-between' },
        navText: { fontSize: 18, color: theme.color },
        themeToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.cardBackground, borderRadius: 8, marginBottom: 16 },
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={theme.color} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('AccountsScreen')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="wallet-outline" size={24} color={theme.color} style={{ marginRight: 12 }} />
                    <Text style={styles.navText}>Accounts</Text>
                </View>
                <Icon name="chevron-forward" size={24} color={theme.color} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('CategoriesScreen')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="list-outline" size={24} color={theme.color} style={{ marginRight: 12 }} />
                    <Text style={styles.navText}>Categories</Text>
                </View>
                <Icon name="chevron-forward" size={24} color={theme.color} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('BackupScreen')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="cloud-upload-outline" size={24} color={theme.color} style={{ marginRight: 12 }} />
                    <Text style={styles.navText}>Backup</Text>
                </View>
                <Icon name="chevron-forward" size={24} color={theme.color} />
            </TouchableOpacity>
            <View style={styles.themeToggle}>
                <Text style={styles.navText}>Dark Mode</Text>
                <Switch value={theme.backgroundColor === '#121212'} onValueChange={toggleTheme} />
            </View>
        </SafeAreaView>
    );
};

export default Setting;

