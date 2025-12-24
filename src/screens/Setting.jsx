import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAccounts, addCustomAccount, getCategories, addCustomCategory, getAccountBalance, updateDefaultAccount, getAllAccountBalances, updateAccount, addAccount, deleteAccount, updateCategory, addCategory, deleteCategory } from '../utils/database';
import { accountIcons } from '../constants/iconOptions';
import { createBackup } from '../utils/backupUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

const Setting = ({ navigation }) => {
    const { theme, toggleTheme } = useTheme();
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState({ income: [], expense: [] });
    const [newAccount, setNewAccount] = useState('');
    const [categoryType, setCategoryType] = useState('income');
    const [allAccounts, setAllAccounts] = useState([]);
    const [selectedIcon, setSelectedIcon] = useState('wallet-outline');
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [accountForm, setAccountForm] = useState({
        name: '',
        icon: 'wallet-outline',
        openingBalance: '0'
    });
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        icon: 'add-circle-outline',
        type: 'income'
    });
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const fetchedAccounts = await getAccounts();
        const fetchedCategories = await getCategories();
        const allAccountBalances = await getAllAccountBalances();

        setAccounts(fetchedAccounts);
        setCategories(fetchedCategories);
        setAllAccounts(allAccountBalances);
    };

    const handleAddAccount = async () => {
        if (newAccount) {
            await addCustomAccount(newAccount, selectedIcon);
            setNewAccount('');
            setSelectedIcon('wallet-outline');
            loadData();
        }
    };

    const handleEditAccount = async (account) => {
        if (editingAccount) {
            await updateAccount(editingAccount.id, newAccount, selectedIcon);
            setEditingAccount(null);
            setNewAccount('');
            setSelectedIcon('wallet-outline');
            loadData();
        }
    };

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

    const handleSaveCategory = async () => {
        try {
            if (!categoryForm.name.trim()) {
                Alert.alert('Error', 'Category name is required');
                return;
            }

            if (editingCategory) {
                await updateCategory(
                    editingCategory.id,
                    categoryForm.name,
                    categoryForm.icon
                );
            } else {
                await addCategory(
                    categoryForm.name,
                    categoryForm.icon,
                    categoryForm.type
                );
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: 'add-circle-outline', type: categoryType });
            loadData();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to save category');
        }
    };

    const handleDeleteCategory = (category) => {
        if (category.isPermanent === 1) {
            Alert.alert('Error', 'This category cannot be deleted');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this category? All transactions will be moved to Others category.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(category.id);
                            loadData();
                            Alert.alert('Success', 'Category deleted and transactions updated');
                        } catch (error) {
                            Alert.alert('Error', error.message || 'Failed to delete category');
                        }
                    },
                },
            ]
        );
    };

    const handleIconSelect = (icon) => {
        if (currentEditingForm === 'account') {
            setAccountForm({ ...accountForm, icon });
        } else if (currentEditingForm === 'category') {
            setCategoryForm({ ...categoryForm, icon });
        }
        setShowIconPicker(false);
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

    const handleUpdateAccount = async (account, updatedData) => {
        try {
            await updateAccount(
                account.id,
                updatedData.name || account.name,
                updatedData.icon || account.icon,
                updatedData.openingBalance ?? account.openingBalance
            );
            loadData();
            Alert.alert('Success', 'Account updated successfully');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: 16,
            backgroundColor: theme.backgroundColor,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.color,
            marginBottom: 12,
        },
        input: {
            borderWidth: 1,
            borderColor: theme.borderColor,
            borderRadius: 8,
            padding: 8,
            color: theme.color,
            marginBottom: 8,
        },
        addButton: {
            backgroundColor: theme.appThemeColor,
            padding: 8,
            borderRadius: 8,
            alignItems: 'center',
        },
        buttonText: {
            color: '#fff',
        },
        item: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        itemText: {
            color: theme.color,
            fontSize: 16,
        },
        balance: {
            color: theme.color,
            fontSize: 14,
            opacity: 0.7,
        },
        themeToggle: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            backgroundColor: theme.cardBackground,
            borderRadius: 8,
            marginBottom: 16,
        },
        accountForm: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
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
        accountInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        accountActions: {
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            width: '80%',
            backgroundColor: theme.backgroundColor,
            borderRadius: 8,
            padding: 16,
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
        iconSelectorContent: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
        },
        buttonContainer: {
            marginTop: 16,
            flexDirection: 'row',
            gap: 8,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 4,
            marginBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        backButton: {
            padding: 8,
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.color,
        },
        settingItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        settingItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        settingText: {
            color: theme.color,
            fontSize: 16,
        },
        lastBackupText: {
            marginTop: 8,
            color: theme.color,
            fontSize: 14,
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
        },
        loadingContainer: {
            backgroundColor: theme.cardBackground,
            padding: 20,
            borderRadius: 10,
            alignItems: 'center',
            minWidth: 200,
        },
        loadingText: {
            color: theme.color,
            marginTop: 10,
            fontSize: 16,
            textAlign: 'center',
        },
        loadingSpinner: {
            height: 50,
        }
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={24} color={theme.color} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Theme</Text>
                    <View style={styles.themeToggle}>
                        <Text style={styles.itemText}>Dark Mode</Text>
                        <Switch
                            value={theme.backgroundColor === '#121212'}
                            onValueChange={toggleTheme}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Accounts</Text>
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

                    {allAccounts.map((account) => (
                        <View key={account.id} style={styles.item}>
                            <View style={styles.accountInfo}>
                                <Icon name={account.icon || 'wallet-outline'} size={24} color={theme.color} />
                                <View style={styles.accountDetails}>
                                    <Text style={styles.itemText}>{account.name}</Text>
                                    <Text style={styles.balance}>
                                        Balance: ₹{account.balance || 0}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.accountActions}>
                                {/* Allow editing balance even for permanent accounts */}
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
                                {/* Only show delete for non-permanent accounts */}
                                {account.isPermanent !== 1 && (
                                    <TouchableOpacity onPress={() => handleDeleteAccount(account)}>
                                        <Icon name="trash-outline" size={24} color="#EF5350" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => handleDefaultAccount(account.id)}
                                >
                                    <Icon
                                        name={account.isDefault ? 'star' : 'star-outline'}
                                        size={24}
                                        color={account.isDefault ? theme.appThemeColor : theme.color}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                <Modal
                    visible={showAccountModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowAccountModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingAccount ? 'Edit Account' : 'New Account'}
                                </Text>
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
                                <TouchableOpacity
                                    style={[styles.addButton, { flex: 1 }]}
                                    onPress={handleSaveAccount}
                                >
                                    <Text style={styles.buttonText}>
                                        {editingAccount ? 'Update' : 'Save'}
                                    </Text>
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
                                            (currentEditingForm === 'account' && accountForm.icon === item) ||
                                                (currentEditingForm === 'category' && categoryForm.icon === item)
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                        <TouchableOpacity
                            style={[styles.addButton, { flex: 1, marginRight: 8, backgroundColor: categoryType === 'income' ? theme.appThemeColor : theme.cardBackground }]}
                            onPress={() => {
                                setCategoryType('income');
                                setCategoryForm(prev => ({ ...prev, type: 'income' }));
                            }}
                        >
                            <Text style={{ color: categoryType === 'income' ? '#fff' : theme.color }}>Income</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, { flex: 1, backgroundColor: categoryType === 'expense' ? theme.appThemeColor : theme.cardBackground }]}
                            onPress={() => {
                                setCategoryType('expense');
                                setCategoryForm(prev => ({ ...prev, type: 'expense' }));
                            }}
                        >
                            <Text style={{ color: categoryType !== 'income' ? '#fff' : theme.color }}>Expense</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setCategoryForm({ name: '', icon: 'add-circle-outline', type: categoryType });
                            setEditingCategory(null);
                            setShowCategoryModal(true);
                        }}
                    >
                        <Text style={styles.buttonText}>Add Category</Text>
                    </TouchableOpacity>

                    {categories[categoryType]?.map((category) => (
                        <View key={category.id} style={styles.item}>
                            <View style={styles.accountInfo}>
                                <Icon name={category.icon} size={24} color={theme.color} />
                                <Text style={styles.itemText}>{category.name}</Text>
                            </View>
                            {category.isPermanent !== 1 && (
                                <View style={styles.accountActions}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingCategory(category);
                                            setCategoryForm({
                                                name: category.name,
                                                icon: category.icon,
                                                type: category.type
                                            });
                                            setShowCategoryModal(true);
                                        }}
                                    >
                                        <Icon name="create-outline" size={24} color={theme.color} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteCategory(category)}>
                                        <Icon name="trash-outline" size={24} color="#EF5350" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                <Modal
                    visible={showCategoryModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCategoryModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingCategory ? 'Edit Category' : 'New Category'}
                                </Text>
                                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                    <Icon name="close" size={24} color={theme.color} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Category Name"
                                placeholderTextColor={theme.color + '80'}
                                value={categoryForm.name}
                                onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
                            />

                            <TouchableOpacity
                                style={styles.iconSelector}
                                onPress={() => {
                                    setCurrentEditingForm('category');
                                    setShowIconPicker(true);
                                }}
                            >
                                <View style={styles.iconSelectorContent}>
                                    <Icon name={categoryForm.icon} size={24} color={theme.color} />
                                    <Text style={[styles.itemText, { marginLeft: 8 }]}>Select Icon</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.addButton, { flex: 1 }]}
                                    onPress={handleSaveCategory}
                                >
                                    <Text style={styles.buttonText}>
                                        {editingCategory ? 'Update' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Backup Settings</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleManualBackup}>
                        <View style={styles.settingItemLeft}>
                            <Icon name="save" size={24} color={theme.color} />
                            <Text style={styles.settingText}>Create Backup Now</Text>
                        </View>
                        <Icon name="chevron-forward" size={24} color={theme.color} />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={theme.appThemeColor}
                            style={styles.loadingSpinner}
                        />
                        <Text style={styles.loadingText}>{loadingMessage}</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default Setting;
