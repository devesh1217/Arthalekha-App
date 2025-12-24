import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import CustomPicker from '../components/common/CustomPicker';
import CustomMultiSelect from '../components/common/CustomMultiSelect';
import { getAccounts, fetchTransactionsByFilters, getCategories } from '../utils/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { exportAsCSV, generatePDFPreview, savePDFToDownloads, generateExcelPreview, saveExcelToDownloads } from '../utils/exportUtils';
import Pdf from 'react-native-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { CheckBox } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';

const Export = ({ navigation }) => {
    const { theme } = useTheme();
    const [filters, setFilters] = useState({
        type: 'all',
        startDate: null,
        endDate: null,
    });
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState({ income: [], expense: [] });
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [pdfPreview, setPdfPreview] = useState(null);
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [tempFilePath, setTempFilePath] = useState(null);
    const [dateRangeType, setDateRangeType] = useState('monthly'); // 'monthly', 'yearly', 'custom'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from(
        { length: 5 },
        (_, i) => new Date().getFullYear() - i
    );

    const monthOptions = months.map(month => ({
        label: month,
        value: months.indexOf(month),
        icon: 'calendar'
    }));

    const yearOptions = years.map(year => ({
        label: year.toString(),
        value: year,
        icon: 'calendar'
    }));

    useEffect(() => {
        loadAccountsAndCategories();
    }, []);

    useEffect(() => {
        return () => {
            if (tempFilePath) {
                RNFS.unlink(tempFilePath).catch(console.error);
            }
        };
    }, [tempFilePath]);

    useEffect(() => {
        // Update filters when date range type changes
        switch (dateRangeType) {
            case 'monthly':
                const monthDate = new Date(selectedYear, selectedMonth);
                const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
                setFilters(prev => ({
                    ...prev,
                    startDate: monthDate,
                    endDate: lastDay
                }));
                break;
            case 'yearly':
                const yearStart = new Date(selectedYear, 0, 1);
                const yearEnd = new Date(selectedYear, 11, 31);
                setFilters(prev => ({
                    ...prev,
                    startDate: yearStart,
                    endDate: yearEnd
                }));
                break;
            case 'custom':
                // Keep existing custom date range
                break;
        }
    }, [dateRangeType, selectedMonth, selectedYear]);

    const loadAccountsAndCategories = async () => {
        try {
            const [fetchedAccounts, fetchedCategories] = await Promise.all([
                getAccounts(),
                getCategories()
            ]);
            setAccounts(fetchedAccounts.map(acc => ({
                label: acc.name,
                value: acc.name,
                icon: acc.icon || 'wallet-outline'
            })));
            setCategories(fetchedCategories);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleAccountPress = () => {
        setShowAccountPicker(true);
    };

    const handleCategoryPress = () => {
        setShowCategoryPicker(true);
    };

    const handleExport = async (format) => {
        try {
            // Update to include selected accounts and categories in filters
            const filterParams = {
                ...filters,
                accounts: selectedAccounts,
                categories: selectedCategories,
            };

            const transactions = await fetchTransactionsByFilters('', filterParams);

            if (transactions.length === 0) {
                Alert.alert('No Data', 'No transactions found for the selected filters.');
                return;
            }

            setPreviewData(transactions);

            if (format === 'pdf') {
                const previewPath = await generatePDFPreview(transactions);
                setTempFilePath(previewPath);
                setPdfPreview(previewPath);
                setShowPdfPreview(true);
            } else {
                const previewPath = await generateExcelPreview(transactions);
                setTempFilePath(previewPath);
                setShowExcelPreview(true);
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Error', 'Failed to generate preview.');
        }
    };

    const handleSave = async (format) => {
        try {
            if (!tempFilePath) return;

            const savedPath = format === 'pdf' 
                ? await savePDFToDownloads(tempFilePath)
                : await saveExcelToDownloads(tempFilePath);

            Alert.alert('Success', 'File saved to Downloads/ArthaLekha');
            setTempFilePath(null);
            format === 'pdf' ? setShowPdfPreview(false) : setShowExcelPreview(false);
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save file.');
        }
    };

    const handleShare = async (format) => {
        try {
            if (!tempFilePath) return;
            
            await Share.open({
                url: `file://${tempFilePath}`,
                type: format === 'pdf' ? 'application/pdf' : 'text/csv',
                filename: `transactions_${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleModalClose = async () => {
        if (tempFilePath) {
            try {
                await RNFS.unlink(tempFilePath);
                setTempFilePath(null);
            } catch (error) {
                console.error('Error cleaning up temp file:', error);
            }
        }
        setShowPdfPreview(false);
        setShowExcelPreview(false);
    };

    const handleClearFilters = () => {
        setFilters({
            type: 'all',
            startDate: null,
            endDate: null,
        });
        setSelectedAccounts([]);
        setSelectedCategories([]);
        setDateRangeType('monthly');
        setSelectedMonth(new Date().getMonth());
        setSelectedYear(new Date().getFullYear());
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundColor,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.color,
            marginLeft: 16,
        },
        content: {
            padding: 16,
            flex: 1,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            color: theme.color,
            marginBottom: 12,
        },
        filterRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            gap: 8,
        },
        typeButton: {
            flex: 1,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: theme.cardBackground,
        },
        activeType: {
            backgroundColor: theme.appThemeColor,
        },
        buttonText: {
            color: theme.color,
            fontSize: 16,
        },
        exportButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 8,
        },
        bottomButtons: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            padding: 16,
            backgroundColor: theme.backgroundColor,
            borderTopWidth: 1,
            borderTopColor: theme.borderColor,
            gap: 8,
        },
        dateText: {
            color: theme.color,
            fontSize: 16,
        },
        previewModal: {
            flex: 1,
            backgroundColor: theme.backgroundColor,
        },
        previewHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            backgroundColor: theme.cardBackground,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
            elevation: 3,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        closeButton: {
            padding: 8,
            borderRadius: 20,
            backgroundColor: theme.backgroundColor,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.color,
            marginLeft: 16,
        },
        modalActions: {
            flexDirection: 'row',
            gap: 16,
        },
        actionButton: {
            padding: 8,
        },
        modalHeaderIcon: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 20,
            backgroundColor: theme.cardBackground,
        },
        tableScrollView: {
            flex: 1,
        },
        tableContentContainer: {
            paddingHorizontal: 16,
        },
        tableWrapper: {
            flexDirection: 'row',
        },
        tableColumn: {
            width: 150,
            paddingHorizontal: 8,
        },
        headerColumn: {
            width: 150,
            backgroundColor: theme.cardBackground,
            paddingHorizontal: 8,
            paddingVertical: 12,
        },
        modalButtons: {
            flexDirection: 'row',
            gap: 8,
        },
        pickerDropdown: {
            backgroundColor: theme.cardBackground,
            borderRadius: 12,
            width: '100%',
            maxHeight: '80%',
            elevation: 5,
        },
        checkboxContainer: {
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: theme.appThemeColor,
            marginRight: 12,
            justifyContent: 'center',
            alignItems: 'center',
        },
        checkboxChecked: {
            backgroundColor: theme.appThemeColor,
        },
        checkboxText: {
            color: theme.color,
            fontSize: 16,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        selectedFilters: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
        },
        filterChip: {
            backgroundColor: theme.appThemeColor + '20',
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
        },
        chipText: {
            color: theme.color,
            marginRight: 4,
        },
        clearButton: {
            backgroundColor: theme.cardBackground,
            padding: 8,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.borderColor,
        },
        clearButtonText: {
            color: '#F44336',
            fontSize: 16,
            marginLeft: 8,
        },
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={theme.color} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Export Transactions</Text>
            </View>

            <ScrollView 
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={handleClearFilters}
                >
                    <Icon name="refresh-outline" size={20} color="#F44336" />
                    <Text style={styles.clearButtonText}>Clear Filters</Text>
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction Type</Text>
                    <View style={styles.filterRow}>
                        {['all', 'income', 'expense'].map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    filters.type === type && styles.activeType
                                ]}
                                onPress={() => setFilters({ ...filters, type })}
                            >
                                <Text style={styles.buttonText}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Date Range</Text>
                    <View style={styles.filterRow}>
                        {['monthly', 'yearly', 'custom'].map(type => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    dateRangeType === type && styles.activeType
                                ]}
                                onPress={() => setDateRangeType(type)}
                            >
                                <Text style={styles.buttonText}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {dateRangeType === 'monthly' && (
                        <View style={styles.filterRow}>
                            <View style={{ flex: 2, marginRight: 8 }}>
                                <CustomPicker
                                    value={selectedMonth}
                                    options={monthOptions}
                                    onValueChange={setSelectedMonth}
                                    placeholder="Select Month"
                                    visible={showMonthPicker}
                                    setVisible={setShowMonthPicker}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <CustomPicker
                                    value={selectedYear}
                                    options={yearOptions}
                                    onValueChange={setSelectedYear}
                                    placeholder="Select Year"
                                    visible={showYearPicker}
                                    setVisible={setShowYearPicker}
                                />
                            </View>
                        </View>
                    )}

                    {dateRangeType === 'yearly' && (
                        <View style={styles.filterRow}>
                            <CustomPicker
                                value={selectedYear}
                                options={yearOptions}
                                onValueChange={setSelectedYear}
                                placeholder="Select Year"
                                visible={showYearPicker}
                                setVisible={setShowYearPicker}
                            />
                        </View>
                    )}

                    {dateRangeType === 'custom' && (
                        <View style={styles.filterRow}>
                            <TouchableOpacity 
                                style={styles.typeButton}
                                onPress={() => setShowStartDate(true)}
                            >
                                <Text style={styles.dateText}>
                                    {filters.startDate ? filters.startDate.toLocaleDateString() : 'Start Date'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.typeButton}
                                onPress={() => setShowEndDate(true)}
                            >
                                <Text style={styles.dateText}>
                                    {filters.endDate ? filters.endDate.toLocaleDateString() : 'End Date'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Accounts</Text>
                    <CustomMultiSelect
                        title="Accounts"
                        items={accounts}
                        selectedItems={selectedAccounts}
                        onItemToggle={(accountName) => {
                            setSelectedAccounts(prev => 
                                prev.includes(accountName)
                                    ? prev.filter(a => a !== accountName)
                                    : [...prev, accountName]
                            );
                        }}
                        visible={showAccountPicker}
                        setVisible={setShowAccountPicker}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <CustomMultiSelect
                        title="Categories"
                        items={[...categories.income, ...categories.expense]}
                        selectedItems={selectedCategories}
                        onItemToggle={(categoryName) => {
                            setSelectedCategories(prev => 
                                prev.includes(categoryName)
                                    ? prev.filter(c => c !== categoryName)
                                    : [...prev, categoryName]
                            );
                        }}
                        visible={showCategoryPicker}
                        setVisible={setShowCategoryPicker}
                    />
                </View>
            </ScrollView>

            <View style={styles.bottomButtons}>
                <TouchableOpacity 
                    style={[styles.exportButton, { backgroundColor: theme.appThemeColor }]}
                    onPress={() => handleExport('pdf')}
                >
                    <Icon name="document-text" size={24} color="white" style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Export as PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.exportButton, { backgroundColor: '#217346' }]}
                    onPress={() => handleExport('excel')}
                >
                    <Icon name="document" size={24} color="white" style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, { color: 'white' }]}>Export as Excel</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showPdfPreview}
                animationType="slide"
                onRequestClose={handleModalClose}
            >
                <View style={styles.previewModal}>
                    <View style={styles.previewHeader}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={handleModalClose}
                            >
                                <Icon name="close" size={24} color={theme.color} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>PDF Preview</Text>
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.modalHeaderIcon}
                                onPress={() => handleShare('pdf')}
                            >
                                <Icon name="share-outline" size={24} color={theme.color} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.modalHeaderIcon}
                                onPress={() => handleSave('pdf')}
                            >
                                <Icon name="save-outline" size={24} color={theme.color} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {pdfPreview && (
                        <Pdf
                            source={{ uri: `file://${pdfPreview}` }}
                            style={{ flex: 1, width: '100%' }}
                            onLoadComplete={(numberOfPages, filePath) => {
                            }}
                            onError={(error) => {
                                console.error('PDF Error:', error);
                            }}
                        />
                    )}
                </View>
            </Modal>

            <Modal
                visible={showExcelPreview}
                animationType="slide"
                onRequestClose={handleModalClose}
            >
                <View style={styles.previewModal}>
                    <View style={styles.previewHeader}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={handleModalClose}
                            >
                                <Icon name="close" size={24} color={theme.color} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Excel Preview</Text>
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.modalHeaderIcon}
                                onPress={() => handleShare('excel')}
                            >
                                <Icon name="share-outline" size={24} color={theme.color} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.modalHeaderIcon}
                                onPress={() => handleSave('excel')}
                            >
                                <Icon name="save-outline" size={24} color={theme.color} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView 
                        style={styles.tableScrollView}
                        contentContainerStyle={styles.tableContentContainer}
                        horizontal={true}
                    >
                        <View>
                            <View style={styles.tableWrapper}>
                                <View style={styles.headerColumn}>
                                    <Text style={styles.headerCell}>Date</Text>
                                </View>
                                <View style={styles.headerColumn}>
                                    <Text style={styles.headerCell}>Title</Text>
                                </View>
                                <View style={styles.headerColumn}>
                                    <Text style={styles.headerCell}>Amount</Text>
                                </View>
                                <View style={styles.headerColumn}>
                                    <Text style={styles.headerCell}>Type</Text>
                                </View>
                            </View>
                            <ScrollView style={{ flex: 1 }}>
                                {previewData.map((item, index) => (
                                    <View key={index} style={styles.tableWrapper}>
                                        <View style={styles.tableColumn}>
                                            <Text style={styles.tableCell}>{item.date}</Text>
                                        </View>
                                        <View style={styles.tableColumn}>
                                            <Text style={styles.tableCell}>{item.title}</Text>
                                        </View>
                                        <View style={styles.tableColumn}>
                                            <Text style={styles.tableCell}>₹{item.amount}</Text>
                                        </View>
                                        <View style={styles.tableColumn}>
                                            <Text style={styles.tableCell}>{item.type}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {showStartDate && (
                <DateTimePicker
                    value={filters.startDate || new Date()}
                    mode="date"
                    onChange={(event, date) => {
                        setShowStartDate(false);
                        if (date) setFilters({...filters, startDate: date});
                    }}
                />
            )}

            {showEndDate && (
                <DateTimePicker
                    value={filters.endDate || new Date()}
                    mode="date"
                    onChange={(event, date) => {
                        setShowEndDate(false);
                        if (date) setFilters({...filters, endDate: date});
                    }}
                />
            )}
        </SafeAreaView>
    );
};

export default Export;
