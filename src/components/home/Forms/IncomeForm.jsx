import { View, Text, TextInput, Button, Pressable, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native';
import { insertTransaction } from '../../../../src/utils/database';
import { useTheme } from '../../../hooks/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { addIncome } from '../../../../src/redux/slices/transactionSlice';
import CustomPicker from '../../common/CustomPicker';
import { getAccounts, getCategories, getMostFrequentCategory } from '../../../../src/utils/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import { saveFormState, loadFormState, clearFormState } from '../../../utils/formStorage';
import Icon from 'react-native-vector-icons/Ionicons';

const IncomeForm = ({ onClose, navigation }) => {
    const { theme } = useTheme();
    const route = useRoute();

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

    const [incomeForm, setIncomeForm] = useState({
        title: '',
        description: '',
        amount: 0,
        account: 'Cash',
        category: '',
        type: '',
    });

    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [customAccounts, setCustomAccounts] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);

    // Add refs for input fields
    const titleRef = React.useRef();
    const descriptionRef = React.useRef();
    const amountRef = React.useRef();

    useEffect(() => {
        loadCustomOptions();
        loadSavedForm();
    }, []);

    const loadCustomOptions = async () => {
        try {
            const [accounts, categories, mostFreqCategory] = await Promise.all([
                getAccounts(),
                getCategories(),
                getMostFrequentCategory('income')
            ]);
            
            setCustomAccounts(accounts.map(acc => ({
                label: acc.name,
                value: acc.name,
                icon: acc.icon || 'wallet-outline'
            })));
            
            setCustomCategories(categories.income.map(cat => ({
                label: cat.name,
                value: cat.name,
                icon: cat.icon || 'add-circle-outline'
            })));
            
            setIncomeForm(prev => ({
                ...prev,
                account: accounts.find(acc => acc.isDefault === 1)?.name || 'Cash',
                category: mostFreqCategory
            }));
        } catch (error) {
            console.error('Error loading options:', error);
        }
    };

    const loadSavedForm = async () => {
        const savedForm = await loadFormState('income');
        if (savedForm) {
            setIncomeForm(savedForm);
        }
    };

    // Add effect to save form changes
    useEffect(() => {
        saveFormState('income', incomeForm);
    }, [incomeForm]);

    const counter = useSelector((state) => state.date.value);
    const dispatch = useDispatch();

    const validateForm = () => {
        if (!incomeForm.title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return false;
        }
        if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return false;
        }
        if (!incomeForm.account) {
            Alert.alert('Error', 'Please select an account');
            return false;
        }
        if (!incomeForm.category) {
            Alert.alert('Error', 'Please select a category');
            return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        const transaction = {
            title: incomeForm.title,
            description: incomeForm.description,
            amount: parseFloat(incomeForm.amount),
            account: incomeForm.account,
            category: incomeForm.category,
            type: 'income',
        };
        insertTransaction(transaction, counter);
        dispatch(addIncome(transaction)); // Update Redux store
        
        // Clear saved form after successful submission
        clearFormState('income');
        
        // Force reload of Monthly and Yearly screens
        if (navigation) {
            navigation.navigate('Monthly', { reload: Date.now() });
            navigation.navigate('Yearly', { reload: Date.now() });
            navigation.navigate('Charts', { reload: Date.now() }); // Add Charts navigation
            navigation.navigate('Home');
        }
        
        alert('Income saved!');
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
                        value={incomeForm.title}
                        onChangeText={(value) => setIncomeForm({ ...incomeForm, title: value })}
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
                        value={incomeForm.description}
                        onChangeText={(value) => setIncomeForm({ ...incomeForm, description: value })}
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
                        value={incomeForm.amount.toString()}
                        keyboardType='numeric'
                        onChangeText={(value) => setIncomeForm({ ...incomeForm, amount: value })}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                            setShowAccountPicker(true);
                        }}
                        blurOnSubmit={false}
                    />
                </View>
            </View>

            <View style={styles.pickerContainer}>
                <CustomPicker
                    value={incomeForm.account}
                    options={customAccounts}
                    onValueChange={(value) => setIncomeForm({ ...incomeForm, account: value })}
                    placeholder="Account"
                    visible={showAccountPicker}
                    setVisible={setShowAccountPicker}
                />
                <CustomPicker
                    value={incomeForm.category}
                    options={customCategories}
                    onValueChange={(value) => setIncomeForm({ ...incomeForm, category: value })}
                    placeholder="Category"
                    visible={showCategoryPicker}
                    setVisible={setShowCategoryPicker}
                />
            </View>

            <View style={styles.btnWrapper}>
                <Pressable 
                    style={({ pressed }) => [
                        styles.btn,
                        { opacity: pressed ? 0.8 : 1 }
                    ]}
                    onPress={handleSubmit}
                >
                    <Text style={styles.text}>Save Income</Text>
                </Pressable>
            </View>
        </Pressable>
    )
}

export default IncomeForm