import { View, Text, TextInput, Pressable, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native';
import { insertTransaction } from '../../../../src/utils/database';
import { useTheme } from '../../../hooks/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { addExpense } from '../../../../src/redux/slices/transactionSlice';
import CustomPicker from '../../common/CustomPicker';
import { getAccounts, getCategories, getMostFrequentCategory } from '../../../../src/utils/database';
import { useRoute } from '@react-navigation/native';
import { saveFormState, loadFormState, clearFormState } from '../../../utils/formStorage';
import Icon from 'react-native-vector-icons/Ionicons';

const ExpenseForm = ({ onClose, navigation }) => {
    const { theme } = useTheme();
    const counter = useSelector((state) => state.date.value);
    const dispatch = useDispatch();
    const route = useRoute();

    // Move state initialization to top
    const [expenseForm, setExpenseForm] = useState({
        title: '',
        description: '',
        amount: '',  // Change to string for proper state updates
        account: 'Cash',
        category: '',
        sentTo: '',
    });
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [customAccounts, setCustomAccounts] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);

    // Add refs for input fields
    const titleRef = React.useRef();
    const descriptionRef = React.useRef();
    const amountRef = React.useRef();
    const sentToRef = React.useRef();

    // Load saved form first, then load options
    useEffect(() => {
        const initForm = async () => {
            const savedForm = await loadFormState('expense');
            if (savedForm) {
                setExpenseForm(savedForm);
            }
            await loadCustomOptions();
        };
        initForm();
    }, []);

    // Save form changes with proper dependency
    useEffect(() => {
        if (expenseForm.title || expenseForm.description || expenseForm.amount || expenseForm.sentTo) {
            saveFormState('expense', expenseForm);
        }
    }, [expenseForm.title, expenseForm.description, expenseForm.amount, expenseForm.category, expenseForm.account, expenseForm.sentTo]);

    const loadCustomOptions = async () => {
        try {
            const [accounts, categories, mostFreqCategory] = await Promise.all([
                getAccounts(),
                getCategories(),
                getMostFrequentCategory('expense')
            ]);

            setCustomAccounts(accounts.map(acc => ({
                label: acc.name,
                value: acc.name,
                icon: acc.icon || 'wallet-outline'
            })));

            setCustomCategories(categories.expense.map(cat => ({
                label: cat.name,
                value: cat.name,
                icon: cat.icon || 'add-circle-outline'
            })));

            setExpenseForm(prev => ({
                ...prev,
                account: accounts.find(acc => acc.isDefault === 1)?.name || 'Cash',
                category: mostFreqCategory
            }));
        } catch (error) {
            console.error('Error loading options:', error);
        }
    };

    const styles = StyleSheet.create({
        form: {
            width: '100%',
            justifyContent: 'start',
            alignItems: 'stretch',
            padding: 20,
            gap: 15
        },
        inputGroup: {
            marginBottom: 15,
        },
        label: {
            color: theme.color,
            marginBottom: 5,
            fontSize: 14,
            fontWeight: '500',
        },
        input: {
            width: '100%',
            borderWidth: 1,
            borderColor: theme.borderColor,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.color,
            backgroundColor: theme.cardBackground,
            fontSize: 16,
        },
        inputWithIcon: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.borderColor,
            borderRadius: 8,
            backgroundColor: theme.cardBackground,
        },
        icon: {
            padding: 10,
            color: theme.color,
        },
        pickerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 15,
        },
        btnWrapper: {
            marginTop: 10,
        },
        btn: {
            backgroundColor: theme.appThemeColor,
            borderRadius: 8,
            padding: 15,
            alignItems: 'center',
        },
        text: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
        },
    });

    const validateForm = () => {
        if (!expenseForm.title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return false;
        }
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return false;
        }
        if (!expenseForm.account) {
            Alert.alert('Error', 'Please select an account');
            return false;
        }
        if (!expenseForm.category) {
            Alert.alert('Error', 'Please select a category');
            return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        const transaction = {
            title: expenseForm.title,
            description: expenseForm.description,
            amount: parseFloat(expenseForm.amount),
            account: expenseForm.account,
            category: expenseForm.category,
            type: 'expense',
        };
        insertTransaction(transaction, counter);
        dispatch(addExpense(transaction));

        clearFormState('expense');

        if (navigation) {
            navigation.navigate('Monthly', { reload: Date.now() });
            navigation.navigate('Yearly', { reload: Date.now() });
            navigation.navigate('Charts', { reload: Date.now() }); // Add Charts navigation
            navigation.navigate('Home');
        }

        onClose?.();
    };

    return (
        <Pressable style={styles.form}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <View style={styles.inputWithIcon}>
                    <Icon name="pencil" size={20} style={styles.icon} />
                    <TextInput
                        ref={titleRef}
                        placeholder='Enter title'
                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                        placeholderTextColor={theme.color + '80'}
                        value={expenseForm.title}
                        onChangeText={(value) => setExpenseForm({ ...expenseForm, title: value })}
                        returnKeyType="next"
                        onSubmitEditing={() => descriptionRef.current?.focus()}
                        blurOnSubmit={false}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <View style={styles.inputWithIcon}>
                    <Icon name="document-text" size={20} style={styles.icon} />
                    <TextInput
                        ref={descriptionRef}
                        placeholder='Enter description'
                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                        placeholderTextColor={theme.color + '80'}
                        value={expenseForm.description}
                        onChangeText={(value) => setExpenseForm({ ...expenseForm, description: value })}
                        returnKeyType="next"
                        onSubmitEditing={() => amountRef.current?.focus()}
                        blurOnSubmit={false}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.inputWithIcon}>
                    <Icon name="cash" size={20} style={styles.icon} />
                    <TextInput
                        ref={amountRef}
                        placeholder='Enter amount'
                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                        placeholderTextColor={theme.color + '80'}
                        value={expenseForm.amount.toString()}
                        keyboardType='numeric'
                        onChangeText={(value) => setExpenseForm({ ...expenseForm, amount: value })}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                            setShowAccountPicker(true);
                        }}
                        blurOnSubmit={false}
                    />
                </View>
            </View>

            <View style={styles.pickerContainer}>
                <View>
                    <Text style={styles.label}>Account</Text>
                    <CustomPicker
                        value={expenseForm.account}
                        options={customAccounts}
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, account: value })}
                        placeholder="Account"
                        visible={showAccountPicker}
                        setVisible={setShowAccountPicker}
                    />
                </View>
                <View>
                    <Text style={[styles.label, {textAlign: 'right'}]}>Category</Text>
                    <CustomPicker
                        value={expenseForm.category}
                        options={customCategories}
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                        placeholder="Category"
                        visible={showCategoryPicker}
                        setVisible={setShowCategoryPicker}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Sent To</Text>
                <View style={styles.inputWithIcon}>
                    <Icon name="send" size={20} style={styles.icon} />
                    <TextInput
                        ref={sentToRef}
                        placeholder='Enter recipient'
                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                        placeholderTextColor={theme.color + '80'}
                        value={expenseForm.sentTo}
                        onChangeText={(value) => setExpenseForm({ ...expenseForm, sentTo: value })}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />
                </View>
            </View>

            <View style={styles.btnWrapper}>
                <Pressable
                    style={({ pressed }) => [
                        styles.btn,
                        { opacity: pressed ? 0.8 : 1 }
                    ]}
                    onPress={handleSubmit}
                >
                    <Text style={styles.text}>Save Expense</Text>
                </Pressable>
            </View>
        </Pressable>
    );
}

export default ExpenseForm;