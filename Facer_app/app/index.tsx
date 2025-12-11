import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrCode, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

/* Brand palette */
const BRAND = {
  maroon: '#7A1431', // main brand
  maroonDark: '#5C0F26', // deeper shadow
  gold: '#F2C14E', // accent/tag
  surface: '#FBF7F7', // soft white card
  text: '#3B3B3B',
  muted: '#7A6A6A',
};

export default function WelcomeScreen() {
  const { session, student, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const emblemAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(emblemAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [emblemAnim, buttonsAnim]);

  // Handle redirect if already authenticated
  useEffect(() => {
    if (!authLoading && session) {
      if (student) {
        if (!student.face_encoding) {
          router.replace('/face-capture');
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [session, student, authLoading]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  // Don't render welcome if already authenticated (redirect will happen)
  if (session) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={BRAND.maroon} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={[BRAND.surface, '#F8EEF0', '#F2E6E8', BRAND.maroon]}
        className="flex-1"
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 28,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="flex-1 items-center justify-between"
          >
          {/* Dominant Hero Logo */}
          <Animated.View
            className="items-center mt-2 mb-4"
            style={{
              opacity: emblemAnim,
              transform: [
                {
                  translateY: emblemAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
                {
                  scale: emblemAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            }}
            pointerEvents="box-none"
          >
            <View
              className="w-[170px] h-[170px] rounded-[28px] items-center justify-center"
              style={{
                backgroundColor: BRAND.surface,
                shadowColor: BRAND.maroonDark,
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
                elevation: 18,
                borderWidth: 1,
                borderColor: 'rgba(242,193,78,0.14)',
              }}
            >
              <Image
                source={require('../assets/images/sathyabama-logo.png')}
                className="w-[132px] h-[132px]"
                resizeMode="contain"
              />
            </View>
            <View
              className="mt-3 py-2 px-4 rounded-[18px]"
              style={{
                backgroundColor: BRAND.gold,
                shadowColor: BRAND.gold,
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text
                className="text-[13px] font-bold tracking-[0.5px]"
                style={{ color: BRAND.maroonDark }}
              >
                ATTENDANCE TRACKER
              </Text>
            </View>
          </Animated.View>

          {/* Title */}
          <View className="items-center mt-6" pointerEvents="box-none">
            <Text
              className="text-[34px] font-black tracking-[3px]"
              style={{ color: BRAND.maroonDark }}
            >
              SATHYABAMA
            </Text>
            <Text
              className="text-xs mt-2 font-semibold"
              style={{ color: BRAND.text }}
            >
              Attendance Management System
            </Text>
            <Text
              className="mt-2 italic font-semibold text-[15px]"
              style={{ color: BRAND.maroon }}
            >
              Scan. Mark. Track.
            </Text>
          </View>

          {/* Feature pills */}
          <Animated.View
            className="w-full items-center mt-8"
            style={{
              opacity: buttonsAnim,
              transform: [
                {
                  translateY: buttonsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.92}
              className="w-[86%] max-w-[520px] flex-row items-center py-3 px-[18px] rounded-full my-2.5"
              style={{
                backgroundColor: BRAND.surface,
                borderWidth: 1,
                borderColor: 'rgba(92,15,38,0.06)',
                shadowColor: '#000',
                shadowOpacity: 0.02,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3.5"
                style={{ backgroundColor: 'rgba(122,20,49,0.06)' }}
              >
                <QrCode size={18} color={BRAND.maroon} />
              </View>
              <Text
                className="text-[15px] font-semibold"
                style={{ color: BRAND.text }}
              >
                Quick QR Scanning
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              className="w-[86%] max-w-[520px] flex-row items-center py-3 px-[18px] rounded-full my-2.5"
              style={{
                backgroundColor: BRAND.surface,
                borderWidth: 1,
                borderColor: 'rgba(92,15,38,0.06)',
                shadowColor: '#000',
                shadowOpacity: 0.02,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3.5"
                style={{ backgroundColor: 'rgba(122,20,49,0.06)' }}
              >
                <Calendar size={18} color={BRAND.maroon} />
              </View>
              <Text
                className="text-[15px] font-semibold"
                style={{ color: BRAND.text }}
              >
                Real-time Tracking
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Buttons */}
          <Animated.View
            className="w-full items-center mt-8"
            style={{
              opacity: buttonsAnim,
              transform: [
                {
                  translateY: buttonsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            }}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.92}
              className="w-full rounded-[14px] mb-3"
              style={{
                zIndex: 30,
                elevation: 10,
                shadowColor: BRAND.maroon,
                shadowOpacity: 0.18,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                overflow: 'hidden',
                maxWidth: Math.min(width * 0.9, 400),
              }}
              accessibilityRole="button"
              accessible
            >
              <LinearGradient
                colors={[BRAND.maroon, BRAND.maroonDark]}
                className="py-3.5 items-center justify-center"
              >
                <Text
                  className="text-base font-extrabold tracking-[0.8px]"
                  style={{ color: BRAND.surface }}
                >
                  Login
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/signup')}
              activeOpacity={0.92}
              className="w-full rounded-[14px] py-3 items-center justify-center mb-2"
              style={{
                zIndex: 30,
                backgroundColor: BRAND.surface,
                borderWidth: 1.2,
                borderColor: 'rgba(92,15,38,0.12)',
                maxWidth: Math.min(width * 0.9, 400),
              }}
              accessibilityRole="button"
              accessible
            >
              <Text
                className="text-base font-bold"
                style={{ color: BRAND.maroon }}
              >
                Sign Up
              </Text>
            </TouchableOpacity>

            <Text
              className="mt-1.5 text-xs italic opacity-95"
              style={{ color: BRAND.muted }}
            >
              Never Miss Attendance Again
            </Text>
          </Animated.View>
          </View>
        </ScrollView>

        {/* Soft bottom vignette for depth */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.06)']}
          className="absolute left-0 right-0 bottom-0"
          style={{ height: height * 0.16 }}
          pointerEvents="none"
        />
      </LinearGradient>
    </>
  );
}
