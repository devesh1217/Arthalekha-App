import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccounts, updateAccount, deleteAccount, addAccount, getCategories, addCategory } from '../utils/database';
import { accountIcons } from '../constants/iconOptions';
import { checkBackupExists, restoreFromBackup } from '../utils/backupUtils';

const SetupGuide = ({ navigation }) => {
    const { theme } = useTheme();
    const [step, setStep] = useState(0);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAccount, setNewAccount] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [currentEditingForm, setCurrentEditingForm] = useState(null);
    const [newAccountIcon, setNewAccountIcon] = useState('wallet-outline');
    const [newCategoryIcon, setNewCategoryIcon] = useState('add-circle-outline');
    const [hasBackup, setHasBackup] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);

    useEffect(() => {
        loadInitialData();
        checkForLocalBackup();
    }, []);

    const loadInitialData = async () => {
        try {
            const accounts = await getAccounts();
            setAccounts(accounts);
            setLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const checkForLocalBackup = async () => {
        try {
            const exists = await checkBackupExists();
            setHasBackup(exists);
        } catch (error) {
            console.error('Error checking backup:', error);
            setHasBackup(false);
        }
    };

    const handleRestore = async () => {
        try {
            const restored = await restoreFromBackup();
            if (restored) {
                Alert.alert(
                    'Restore Successful',
                    'Your data has been restored successfully.',
                    [{ text: 'OK', onPress: () => {
                        AsyncStorage.setItem('setupComplete', 'true');
                        navigation.replace('MainStack');
                    }}]
                );
            }
        } catch (error) {
            Alert.alert('Restore Failed', 'Failed to restore data. Please continue with fresh setup.', [
                { text: 'OK', onPress: () => setStep(1) }
            ]);
        }
    };

    const handleStartFresh = () => {
        setHasBackup(false);
    };

    const handleAccountBalanceUpdate = async (id, balance, name = null, icon = null) => {
        try {
            const account = accounts.find(a => a.id === id);
            await updateAccount(
                id, 
                name || account.name, 
                icon || account.icon, 
                parseFloat(balance) || 0
            );
            await loadInitialData();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update account');
        }
    };

    const handleAccountDelete = async (id) => {
        try {
            await deleteAccount(id);
            await loadInitialData();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleIconSelect = (icon) => {
        if (currentEditingForm === 'account') {
            if (editingAccount) {
                // Update existing account's icon
                handleAccountBalanceUpdate(
                    editingAccount.id,
                    editingAccount.openingBalance,
                    editingAccount.name,
                    icon
                );
                setEditingAccount(null);
            } else {
                // For new account
                setNewAccountIcon(icon);
            }
        } else if (currentEditingForm === 'category') {
            setNewCategoryIcon(icon);
        }
        setShowIconPicker(false);
    };

    const handleAddAccount = async () => {
        if (newAccount.trim()) {
            try {
                await addAccount(newAccount, newAccountIcon, 0);
                setNewAccount('');
                setNewAccountIcon('wallet-outline');
                loadInitialData();
            } catch (error) {
                Alert.alert('Error', 'Failed to add account');
            }
        }
    };

    const handleAddCategory = async () => {
        if (newCategory.trim()) {
            try {
                await addCategory(newCategory, newCategoryIcon, categoryType);
                setNewCategory('');
                setNewCategoryIcon('add-circle-outline');
                loadInitialData();
            } catch (error) {
                Alert.alert('Error', 'Failed to add category');
            }
        }
    };

    const completeSetup = async () => {
        try {
            await AsyncStorage.setItem('setupComplete', 'true');
            navigation.replace('MainStack');  // Simply replace current screen with MainStack
        } catch (error) {
            console.error('Error saving setup state:', error);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={[
                    styles.headerButton,
                    { opacity: step > 0 ? 1 : 0.5 }
                ]}
                onPress={() => setStep(prev => prev - 1)}
                disabled={step === 0}
            >
                <Icon name="chevron-back" size={24} color={theme.color} />
                <Text style={[styles.headerButtonText, { color: theme.color }]}>Back</Text>
            </TouchableOpacity>

            <View style={styles.progressIndicator}>
                {[...Array(2)].map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.progressDot,
                            {
                                backgroundColor: index === step ?
                                    theme.appThemeColor : theme.borderColor
                            }
                        ]}
                    />
                ))}
            </View>

            <TouchableOpacity
                style={[
                    styles.headerButton,
                    { backgroundColor: theme.appThemeColor }
                ]}
                onPress={step === 1 ? completeSetup : () => setStep(prev => prev + 1)}
            >
                <Text style={styles.headerButtonText}>
                    {step === 1 ? 'Finish' : 'Next'}
                </Text>
                <Icon
                    name={step === 1 ? "checkmark" : "chevron-forward"}
                    size={24}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundColor,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
            elevation: 2,
        },
        headerButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 8,
        },
        headerButtonText: {
            fontSize: 16,
            marginHorizontal: 4,
            color: 'white',
        },
        progressIndicator: {
            flexDirection: 'row',
            gap: 8,
        },
        progressDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
        },
        content: {
            flex: 1,
            padding: 20,
        },
        stepTitle: {
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
            color: theme.color,
        },
        stepContainer: {
            marginBottom: 24,
        },
        card: {
            backgroundColor: theme.cardBackground,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
        },
        accountRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        accountInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        accountName: {
            color: theme.color,
            fontSize: 16,
            marginLeft: 8,
        },
        input: {
            backgroundColor: theme.backgroundColor,
            borderRadius: 8,
            padding: 8,
            color: theme.color,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: theme.borderColor,
        },
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 24,
        },
        button: {
            backgroundColor: theme.appThemeColor,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            flex: 1,
            marginHorizontal: 8,
        },
        buttonText: {
            color: 'white',
            fontSize: 16,
        },
        addButton: {
            backgroundColor: theme.appThemeColor,
            padding: 8,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 16,
        },
        note: {
            color: theme.color,
            fontSize: 14,
            marginTop: 16,
            fontStyle: 'italic',
        },
        iconSelector: {
            padding: 12,
            borderWidth: 1,
            borderColor: theme.borderColor,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
        },
        iconItem: {
            flex: 1,
            aspectRatio: 1,
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
        },
        selectedIcon: {
            backgroundColor: theme.appThemeColor + '20',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: theme.backgroundColor,
            borderRadius: 12,
            padding: 16,
            width: '80%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.color,
        },
        choiceButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.borderColor,
        },
        choiceTextContainer: {
            marginLeft: 16,
            flex: 1,
        },
        choiceTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 4,
        },
        choiceDescription: {
            fontSize: 14,
            color: 'white',
            opacity: 0.8,
        },
        text: {
            fontSize: 16,
            color: theme.color,
            textAlign: 'center',
            lineHeight: 24,
        },
    });
    const renderRestoreStep = () => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Icon name="cloud-download-outline" size={80} color={theme.appThemeColor} />
            <Text style={[styles.stepTitle, { marginTop: 20 }]}>Restore Your Data</Text>
            <Text style={[styles.text, { marginBottom: 30 }]}>
                A local backup is available. Restore it to pick up where you left off, or start fresh.
            </Text>

            <TouchableOpacity
                style={[styles.choiceButton, { backgroundColor: theme.appThemeColor }]}
                onPress={handleRestore}
            >
                <Icon name="checkmark-circle-outline" size={30} color="white" />
                <View style={styles.choiceTextContainer}>
                    <Text style={styles.choiceTitle}>Restore from Backup</Text>
                    <Text style={styles.choiceDescription}>Continue with your saved data.</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.choiceButton, { borderColor: theme.borderColor }]}
                onPress={() => setStep(1)}
            >
                <Icon name="add-circle-outline" size={30} color={theme.color} />
                <View style={styles.choiceTextContainer}>
                    <Text style={[styles.choiceTitle, { color: theme.color }]}>Start Fresh</Text>
                    <Text style={[styles.choiceDescription, { color: theme.color, opacity: 0.7 }]}>
                        Set up new accounts and categories.
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
    const renderAccountStep = () => (
        <ScrollView style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Setup Your Accounts</Text>
            <Text style={[styles.note, { marginBottom: 10 }]}>
                Default accounts 'Cash', 'Bank', and 'Card' are created for you. You can adjust their opening balances now or later in settings.
            </Text>
            {accounts.map(account => (
                <View key={account.id} style={styles.card}>
                    <View style={styles.accountRow}>
                        <TouchableOpacity 
                            style={styles.accountInfo}
                            onPress={() => {
                                setEditingAccount(account);
                                setCurrentEditingForm('account');
                                setShowIconPicker(true);
                            }}
                        >
                            <Icon name={account.icon || 'wallet-outline'} size={24} color={theme.color} />
                            <Text style={styles.accountName}>{account.name}</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, { width: 100, textAlign: 'right' }]}
                            placeholder="Balance"
                            placeholderTextColor={theme.color + '80'}
                            defaultValue={account.openingBalance?.toString() || '0'}
                            keyboardType="numeric"
                            onEndEditing={(e) => handleAccountBalanceUpdate(account.id, e.nativeEvent.text)}
                        />
                        <TouchableOpacity onPress={() => handleAccountDelete(account.id)} disabled={account.isPermanent === 1} style={{ marginLeft: 12, marginBottom: 8 }}>
                            <Icon name="trash-outline" size={24} color={account.isPermanent === 1 ? "#8b8b8bff" : "#EF5350"} />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
            <View style={styles.card}>
                <TextInput
                    style={styles.input}
                    placeholder="New Account Name"
                    placeholderTextColor={theme.color + '80'}
                    value={newAccount}
                    onChangeText={setNewAccount}
                />
                <TouchableOpacity
                    style={styles.iconSelector}
                    onPress={() => {
                        setEditingAccount(null);
                        setCurrentEditingForm('account');
setShowIconPicker(true);
                    }}
                >
                    <Icon name={newAccountIcon} size={24} color={theme.color} />
                    <Text style={{ color: theme.color, marginLeft: 8 }}>Select Icon</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
                    <Text style={styles.buttonText}>Add Account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

        return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <ScrollView contentContainerStyle={styles.content}>
                {step === 0 && renderRestoreStep()}
                {step === 1 && renderAccountStep()}
            </ScrollView>

            <Modal
                visible={showIconPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowIconPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Icon</Text>
                            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
                                <Icon name="close" size={24} color={theme.color} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={accountIcons}
                            numColumns={4}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.iconItem,
                                        (currentEditingForm === 'account' && newAccountIcon === item) ||
                                        (currentEditingForm === 'category' && newCategoryIcon === item)
                                            ? styles.selectedIcon
                                            : null,
                                    ]}
                                    onPress={() => handleIconSelect(item)}
                                >
                                    <Icon name={item} size={32} color={theme.color} />
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default SetupGuide;
