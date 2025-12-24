import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Alert, ScrollView } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { getCategories, updateCategory, addCategory, deleteCategory } from '../utils/database';
import { accountIcons } from '../constants/iconOptions';
import { SafeAreaView } from 'react-native-safe-area-context';

const CategoriesScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const [categories, setCategories] = useState({ income: [], expense: [] });
    const [categoryType, setCategoryType] = useState('income');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'add-circle-outline', type: 'income' });
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [currentEditingForm, setCurrentEditingForm] = useState(null);

    const loadData = async () => {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
    };
    useEffect(() => {
        loadData();
    }, []);

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
        setCategoryForm({ ...categoryForm, icon });
        setShowIconPicker(false);
    };

    const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: theme.backgroundColor },
        sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.color, marginBottom: 12 },
        addButton: { backgroundColor: theme.appThemeColor, padding: 8, borderRadius: 8, alignItems: 'center' },
        buttonText: { color: '#fff' },
        item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
        itemText: { color: theme.color, fontSize: 16 },
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
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}>
                <TouchableOpacity style={{ padding: 8, marginRight: 16 }} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={theme.color} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.color }}>Categories</Text>
            </View>
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
            <ScrollView>
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
            </ScrollView>
            <Modal
                visible={showCategoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
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
                            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleSaveCategory}>
                                <Text style={styles.buttonText}>{editingCategory ? 'Update' : 'Save'}</Text>
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
                                        categoryForm.icon === item ? styles.selectedIcon : null,
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

export default CategoriesScreen;
