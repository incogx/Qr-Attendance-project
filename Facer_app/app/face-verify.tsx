import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react-native';

export default function FaceVerifyScreen() {
  const { student } = useAuth();
  const insets = useSafeAreaInsets();
  const { qrData } = useLocalSearchParams<{ qrData: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const MAX_ATTEMPTS = 3;

  if (!permission) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#771C32" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <StatusBar style="dark" />
        <Text className="text-gray-900 text-xl font-semibold mb-4 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-600 text-center mb-8">
          We need camera access for face verification
        </Text>
        <TouchableOpacity
          className="rounded-lg py-4 px-8"
          style={{ backgroundColor: '#771C32' }}
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      setCapturedImage(photo?.uri || null);
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleVerify = async () => {
    if (!capturedImage || !student || !qrData) return;

    setVerifying(true);
    setAttempts((prev) => prev + 1);

    try {
      // Validate QR code first
      const { data: qrValidation, error: qrError } = await supabase.rpc(
        'validate_qr',
        {
          qr_data: qrData,
        }
      );

      if (qrError) throw qrError;

      if (!qrValidation.valid) {
        setErrorMessage('QR code is invalid or expired');
        setShowError(true);
        setVerifying(false);
        return;
      }

      // Mock face verification (in production, call Edge Function)
      const mockConfidence = 0.85;

      if (mockConfidence >= 0.75) {
        // Mark attendance
        const { data: attendanceResult, error: attendanceError } =
          await supabase.rpc('mark_attendance', {
            p_student_id: student.id,
            p_class_id: qrValidation.class_id,
            p_session_id: qrValidation.session_id,
            p_method: 'qr+face',
            p_confidence: mockConfidence,
          });

        if (attendanceError) throw attendanceError;

        if (attendanceResult.status === 'ok') {
          setShowSuccess(true);
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 2000);
        } else {
          setErrorMessage(attendanceResult.message);
          setShowError(true);
        }
      } else {
        if (attempts >= MAX_ATTEMPTS - 1) {
          setErrorMessage(
            'Face verification failed. Please contact your instructor.'
          );
          setShowError(true);
        } else {
          setErrorMessage(
            `Face verification failed. ${
              MAX_ATTEMPTS - attempts - 1
            } attempts remaining.`
          );
          setShowError(true);
          setCapturedImage(null);
        }
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setErrorMessage(error.message || 'Verification failed');
      setShowError(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setShowError(false);
    setErrorMessage('');
  };

  return (
    <>
      <StatusBar style="light" />
      <View className="flex-1 bg-black">
        {capturedImage ? (
          // Preview captured image
          <View className="flex-1">
            <Image
              source={{ uri: capturedImage }}
              className="flex-1"
              resizeMode="cover"
            />

            {/* Header */}
            <View 
              className="absolute top-0 left-0 right-0 pb-6 px-6 bg-black/50"
              style={{ paddingTop: insets.top + 16 }}
            >
              <Text className="text-white text-lg font-semibold text-center">
                Verify Your Face
              </Text>
            </View>

            {/* Actions */}
            <View className="absolute bottom-0 left-0 right-0 pb-10 px-6 bg-black/70">
              <TouchableOpacity
                className="rounded-xl py-4 items-center mb-3"
                style={{ backgroundColor: '#771C32' }}
                onPress={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Verify & Mark Attendance
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl py-4 items-center bg-white/10"
                onPress={handleRetry}
                disabled={verifying}
              >
                <Text className="text-white font-semibold text-base">
                  Retake Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Camera view
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
            {/* Header */}
            <View 
              className="absolute top-0 left-0 right-0 pb-6 px-6 bg-black/50"
              style={{ paddingTop: insets.top + 16 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-semibold">
                  Face Verification
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="p-2"
                  accessibilityLabel="Close"
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Face frame */}
            <View className="flex-1 justify-center items-center">
              <View
                className="w-72 h-96 border-4 rounded-3xl"
                style={{ borderColor: '#771C32' }}
              />
            </View>

            {/* Instructions */}
            <View className="absolute bottom-0 left-0 right-0 pb-10 px-6 bg-black/50">
              <View className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-lg">
                <Text className="text-white text-center font-medium mb-2">
                  Center your face in the frame
                </Text>
                <Text className="text-white/80 text-center text-sm">
                  Ensure good lighting • Remove glasses
                </Text>
                <Text className="text-white/80 text-center text-sm">
                  Attempts: {attempts}/{MAX_ATTEMPTS}
                </Text>
              </View>

              <TouchableOpacity
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#771C32' }}
                onPress={handleCapture}
              >
                <Camera size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </CameraView>
        )}

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/70 px-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm items-center">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: '#771C32' }}
              >
                <CheckCircle size={32} color="#FFFFFF" />
              </View>
              <Text className="text-gray-900 text-xl font-bold mb-2">
                Attendance Marked!
              </Text>
              <Text className="text-gray-600 text-center">
                Your attendance has been successfully recorded
              </Text>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        <Modal visible={showError} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/70 px-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                  <AlertCircle size={32} color="#EF4444" />
                </View>
                <Text className="text-gray-900 text-xl font-bold mb-2">
                  Verification Failed
                </Text>
                <Text className="text-gray-600 text-center">
                  {errorMessage}
                </Text>
              </View>

              <TouchableOpacity
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: '#771C32' }}
                onPress={() => {
                  setShowError(false);
                  if (attempts >= MAX_ATTEMPTS) {
                    router.replace('/(tabs)');
                  } else {
                    handleRetry();
                  }
                }}
              >
                <Text className="text-white font-semibold text-base">
                  {attempts >= MAX_ATTEMPTS ? 'Go to Dashboard' : 'Try Again'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
