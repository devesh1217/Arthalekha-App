import { View, StyleSheet, TouchableOpacity, Text, PanResponder, Animated, Dimensions } from 'react-native';
import React, { useState, useRef } from 'react';
import IncomeForm from './IncomeForm';
import ExpenseForm from './ExpenseForm';
import { useTheme } from '../../../hooks/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';

const FormContainer = ({ onClose }) => {
    const [activeForm, setActiveForm] = useState('income');
    const { theme } = useTheme();
    const slideAnim = useRef(new Animated.Value(0)).current;
    const windowWidth = Dimensions.get('window').width;  // Get window width
    const navigation = useNavigation();

    const panResponder = PanResponder.create({
        // Return false here so child components (buttons, pickers) can receive the initial touch
        onStartShouldSetPanResponder: () => false,

        // Only claim the gesture if the user moves their finger horizontally

        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dx, dy } = gestureState;
            console.log(gestureState,Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10)
            // Check if movement is horizontal AND significant (greater than 10 pixels)
            // The > 10 threshold prevents accidental swipes when trying to tap
            return Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 10;
        },

        onPanResponderRelease: (_, gestureState) => {
            // Your existing logic remains the same
            console.log(gestureState)
            if (gestureState.dx > 50 && activeForm === 'expense') {
                console.log('in')
                toggleForm('income');
            } else if (gestureState.dx < -50 && activeForm === 'income') {
                console.log('ex')
                toggleForm('expense');
            }
        },
    });

    const toggleForm = (formType) => {
        setActiveForm(formType);
        Animated.spring(slideAnim, {
            toValue: formType === 'income' ? 0 : 1,
            useNativeDriver: true,
        }).start();
    };

    const styles = StyleSheet.create({
        container: {
            width: '100%',
        },
        tabContainer: {
            flexDirection: 'row',
            marginBottom: 10,
            paddingHorizontal: 15,
        },
        tab: {
            flex: 1,
            padding: 10,
            alignItems: 'center',
        },
        activeTab: {
            borderBottomWidth: 2,
            borderBottomColor: theme.appThemeColor,
        },
        tabText: {
            color: theme.color,
            fontSize: 16,
        },
        formContainer: {
            flex: 1,
            width: '200%', // Double width to hold both forms
            flexDirection: 'row',
        },
        formWrapper: {
            width: '50%', // Each form takes half of the container
        },
    });

    return (
        <ScrollView style={styles.container}>
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeForm === 'income' && styles.activeTab]} 
                    onPress={() => toggleForm('income')}
                >
                    <Text style={styles.tabText}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeForm === 'expense' && styles.activeTab]} 
                    onPress={() => toggleForm('expense')}
                >
                    <Text style={styles.tabText}>Income</Text>
                </TouchableOpacity>
            </View>
            
            <Animated.View 
                {...panResponder.panHandlers}
                style={[
                    styles.formContainer,
                    {
                        transform: [{
                            translateX: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -windowWidth]  // Use windowWidth
                            })
                        }]
                    }
                ]}
            >
                <View style={styles.formWrapper}>
                    <ExpenseForm onClose={onClose} navigation={navigation} />
                </View>
                <View style={styles.formWrapper}>
                    <IncomeForm onClose={onClose} navigation={navigation} />
                </View>
            </Animated.View>
        </ScrollView>
    );
};

export default FormContainer;