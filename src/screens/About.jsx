import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../hooks/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
const packageJson = require('../../package.json');


const About = ({ navigation }) => {
    const { theme } = useTheme();

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.backgroundColor,
            padding: 16,
            marginBottom: 100,
            minHeight: '100%',
            width: '100%',
            position: 'relative',
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
        section: {
            backgroundColor: theme.cardBackground,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
        },
        title: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.color,
            marginBottom: 8,
        },
        text: {
            color: theme.color,
            fontSize: 16,
            lineHeight: 24,
        },
        version: {
            color: theme.color,
            opacity: 0.7,
            textAlign: 'center',
        },
        link: {
            color: theme.appThemeColor,
            textDecorationLine: 'underline',
            marginVertical: 4,
        },
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
                    <Text style={styles.headerTitle}>About</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.title}>Description</Text>
                    <Text style={styles.text}>
                        ArthaLekha is a comprehensive expense tracking application designed
                        to help you manage your personal finances effectively. Built with React Native,
                        it offers a robust set of features for personal finance management.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.title}>Key Features</Text>
                    <Text style={styles.text}>
                        • Complete transaction management{'\n'}
                        • Multiple account support{'\n'}
                        • Monthly and yearly analytics{'\n'}
                        • Customizable categories{'\n'}
                        • Dark/Light theme support{'\n'}
                        • Data backup and export{'\n'}
                        • Advanced search and filters{'\n'}
                        • Interactive charts and reports{'\n'}
                        • Offline functionality
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.title}>Support</Text>
                    <Text style={styles.text}>
                        For issues and feature requests, please visit our repository and create an issue.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.title}>Developer</Text>
                    <Text style={styles.text}>
                        Devesh Mehta{'\n'}
                        Full Stack Developer{'\n\n'}
                        Experienced in developing mobile and web applications using modern technologies.
                        Specialized in React Native and MERN stack development.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.title}>Connect</Text>
                    <Text style={[styles.text, styles.link]}
                        onPress={() => Linking.openURL('https://github.com/devesh1217')}>
                        GitHub Profile
                    </Text>
                    <Text style={[styles.text, styles.link]}
                        onPress={() => Linking.openURL('https://www.linkedin.com/in/devesh1217/')}>
                        LinkedIn Profile
                    </Text>
                    <Text style={[styles.text, styles.link]}
                        onPress={() => Linking.openURL('https://devesh-mehta.vercel.app/?utm_source=arthalekha')}>
                        Portfolio
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.version}>Version v{packageJson.version}</Text>
                    <Text style={styles.version}>
                        ©2025 All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default About;
