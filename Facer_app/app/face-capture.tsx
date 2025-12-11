import { useState, useRef, useEffect } from 'react';
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
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react-native';

export default function FaceCaptureScreen() {
  const { student, session, loading: authLoading, refreshStudent } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/');
    }
  }, [session, authLoading]);

  // Redirect if already has face encoding
  useEffect(() => {
    if (!authLoading && session && student?.face_encoding) {
      console.log('Face already captured, redirecting to dashboard');
      router.replace('/(tabs)');
    }
  }, [session, student, authLoading]);

  // Show loading while checking auth or loading student
  if (authLoading || (session && !student)) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#771C32" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

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
          We need camera access to capture your face for verification
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
      setErrorMessage('Failed to capture photo. Please try again.');
      setShowError(true);
    }
  };

  const handleSave = async () => {
    if (!capturedImage || !student || !session?.user) {
      setErrorMessage('Missing required data. Please try again.');
      setShowError(true);
      return;
    }

    setSaving(true);
    try {
      console.log('Saving face encoding for student:', student.id);
      
      // Generate mock face encoding (in production, this would be processed by ML model)
      // For now, we'll use a base64 encoded string or a simple identifier
      const mockFaceEncoding = `face_encoding_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Update student record with face encoding
      const { error, data } = await supabase
        .from('students')
        .update({ face_encoding: mockFaceEncoding })
        .eq('id', student.id)
        .select()
        .single();

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('Face encoding saved successfully:', data);

      // Refresh student profile to get updated data
      console.log('Refreshing student profile...');
      await refreshStudent();
      console.log('Student profile refreshed');

      setShowSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving face encoding:', error);
      let errorMsg = 'Failed to save face data. Please check your connection and try again.';
      
      if (error.message) {
        errorMsg = error.message;
      } else if (error.code === 'PGRST301') {
        errorMsg = 'Permission denied. Please check your database permissions.';
      } else if (error.code === '23505') {
        errorMsg = 'Face data already exists. Please contact support.';
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setSaving(false);
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
                Review Your Photo
              </Text>
            </View>

            {/* Actions */}
            <View className="absolute bottom-0 left-0 right-0 pb-10 px-6 bg-black/70">
              <TouchableOpacity
                className="rounded-xl py-4 items-center mb-3"
                style={{ backgroundColor: '#771C32' }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Save & Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl py-4 items-center bg-white/10"
                onPress={handleRetry}
                disabled={saving}
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
                  Capture Your Face
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (student?.face_encoding) {
                      router.replace('/(tabs)');
                    } else {
                      router.replace('/');
                    }
                  }}
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
                  Ensure good lighting • Remove glasses if possible
                </Text>
                <Text className="text-white/80 text-center text-sm mt-2">
                  This will be used for attendance verification
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
                Face Captured!
              </Text>
              <Text className="text-gray-600 text-center">
                Your face data has been saved successfully
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
                  Error
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
                  handleRetry();
                }}
              >
                <Text className="text-white font-semibold text-base">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

