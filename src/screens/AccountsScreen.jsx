import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAccounts, getAllAccountBalances, updateDefaultAccount, updateAccount, addAccount, deleteAccount } from '../utils/database';
import { accountIcons } from '../constants/iconOptions';
import { SafeAreaView } from 'react-native-safe-area-context';

const AccountsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [allAccounts, setAllAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountForm, setAccountForm] = useState({
        name: '',
        icon: 'wallet-outline',
        openingBalance: '0'
    });
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [currentEditingForm, setCurrentEditingForm] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const showLoader = (message) => {
        setLoadingMessage(message);
        setIsLoading(true);
    };
    const hideLoader = () => {
        setIsLoading(false);
        setLoadingMessage('');
    };

    const loadData = async () => {
        const allAccountBalances = await getAllAccountBalances();
        setAllAccounts(allAccountBalances);
    };
    useEffect(() => {
        loadData();
    }, []);

    const handleSaveAccount = async () => {
        try {
            if (!accountForm.name.trim()) {
                Alert.alert('Error', 'Account name is required');
                return;
            }
            if (editingAccount) {
                await updateAccount(
                    editingAccount.id,
                    accountForm.name,
                    accountForm.icon,
                    parseFloat(accountForm.openingBalance) || 0
                );
            } else {
                await addAccount(
                    accountForm.name,
                    accountForm.icon,
                    parseFloat(accountForm.openingBalance) || 0
                );
            }
            setShowAccountModal(false);
            setEditingAccount(null);
            setAccountForm({ name: '', icon: 'wallet-outline', openingBalance: '0' });
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save account');
        }
    };

    const handleDeleteAccount = (account) => {
        if (account.isPermanent === 1) {
            Alert.alert('Error', 'This account cannot be deleted');
            return;
        }
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this account? All transactions will be transferred to Cash account.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount(account.id);
                            loadData();
                            Alert.alert('Success', 'Account deleted and transactions transferred to Cash');
                        } catch (error) {
                            Alert.alert('Error', error.message || 'Failed to delete account');
                        }
                    },
                },
            ]
        );
    };

    const handleDefaultAccount = async (id) => {
        try {
            await updateDefaultAccount(id);
            loadData();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update default account');
        }
    };

    const handleIconSelect = (icon) => {
        setAccountForm({ ...accountForm, icon });
        setShowIconPicker(false);
    };

    const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: theme.backgroundColor },
        sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.color, marginBottom: 12 },
        addButton: { backgroundColor: theme.appThemeColor, padding: 8, borderRadius: 8, alignItems: 'center' },
        buttonText: { color: '#fff' },
        item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
        itemText: { color: theme.color, fontSize: 16 },
        balance: { color: theme.color, fontSize: 14, opacity: 0.7 },
        accountInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        accountActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
        modalContent: { width: '80%', backgroundColor: theme.backgroundColor, borderRadius: 8, padding: 16 },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.color },
        input: { borderWidth: 1, borderColor: theme.borderColor, borderRadius: 8, padding: 8, color: theme.color, marginBottom: 8 },
        iconSelector: { padding: 12, borderWidth: 1, borderColor: theme.borderColor, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
        iconSelectorContent: { flexDirection: 'row', alignItems: 'center', padding: 8 },
        iconItem: { flex: 1, aspectRatio: 1, padding: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
        selectedIcon: { backgroundColor: theme.appThemeColor + '20' },
        buttonContainer: { marginTop: 16, flexDirection: 'row', gap: 8 },
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
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.color }}>Accounts</Text>
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                    setAccountForm({ name: '', icon: 'wallet-outline', openingBalance: '0' });
                    setEditingAccount(null);
                    setShowAccountModal(true);
                }}
            >
                <Text style={styles.buttonText}>Add Account</Text>
            </TouchableOpacity>
            <ScrollView>
                {allAccounts.map((account) => (
                    <View key={account.id} style={styles.item}>
                        <View style={styles.accountInfo}>
                            <Icon name={account.icon || 'wallet-outline'} size={24} color={theme.color} />
                            <View>
                                <Text style={styles.itemText}>{account.name}</Text>
                                <Text style={styles.balance}>Balance: ₹{account.balance || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.accountActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    setEditingAccount(account);
                                    setAccountForm({
                                        name: account.name,
                                        icon: account.icon || 'wallet-outline',
                                        openingBalance: account.openingBalance?.toString() || '0'
                                    });
                                    setShowAccountModal(true);
                                }}
                            >
                                <Icon name="create-outline" size={24} color={theme.color} />
                            </TouchableOpacity>
                            {account.isPermanent !== 1 && (
                                <TouchableOpacity onPress={() => handleDeleteAccount(account)}>
                                    <Icon name="trash-outline" size={24} color="#EF5350" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => handleDefaultAccount(account.id)}>
                                <Icon name={account.isDefault ? 'star' : 'star-outline'} size={24} color={account.isDefault ? theme.appThemeColor : theme.color} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
            <Modal
                visible={showAccountModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAccountModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingAccount ? 'Edit Account' : 'New Account'}</Text>
                            <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                                <Icon name="close" size={24} color={theme.color} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Account Name"
                            placeholderTextColor={theme.color + '80'}
                            value={accountForm.name}
                            onChangeText={(text) => setAccountForm({ ...accountForm, name: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Opening Balance"
                            placeholderTextColor={theme.color + '80'}
                            value={accountForm.openingBalance}
                            onChangeText={(text) => setAccountForm({ ...accountForm, openingBalance: text })}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={styles.iconSelector}
                            onPress={() => {
                                setCurrentEditingForm('account');
                                setShowIconPicker(true);
                            }}
                        >
                            <View style={styles.iconSelectorContent}>
                                <Icon name={accountForm.icon} size={24} color={theme.color} />
                                <Text style={[styles.itemText, { marginLeft: 8 }]}>Select Icon</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleSaveAccount}>
                                <Text style={styles.buttonText}>{editingAccount ? 'Update' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
                                        accountForm.icon === item ? styles.selectedIcon : null,
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

export default AccountsScreen;
